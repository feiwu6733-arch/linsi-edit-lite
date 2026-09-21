"""Serve the compiled Lite application locally and manage verified GitHub updates."""
import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from updater import Updates, inspect_package

ROOT = Path(__file__).resolve().parent
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def __init__(self, port, data_dir):
        self.data_dir = Path(data_dir or ROOT / ".local").resolve()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.installing_update = False
        super().__init__(("127.0.0.1", port), Handler)
        self.updates = Updates(self.data_dir, VERSION)

    def install_update(self):
        if os.name != "nt":
            raise ValueError("自动安装目前支持 Windows，请从 GitHub 下载发布包更新")
        if self.installing_update:
            raise ValueError("更新正在进行，请稍候")
        if self.updates.public()["status"] != "ready":
            raise ValueError("请先下载并校验更新包")
        directory = self.updates.directory
        pending = json.loads((directory / "pending.json").read_text(encoding="utf-8"))
        inspect_package(directory / "download.zip", pending["version"], pending["sha256"])
        worker = directory / "install-worker.py"
        shutil.copy2(ROOT / "updater.py", worker)
        lock_path = ROOT / ".linsi-edit-update.lock"
        try:
            with lock_path.open("x", encoding="utf-8") as lock:
                json.dump({"pid": os.getpid(), "port": self.server_port}, lock)
        except FileExistsError:
            raise ValueError("此目录已有更新正在进行，请稍候") from None
        try:
            with (directory / "installer.log").open("ab") as log:
                subprocess.Popen(
                    [sys.executable, str(worker), str(ROOT), str(self.data_dir), str(self.server_port), str(os.getpid())],
                    cwd=ROOT,
                    stdout=log,
                    stderr=log,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
        except Exception:
            lock_path.unlink(missing_ok=True)
            raise
        self.installing_update = True
        threading.Timer(1, self.shutdown).start()
        return {"status": "installing", "version": pending["version"], "message": "正在备份并更新，完成后页面会自动恢复"}

    def server_close(self):
        if hasattr(self, "updates"):
            self.updates.close()
        super().server_close()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def guard(self):
        if self.headers.get("Host") not in (
            f"127.0.0.1:{self.server.server_port}",
            f"localhost:{self.server.server_port}",
        ):
            self.send_error(403)
            return False
        return True

    def send_json(self, value, status=200, head=False):
        raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head:
            self.wfile.write(raw)

    def do_GET(self):
        self.respond(False)

    def do_HEAD(self):
        self.respond(True)

    def do_POST(self):
        if not self.guard():
            return
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 16384:
                raise ValueError("请求内容过大")
            body = json.loads(self.rfile.read(length) or b"{}")
            if path == "/api/updates/check":
                return self.send_json(self.server.updates.request_check(), 202)
            if path == "/api/updates/download":
                return self.send_json(self.server.updates.download(), 202)
            if path == "/api/updates/dismiss":
                return self.send_json(self.server.updates.dismiss(body.get("action")))
            if path == "/api/updates/install":
                return self.send_json(self.server.install_update(), 202)
            self.send_error(404)
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, 400)
        except Exception:
            self.send_json({"error": "本地更新服务遇到错误，请稍后重试"}, 500)

    def respond(self, head):
        if not self.guard():
            return
        name = unquote(urlparse(self.path).path)
        if name == "/api/health":
            return self.send_json({"ok": True, "product": "linsi-edit-lite", "version": VERSION, "port": self.server.server_port, "pid": os.getpid(), "updates_enabled": True}, head=head)
        if name == "/api/updates":
            return self.send_json(self.server.updates.public(), head=head)
        root = (ROOT / "dist").resolve()
        path = (root / (name.lstrip("/") or "index.html")).resolve()
        if not path.is_relative_to(root) or not path.is_file() or any(p.startswith(".") for p in path.relative_to(root).parts):
            self.send_error(404)
            return
        size = path.stat().st_size
        start, end, status = 0, size - 1, 200
        if value := self.headers.get("Range"):
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", value)
            if not match or not any(match.groups()):
                self.send_error(416)
                return
            if match[1]:
                start = int(match[1])
                end = min(int(match[2]) if match[2] else end, end)
            else:
                start = max(0, size - int(match[2]))
            if start > end or start >= size:
                self.send_error(416)
                return
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        if not head:
            try:
                with path.open("rb") as stream:
                    stream.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk = stream.read(min(65536, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass


def main():
    parser = argparse.ArgumentParser(description="灵思剪辑 Lite 本地服务")
    parser.add_argument("--port", type=int, default=5031)
    parser.add_argument("--data-dir", help="更新缓存目录，默认项目内 .local")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        raise SystemExit("请安装 Python 3.11 或更新版本")
    if not 1024 <= args.port <= 65535:
        raise SystemExit("端口需在 1024～65535 之间")
    if not (ROOT / "dist/index.html").is_file():
        raise SystemExit("缺少构建文件。请下载 Release 安装包，或运行 npm ci 和 npm run build。")
    try:
        server = Server(args.port, args.data_dir)
    except OSError:
        raise SystemExit(f"端口 {args.port} 已被占用；不会停止其他服务。") from None
    address = f"http://127.0.0.1:{server.server_port}"
    print(f"Linsi Edit Lite {VERSION}: {address}", flush=True)
    server.updates.start()
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
