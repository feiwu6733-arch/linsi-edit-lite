# 来源与第三方组件

- `src/vendor/exportCancellation.js` 来自 Timeline Studio（MartinDelophy），MIT，许可保留在 `public/licenses/Timeline-Studio-MIT.txt`。
- `src/vendor/lightOverlayIcons.js` 为灵思本地项目中的原创六种线稿图标；只复制这组基础图标。四款 Lite 包装与精简交互独立实现，没有复制私人 AI 程序或完整动效目录。
- `aacWorkerPlugin.mjs` 从灵思字幕项目复制，作用仅为将锁定版本的 AAC 编码器 Worker 打包到同源目录。
- SRT 解析与序列化参考 Timeline Studio 的 `subtitles.js`，在 Lite 中独立适配为只接受显式时间轴，不包含自动字幕。
- `mediabunny@1.50.8` 与 `@mediabunny/aac-encoder@1.50.8` 使用 MPL-2.0，保留对应许可和未修改上游源码包。源码随发行包置于 `third-party-source/`；构建锁定版本见 package-lock.json。
- `@phosphor-icons/web@2.1.2` 用于编辑台与云端入口的界面图标，使用 MIT 许可；发行包只构建所需的 Regular WOFF2 字体和对应图标映射，许可保留在 `public/licenses/Phosphor-Icons-MIT.txt`。
- Vite 是构建工具，不作为用户运行依赖；其依赖声明与许可证由 npm 依赖包保留。
- 灵思标志、微信二维码和示例视频来自用户已授权的灵思开源版展示素材。示例为无声演示人物视频，字幕与动效是手动示例，不是识别结果。

本项目自身代码按根目录 LICENSE 提供；品牌名称和二维码不表示衍生项目获得官方身份。

## v0.2.0 精选动效迁移

`src/trial/` 按灵思本地商业版体验清单抽取绘制函数、字体、材质和数学缓动工具，没有复制完整组件目录、账号权限系统、AI 编排或私人生成程序。几何适配在 Lite 中独立实现；双指标改为显式表单输入，增长曲线改为用户填写的 8 个点；经典章节导航独立适配，不含其他付费导航样式。数值图形模块只做本地数学计算，不调用任何 AI。

人物底片 `demo-presenter-v2.mp4` 和封面 `demo-presenter-v2.jpg` 为用户指定的商业版内置演示素材；演示时间轴参考 `demoProject.js` 的体验分支，新建独立工程 ID。基础组件改动仅发生在 Lite 副本。
