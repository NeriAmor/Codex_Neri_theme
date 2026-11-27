# Wallpaper Prism for Codex Desktop

基于 `agy-wallpaper-prism 2.0.8` 的 Windows Codex 桌面适配版（3.1.0）。目标是当前电脑上的 OpenAI Codex 桌面应用，不是 chatgpt.com 网页或独立 ChatGPT 客户端。

这是通过本地伴随服务和 Chromium 调试端口加载的非官方外观适配，不能从 Codex 的插件市场直接安装。它不修改应用安装文件、app.asar、登录配置或现有普通快捷方式。

## 使用

要求 Windows、已安装 Codex 桌面版、Node.js 22 或更新版本。正常使用不需要 npm install。

1. 双击 `安装.cmd`，将运行文件复制到 `%LOCALAPPDATA%\CodexWallpaperPrism` 并创建桌面 `Codex Prism Wallpaper` 快捷方式。也可直接从解压目录运行 `启动 Codex 壁纸.cmd`。
2. 完全退出 Codex（包括托盘进程），然后从新的快捷方式启动。首次需要重开应用，因为当前未带调试参数的进程无法补开调试端口。启动器不会主动结束现有进程。
3. Codex 内会打开壁纸设置悬浮面板，不再自动打开浏览器。点击壁纸应用，或导入图片/视频、添加本地文件夹。Steam / Wallpaper Engine 库自动扫描。
4. 右下角的 `◆ Prism` 和 `Ctrl+Alt+W` 开关面板；拖动标题栏移动，拖动右下角调整大小，Esc 或右上角 × 关闭面板。Shift+点击 Prism 按钮切换壁纸开关。面板关闭后，连按四次 Esc 或 Ctrl+Alt+Shift+R 可紧急移除背景。
5. 双击 `恢复原界面.cmd`，关闭壁纸及伴随服务。之后从原来的 Codex 图标启动即可。恢复脚本不删除已导入的文件与设置。

独立浏览器设置页保留为备用入口，地址可从本机服务日志中取得；带授权令牌的链接不要分享。悬浮面板不使用 iframe，也不需要向页面开放本地 HTTP 连接。

## 支持范围

- 图片、GIF、Chromium 可解码的视频、本地文件夹与 Steam Workshop 自动发现。
- 图片组轮播、随机/顺序定时切换、视频结束切换、视频暂停/声音、填充方式。
- 玻璃透明度与侧栏模糊、代码与菜单的实底背景、禁用与恢复。
- `scene.pkg` 有可提取的内嵌视频时使用该视频；其他场景和 HTML/web 壁纸使用预览图。没有预览图时保留当前背景。当前适配不在 Codex 中执行第三方网页壁纸脚本。
- 视频格式取决于应用 Chromium 编解码器。不支持的编码需要先转为 H.264 MP4 或 VP8/VP9 WebM。大视频通过应用的本地文件协议读取，不把整个视频转为 base64。

没有迁移原版全部效果：Antigravity 的侧边栏插件面板、浮岛布局、8 套完整主题、场景实时渲染及原宿主快捷方式管理不属于本版 Codex 入口。

## 原理及运行位置

`codex/server.mjs` 复用原版 `src/engine`（扫描、上传、配置、媒体、播放列表），提供只绑定 `127.0.0.1` 的设置服务。

`codex/bridge.mjs` 仅选中 `app://-/index.html` 或 `app://-/` 的主页面，通过短时 CDP 连接更新背景与少量操作消息，不读取聊天内容。媒体通过当前已安装版本拥有的 `app://fs/@fs/` 文件协议和内置壁纸 data URL 加载，以适配其内容安全策略；不调用 CSP bypass。

`codex/inject.js` 提供独立背景层、有限范围的透明样式和完全移除入口。设置保存在 `%USERPROFILE%\.codex-wallpaper-prism`；服务日志也在该目录。

`codex/panel.js` 在应用内提供独立 Shadow DOM 悬浮面板。配置、选择和扫描操作通过现有 CDP 连接同步；导入读取用户实际选中的文件，不把大视频转成 base64。3.1.0 移除了聊天顶部和输入区底部的黑色渐变遮罩。

调试端口默认 `9340`，只绑定本机。首次可用 `powershell -File codex/launch.ps1 -DebugPort 9341` 改端口；已有伴随服务须先恢复并停止后再改。自定义安装路径可设置 `CODEX_PRISM_EXE`；数据目录可设置 `CODEX_PRISM_DATA_DIR`。

从普通图标打开应用时不会自动加载壁纸。后续应用升级若改动主窗口地址、DOM 或本地文件协议，需要重新验证适配。

## 验证

```powershell
npm ci
npm test
npm run test:browser
```

运行时无需依赖包。浏览器测试使用本机 Microsoft Edge 和开发依赖 Playwright。

已验证：真实引擎的上传、持久化、权限检查、恢复，以及浏览器中设置页的导入、选择、透明度、开关、刷新授权，背景层图片/视频播放、暂停、输入框交互、紧急关闭与清理。截图及报告见源码目录 `artifacts/`。

3.0.1 已在当前运行的 Codex 主窗口验证 `app://fs` 视频解码、独立 surface backing 清除、聊天区域透明度（沿用设置的 30%）和单一控制按钮。头像悬浮窗不再注入背景。真实窗口测试：`node test/live-codex.mjs`；截图：`artifacts/07-real-codex-fixed.png`。

3.1.0 验证：`npm test` 2 项、`npm run test:browser` 22 项通过；`node test/live-codex.mjs` 在真实窗口检查 10 项；`node test/live-floating.mjs` 在真实窗口检查 14 项（打开、搜索、预览图解码、修改配置并恢复、拖动、缩放、关闭和快捷键）；`node test/native-file-access.mjs` 验证原生所选文件路径读取。底部渐变和额外的 16 像素实色伪元素均已清除。真实悬浮面板截图：`artifacts/10-real-floating-settings.png`。

## 上游

上游项目：[azwosile/agy-wallpaper-prism](https://github.com/azwosile/agy-wallpaper-prism)，原包声明 MIT。原版说明及清单位于 `docs/UPSTREAM-README.md` 和 `docs/UPSTREAM-plugin.json`。保留的 `sidecars` 和 `src/host` 是上游实现；Codex 启动入口是 `codex/launch.ps1`，不会启动原 Antigravity 适配入口。
