# Neri Desktop Theme 1.1.0

Windows ChatGPT / Codex 桌面完整外观插件，不需要原 Wallpaper Prism 插件或单独的文字特效脚本。

包含：音理毛玻璃、居中阅读列、导航与文件夹图标、模式字标、实时额度双环、工具栏图标、窗口边框、光标与打字/回复粒子、动态壁纸库、视频播放和悬浮设置。附带当前使用的 6K 音理视频约50MB；本地/Steam其他壁纸仍读取电脑上的原文件。

## 安装和使用

1. 完整解压，双击“安装.cmd”。需要 Windows、Node.js 22或更新版本，以及已安装的 ChatGPT / Codex桌面端。
2. 正常从桌面或开始菜单的ChatGPT / Codex快捷方式启动。首次遇到当前窗口没有调试端口时，需完全退出后从修复的快捷方式重新打开。
3. 点击左侧导航的“Neri”或按 Ctrl+Alt+W 打开主题与壁纸设置，可切换文字与光标特效、背景视频、透明度、模糊、声音、轮换和导入素材。

运行插件自身缓存内的代码与资源，运行时无需npm安装。Node.js和桌面宿主仍是必要环境。

应用内部自动更新重启可能丢失调试参数，此时从上述快捷方式重新打开。包没有修改宿主安装文件或绕过CSP。

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
