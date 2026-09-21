#!/usr/bin/env python3
"""Build a verified source-and-runtime release for local installation and updates."""
import argparse
import hashlib
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOP_LEVEL = [
    "package.json", "package-lock.json", "index.html", "vite.config.js", "aacWorkerPlugin.mjs",
    "serve.py", "updater.py", "start.ps1", "启动灵思剪辑.cmd", "README.md", "RELEASE.md",
    "RELEASE_NOTES.md", "AGENTS.md", "THIRD_PARTY.md", "LICENSE", ".gitignore",
]
FOLDERS = ["src", "public", "dist", "tests", "scripts", "third-party-source", "docs"]
SECRET_PATTERNS = [
    r"github_pat_[a-zA-Z0-9_]{30,}", r"ghp_[a-zA-Z0-9]{30,}",
    r"sk-[a-zA-Z0-9_-]{35,}", r"-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----",
]


def release_files():
    files = [ROOT / name for name in TOP_LEVEL]
    for folder in FOLDERS:
        base = ROOT / folder
        if base.exists():
            files.extend(path for path in base.rglob("*") if path.is_file() and "__pycache__" not in path.parts)
    workflow = ROOT / ".github/workflows/release.yml"
    if workflow.is_file():
        files.append(workflow)
    unique = sorted({path.resolve() for path in files})
    for path in unique:
        if not path.is_relative_to(ROOT.resolve()) or path.is_symlink() or not path.is_file():
            raise ValueError(f"不允许的发行文件：{path}")
        if any(part in (".git", ".local", "node_modules", "artifacts", "release", "__pycache__") for part in path.parts):
            raise ValueError(f"发行包包含运行数据：{path}")
        if path.suffix.lower() in {".js", ".json", ".md", ".py", ".ps1", ".cmd", ".html", ".css", ".mjs", ".txt"}:
            text = path.read_text(encoding="utf-8-sig")
            if any(re.search(pattern, text) for pattern in SECRET_PATTERNS):
                raise ValueError(f"疑似凭据，禁止打包：{path.name}")
    return unique


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stable-name", action="store_true")
    args = parser.parse_args()
    if not (ROOT / "dist/index.html").is_file():
        raise SystemExit("缺少 dist/index.html，请先运行 npm run build")
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    files = release_files()
    relative = [path.relative_to(ROOT).as_posix() for path in files] + ["release-files.json"]
    release_list = json.dumps(sorted(relative), ensure_ascii=False, indent=2).encode("utf-8")
    output = ROOT / "release"
    output.mkdir(exist_ok=True)
    suffix = "" if args.stable_name else "-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    target = output / f"linsi-edit-lite-{version}{suffix}.zip"
    manifest = {"product": "Linsi Edit Lite", "version": version, "update_format": 1, "minimum_python": [3, 11], "files": []}
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            name = path.relative_to(ROOT).as_posix()
            content = path.read_bytes()
            archive.writestr(name, content)
            manifest["files"].append({"path": name, "sha256": hashlib.sha256(content).hexdigest()})
        archive.writestr("release-files.json", release_list)
        manifest["files"].append({"path": "release-files.json", "sha256": hashlib.sha256(release_list).hexdigest()})
        archive.writestr("MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2))
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix(".zip.sha256").write_text(digest + "  " + target.name + "\n", encoding="utf-8")
    (ROOT / "release-files.json").write_bytes(release_list)
    if args.stable_name:
        notes = (ROOT / "RELEASE_NOTES.md").read_text(encoding="utf-8")
        announcement = {
            "tag_name": "v" + version, "draft": False, "prerelease": False, "body": notes,
            "assets": [{
                "name": target.name, "size": target.stat().st_size, "digest": "sha256:" + digest,
                "browser_download_url": f"https://github.com/feiwu6733-arch/linsi-edit-lite/releases/download/v{version}/{target.name}",
            }],
        }
        (output / "update.json").write_text(json.dumps(announcement, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"发布包：{target}")
    print(f"SHA-256: {digest}")


if __name__ == "__main__":
    main()
