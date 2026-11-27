# Neri Desktop Theme 1.1.5

Windows ChatGPT / Codex 桌面外观插件。

包含：音理毛玻璃、居中阅读列、导航与文件夹图标、模式字标、实时额度双环、工具栏图标、窗口边框、光标与打字/回复粒子、动态壁纸库、视频播放和悬浮设置。附带当前使用的 6K 音理视频约50MB；本地/Steam其他壁纸仍读取电脑上的原文件。

## 安装和使用

1. 完整解压，双击“安装.cmd”。需要 Windows、Node.js 22或更新版本，以及已安装的 ChatGPT / Codex桌面端。
2. 安装器只修正原有的 ChatGPT / Codex 快捷方式，不新增主题专用入口，并清理旧版生成的重复入口。升级后需完全退出所有窗口及托盘进程，再从原有快捷方式打开。
3. 点击左侧导航的“Neri”或按 Ctrl+Alt+W 打开主题与壁纸设置，可切换文字与光标特效、背景视频、透明度、模糊、声音、轮换和导入素材。

运行插件自身缓存内的代码与资源，运行时无需npm安装。Node.js和桌面宿主仍是必要环境。

主题由原生插件启用和禁用，但样式注入仍需要原有快捷方式附带的本地调试参数。直接从 Windows 应用列表（AppsFolder）、协议链接或应用内部更新进行无参数冷启动时，无法保证主题生效；需要退出后从已配置的原有快捷方式重新打开。包没有修改宿主安装文件或绕过 CSP。

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

## 1.1.1

统一使用原生 Codex 用户目录，避免旧版执行别名产生第二套实例；移除外部启动脚本和主题专用快捷方式。

入口回归检查：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File test/shortcuts.ps1`。

## 1.1.2

额度按钮在任一剩余额度归零、Tooltip 提示用尽或原生图标切换为虚线警示圆时，自动显示音理额度用尽图标；恢复后切回双环。原生节点、Tooltip 和菜单交互保留，两种图标尺寸一致。

检查：`node test/quota-exhausted.mjs`、`node test/live-quota.mjs`、`node test/live-quota-exhausted.mjs`。

## 1.1.3

新增随应用切换的浅色主题：柔白淡紫毛玻璃、深紫正文、茜红操作按钮，覆盖侧栏、气泡、输入框、代码块、菜单及悬浮设置；保留壁纸、字体设置与深色样式。选择跟随系统时自动同步。

检查：`npm run test:appearance`、`node test/live-appearance.mjs`。

## 1.1.4

修复侧栏及顶栏遮挡窗口边缘装饰的问题，恢复四边与四角图案。装饰不接收鼠标事件，保留深浅模式配色与原生弹出菜单。

检查：`node test/live-frame-visibility.mjs` 在完整界面比较装饰显示与隐藏时的真实像素，覆盖深浅两种模式；`node test/live-frame.mjs` 与 `python test/frame-pixels.py` 检查宽窄屏上下波纹。

## 1.1.5

修复玻璃不透明度和模糊调节：统一后台与滑块的20%–98%范围，移除气泡及浅色模式吞掉低档调节的透明度下限；主聊天背景接入模糊，并取消侧栏外壳重复的玻璃层。0px可关闭背景模糊，深浅两种模式均响应。

检查：`node test/live-glass-controls.mjs` 和 `python test/glass-pixels.py` 操作真实滑块，检查主背景、侧栏、AI/用户气泡及输入框的低中高档、重开保留与设置恢复。
