# Codex 适配验证记录

日期：2026-11-24。目标：本机 OpenAI.Codex 26.1117.4957.0，Windows。

- `npm test`：2 项通过，0 失败；验证主窗口筛选、真实上传、持久化、令牌与来源检查、恢复。
- `npm run test:browser`：15 个行为检查通过，0 失败。Microsoft Edge 的页面异常与控制台错误均为 0；增加独立实色衬底和主表面半透明回归检查。
- JavaScript 语法检查：4 个运行文件通过。PowerShell 语法检查：3 个脚本通过。安装脚本已在 Windows PowerShell 中实际执行成功。
- 安装后服务实测：进程身份匹配，扫描得到 44 张本机壁纸；停止接口正常退出服务。
- 已生成桌面快捷方式 Codex Prism Wallpaper，未结束或重启当前 Codex 进程。

3.0.1 真实宿主验证：`node test/live-codex.mjs` 7 项通过、0 失败。当前 Codex 主窗口已实际确认 app://fs 视频解码、独立 surface backing 透明、主表面 30% 不透明度、单一控制按钮，以及头像悬浮窗不注入。修复已应用，无需重启应用。移除衬底修复后回归检查按预期失败，恢复修复后通过。

源码目录 artifacts/ 保存浏览器报告与截图；发行压缩包不包含本机壁纸库截图。

## 3.1.0：黑边与悬浮设置

- 去掉顶部 content fade 和输入区 footer::before 的黑色渐变，同时清除 footer::after 的 16 像素实色底条，保持输入框实底。
- 设置默认改为应用内 Shadow DOM 悬浮面板，沿用本机 44 张壁纸库；支持拖动、缩放、Esc/按钮关闭、Ctrl+Alt+W 开关、导入与文件夹扫描。
- 自动化检查：引擎 2 项、浏览器 22 项、真实主窗口 10 项、真实悬浮面板 14 项、原生所选文件读取 1 项通过，失败 0。
- 悬浮面板实测包含预览图解码、搜索、配置修改与恢复、拖动、缩放和关闭/重开；未新增浏览器窗口。
- 图片与视频的原上传存储路径继续由引擎测试覆盖；原生导入通道通过 DOM.getFileInfo 对实际选中文件读取路径，不传输整段 base64 视频。
- 截图：artifacts/10-real-floating-settings.png；报告：artifacts/live-floating-report.json。

## 3.2.0：正式本地插件

- 增加 .codex-plugin/plugin.json、.mcp.json、本地插件源、原生安装/卸载脚本。Codex CLI 已确认 codex-wallpaper-prism@prism-local 已安装且启用，版本 3.2.0。
- 安装版配置由 `codex mcp list --json` 解析后实际拉起，initialize、6 个工具的发现及当前状态读取通过，主窗口已连接。
- `npm run test:plugin` 通过：实际 MCP 进程初始化自动启动服务、并发客户端共享实例、配置保存、参数拒绝与服务自动恢复。
- `npm test` 2 项通过；安装后真实主窗口 10 项与悬浮面板 14 项通过，原有 44 张壁纸和 30% 透明度保留。
- 安装器重复运行成功；新桌面和开始菜单 Codex.lnk 的目标均为系统 chatgpt-desktop.exe 别名，带本机连接参数，不调用外部壁纸脚本。
- 当前 Codex 未被结束：下次完全退出后从新 Codex 图标冷启动的完整链路尚待确认。系统原始商店/旧任务栏入口未被替换。
- 壁纸服务有独立生命周期，禁用插件不会强制结束已经运行的共享服务；可使用面板关闭、恢复脚本或卸载脚本即时恢复。
- 安装与 MCP 验证报告：artifacts/installed-plugin-report.json。

## 3.2.1：资料空间与插件页头

- 复现资料空间和插件目录共用吸顶页头 ::before 的不透明 rgb(13, 17, 23) 遮罩。此前聊天区域的透明规则没有覆盖该组件。
- 统一修复主区域内 [data-sticky][data-expand-search] 页头及前后伪元素的背景，保留搜索框、菜单和内容卡片自身的样式。
- 新增真实页面切换检查：修复前在资料空间背景断言失败；修复后资料空间、插件目录两页全部通过，页面异常为 0。
- 浏览器行为检查 23 项、引擎 2 项、MCP 自动启动协议 1 项通过；安装后的插件版本和实际 MCP 调用通过。
- 本次实机视觉验证范围为用户截图中的两页；未宣称所有应用页面均已遍历。
- 截图与报告：artifacts/11-space-header-fixed.png、artifacts/11-plugins-header-fixed.png、artifacts/page-headers-report.json。
