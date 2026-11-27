# Neri Desktop Theme 1.1.0

Windows ChatGPT / Codex 桌面完整外观插件，不需要原 Wallpaper Prism 插件或单独的文字特效脚本。

包含：音理毛玻璃、居中阅读列、导航与文件夹图标、模式字标、实时额度双环、工具栏图标、窗口边框、光标与打字/回复粒子、动态壁纸库、视频播放和悬浮设置。附带当前使用的 6K 音理视频约50MB；本地/Steam其他壁纸仍读取电脑上的原文件。

## 安装和使用

1. 完整解压，双击“安装.cmd”。需要 Windows、Node.js 22或更新版本，以及已安装的 ChatGPT / Codex桌面端。
2. 首次安装会迁移本机旧Prism的配置、预设与导入文件，保留原来的选择与玻璃透明度，旧数据不会删除。新数据位于 %USERPROFILE%\.neri-desktop-theme。
3. 安装器注册 neri-desktop-theme@neri-local，成功激活后禁用旧Prism自动加载，避免重复注入。
4. 正常从桌面或开始菜单的ChatGPT / Codex快捷方式启动。首次遇到当前窗口没有调试端口时，需完全退出后从修复的快捷方式重新打开。
5. 点击左侧导航的“Neri”或按 Ctrl+Alt+W 打开主题与壁纸设置，可切换文字与光标特效、背景视频、透明度、模糊、声音、轮换和导入素材。

无需保留原Prism、Gemini素材或单独的codex-typing-effects目录。运行插件自身缓存内的代码与资源，运行时无需npm安装。Node.js和桌面宿主仍是必要环境。

应用内部自动更新重启可能丢失调试参数，此时从上述快捷方式重新打开。包没有修改宿主安装文件或绕过CSP。

## 边线精确对齐

codex/frame.mjs 用单个全窗口SVG绘制轨道和波纹。上下直接镜像同一组路径，左右同理，不再拼接多张边条背景。四角素材只保留插画，重复边线已移除。

test/live-frame.mjs 捕获实际窗口，test/frame-pixels.py 比较上下镜像像素，并要求故意偏移的样本必须被拒绝。宽窄屏均有截图。

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
