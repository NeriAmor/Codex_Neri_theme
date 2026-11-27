# Neri Desktop Theme 1.1.1

Windows ChatGPT / Codex 桌面完整外观插件，不需要原 Wallpaper Prism 插件或单独的文字特效脚本。

包含：音理毛玻璃、居中阅读列、导航与文件夹图标、模式字标、实时额度双环、工具栏图标、窗口边框、光标与打字/回复粒子、动态壁纸库、视频播放和悬浮设置。附带当前使用的 6K 音理视频约50MB；本地/Steam其他壁纸仍读取电脑上的原文件。

## 安装和使用

1. 完整解压，双击“安装.cmd”。需要 Windows、Node.js 22或更新版本，以及已安装的 ChatGPT / Codex桌面端。
2. 首次安装会迁移本机旧Prism的配置、预设与导入文件，保留原来的选择与玻璃透明度，旧数据不会删除。新数据位于 %USERPROFILE%\.neri-desktop-theme。
3. 安装器注册 neri-desktop-theme@neri-local，成功激活后禁用旧Prism自动加载，避免重复注入。
4. 安装器只维护已有的 ChatGPT / Codex 快捷方式，不新增桌面或开始菜单入口，并清理旧主题生成的重复入口。首次升级需完全退出所有窗口和托盘进程，再从原有快捷方式打开。
5. 点击左侧导航的“Neri”或按 Ctrl+Alt+W 打开主题与壁纸设置，可切换文字与光标特效、背景视频、透明度、模糊、声音、轮换和导入素材。

无需保留原Prism、Gemini素材或单独的codex-typing-effects目录。运行插件自身缓存内的代码与资源，运行时无需npm安装。Node.js和桌面宿主仍是必要环境。

主题作为原生插件安装，启用/禁用由插件开关控制。由于宿主插件没有全局样式接口，注入仍依赖原有快捷方式附带的本地调试参数；直接从 Windows 应用列表（AppsFolder）、协议链接或应用内部更新进行无参数冷启动时，无法保证主题生效，需要退出后从已配置的原有快捷方式重新打开。包没有修改宿主安装文件或绕过 CSP。

## 边线精确对齐

codex/frame.mjs 用单个全窗口SVG绘制轨道和波纹。上下直接镜像同一组路径，左右同理，不再拼接多张边条背景。四角素材只保留插画，重复边线已移除。

test/live-frame.mjs 捕获实际窗口，test/frame-pixels.py 比较上下镜像像素，并要求故意偏移的样本必须被拒绝。宽窄屏均有截图。

## 恢复与卸载

设置中的“恢复原界面”关闭整套外观及文字特效。“恢复原界面.cmd”同时停止主题服务。“卸载插件.cmd”移除新插件，保留新旧壁纸与数据。旧Prism保持停用；需要回退时可重新安装原Prism包。

## 源码与测试

样式：codex/neri-theme.css；边框：codex/frame.mjs；图标与额度：codex/inject.js、quota-icon.mjs；壁纸：src/engine；文字特效源码及预构建包：codex/typing-effects。

开发测试先 npm ci，然后运行：

```powershell
npm test
npm run test:plugin
npm run test:browser
node test/typing-effects.mjs
node test/installed-plugin.mjs
node test/live-codex.mjs
node test/live-quota.mjs
node test/live-frame.mjs
python test/frame-pixels.py
```

像素检查使用Python/Pillow；实际窗口检查需要本机9340端口。文字特效重建脚本及必需上游源码已包含，许可证保留在codex/typing-effects/LICENSE。

本实现沿用MIT许可的Wallpaper Prism壁纸引擎、Woodfish文字特效及本地适配；内部部分Prism兼容变量名保留，不代表依赖原插件。素材供用户本机使用，分享前请核对素材授权。

## 1.1.0 禁用生命周期修复

宿主插件页“禁用”会在后台轮询检测到后停止服务，撤回壁纸、样式、边框、图标、悬浮设置、光标和文字粒子。被禁用时旧MCP也不能重启服务；升级保留已有禁用状态。需要恢复时从插件页“启用”。

回归检查：node --test test/lifecycle.test.mjs。实际窗口验证已覆盖启用后注入、禁用后所有图层/特效消失以及阻止自动重启。

## 1.1.0 壁纸与设置同步

Neri入口移至左侧导航“探索”下方。自动识别Wallpaper Engine创意工坊及项目目录，并在设置窗口显示已连接路径。默认音理6K壁纸在所有服务启动路径中自动检查与修复，固定在列表第一张。

滑动不透明度与模糊会实际更新玻璃样式；修改后显示“已应用”，断线显示可恢复的提示，不再无限等待。MCP连接存活时会自动恢复意外退出的服务，禁用插件时仍不会重启。

## 1.1.0 设置窗口重构

左侧Neri入口采用星夜画框SVG，打开窗口时显示粉紫激活背景与3px发光条。窗口使用neri-panel.css，状态胶囊收进顶栏；显示与特效、自动轮换、壁纸库分卡片组织。所有复选框改为自定义粉紫胶囊开关，滑块数值与轨道进度即时同步。

目录管理默认折叠，只显示已连接数量；展开后才能看到完整路径与添加文件夹表单。壁纸卡片附带类型角标、来源与选中星芒，宽屏4列、窄窗口2列。保留所有原有设置、导入、搜索、轮换、拖动缩放及Esc/Ctrl+Alt+W交互。

新增真机UI验证：node test/live-panel-ui.mjs。升级后的服务恢复会读取最新安装记录，避免旧缓存路径已被清理后无法启动后台。

## 1.1.1 原有入口与单实例修复

旧版直接调用执行别名时会选择 `chatgpt-desktop` 用户目录，原生应用则使用 `Codex` 目录，因此出现两套实例。现在为已有入口显式设置原生用户目录 `%APPDATA%\Codex\web\Codex`，保留本地调试参数；安装器不再创建任何主题快捷方式。追溯旧 Prism 安装记录，移除其生成的 Codex 桌面/开始菜单入口，保留用户原有的入口及原始备份。旧安装脚本统一转交原生插件安装器，外部启动脚本和启动命令文件已经移除，不再启动第二个桌面应用。

Windows 快捷方式回归检查：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File test/shortcuts.ps1`。
