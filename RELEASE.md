# GitHub 发布与本地更新

公开仓库固定为 `https://github.com/feiwu6733-arch/linsi-edit-lite`。

用户从 Releases 下载 ZIP，解压后双击“启动灵思剪辑.cmd”。程序仅监听 `127.0.0.1:5031`。启动后自动检查正式 Release，此后每 24 小时检查一次；断网不影响本地剪辑。

## 发布新版

1. 修改 `package.json` 与 `package-lock.json` 的版本号，并同步 README 和 RELEASE_NOTES。
2. 运行 `npm test`、`npm run build` 和更新测试。
3. 推送 main。GitHub Actions 会测试、构建、生成带清单与 SHA-256 的 ZIP，并创建对应 Release。
4. 同一版本已经存在时不会覆盖，必须先增加版本号。

发行包不包含 `.local`、浏览器工程、视频、音乐、更新缓存、测试产物、凭据或 Git 历史。
