import hashlib
import io
import json
import os
import tempfile
import time
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from updater import Updates, allowed_path, inspect_package, install_files, rollback, version


def package(root, extra=None):
    files = {
        "serve.py": b"new server",
        "updater.py": b"new updater",
        "package.json": b'{"version":"0.4.1"}',
        "start.ps1": b"new start",
    }
    if extra:
        files.update(extra)
    files["release-files.json"] = json.dumps(sorted(list(files) + ["release-files.json"])).encode()
    manifest = {
        "product": "Linsi Edit Lite", "version": "0.4.1", "update_format": 1,
        "minimum_python": [3, 11],
        "files": [{"path": name, "sha256": hashlib.sha256(content).hexdigest()} for name, content in files.items()],
    }
    target = Path(root) / "download.zip"
    with zipfile.ZipFile(target, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
        archive.writestr("MANIFEST.json", json.dumps(manifest))
    return target, hashlib.sha256(target.read_bytes()).hexdigest()


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="linsi-edit-update-")
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def release(self):
        return {
            "tag_name": "v0.4.1", "draft": False, "prerelease": False, "body": "New feature",
            "assets": [{
                "name": "linsi-edit-lite-0.4.1.zip", "size": 1024,
                "digest": "sha256:" + "a" * 64,
                "browser_download_url": "https://github.com/feiwu6733-arch/linsi-edit-lite/releases/download/v0.4.1/linsi-edit-lite-0.4.1.zip",
            }],
        }

    def test_versions_and_paths(self):
        self.assertGreater(version("0.10.0"), version("0.9.9"))
        for value in ["1.2", "v1.2.3-beta", "../1.2.3", "01.2.3"]:
            with self.assertRaises(ValueError):
                version(value)
        for name in ["../serve.py", "C:/serve.py", "/serve.py", ".local/private.json", ".env", "CON", "a/../../b"]:
            self.assertFalse(allowed_path(name), name)

    def test_package_digest_manifest_and_private_paths(self):
        target, digest = package(self.root)
        self.assertEqual(inspect_package(target, "0.4.1", digest)["version"], "0.4.1")
        with self.assertRaises(ValueError):
            inspect_package(target, "0.4.1", "0" * 64)
        target, digest = package(self.root, {".local/private.json": b"no"})
        with self.assertRaises(ValueError):
            inspect_package(target, "0.4.1", digest)

    def test_release_notification_preferences_and_fallback(self):
        updates = Updates(self.root / "data", "0.4.0")
        with patch("updater.urlopen", return_value=io.BytesIO(json.dumps(self.release()).encode())):
            updates.check()
        self.assertTrue(updates.public()["notify"])
        updates.dismiss("later")
        self.assertFalse(updates.public()["notify"])
        limited = HTTPError("https://api.github.com", 403, "rate limit", {}, None)
        updates.preferences = {}
        with patch("updater.urlopen", side_effect=[limited, io.BytesIO(json.dumps(self.release()).encode())]) as request:
            updates.check()
        self.assertEqual(updates.public()["status"], "available")
        self.assertEqual(request.call_args.args[0].full_url, "https://github.com/feiwu6733-arch/linsi-edit-lite/releases/latest/download/update.json")

    def test_download_verifies_before_ready(self):
        target, digest = package(self.root)
        content = target.read_bytes()
        updates = Updates(self.root / "data", "0.4.0")
        release = self.release()
        release["assets"][0].update(size=len(content), digest="sha256:" + digest)
        with patch("updater.urlopen", return_value=io.BytesIO(json.dumps(release).encode())):
            updates.check()
        response = io.BytesIO(content)
        response.url = release["assets"][0]["browser_download_url"]
        with patch("updater.urlopen", return_value=response):
            updates.download()
            deadline = time.monotonic() + 5
            while updates.busy and time.monotonic() < deadline:
                time.sleep(.01)
        self.assertEqual(updates.public()["status"], "ready")

    def test_install_and_rollback_preserve_local_data(self):
        app = self.root / "app"
        app.mkdir()
        old = {"serve.py": b"old server", "updater.py": b"old updater", "package.json": b'{"version":"0.4.0"}', "start.ps1": b"old start"}
        for name, content in old.items():
            (app / name).write_bytes(content)
        (app / "release-files.json").write_text(json.dumps(sorted(list(old) + ["release-files.json"])))
        data = app / ".local"
        directory = data / "updates"
        directory.mkdir(parents=True)
        (data / "keep.json").write_text("private local data")
        _, digest = package(directory)
        (directory / "pending.json").write_text(json.dumps({"version": "0.4.1", "sha256": digest}))
        backup, new_version = install_files(app, directory)
        self.assertEqual(new_version, "0.4.1")
        self.assertEqual((data / "keep.json").read_text(), "private local data")
        rollback(app, backup)
        for name, content in old.items():
            self.assertEqual((app / name).read_bytes(), content)


if __name__ == "__main__":
    unittest.main()
