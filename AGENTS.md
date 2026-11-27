# Codex Wallpaper Prism 验证

| 规则 | 由什么拦住 |
|---|---|
| 主界面背景适配必须同时覆盖独立 surface backing 和 main surface，并保留设置透明度 | `npm run test:browser` 的背景颜色与透明度检查 |
| 修改注入时，有运行中的 Codex 调试端口则验证真实主窗口，不能只用模拟页面宣称完成 | `node test/live-codex.mjs`，报告与截图保存于 artifacts |
| 清除聊天上下黑边，保留输入框本身的可读背景 | `npm run test:browser` 和 `node test/live-codex.mjs` 同时检查顶部背景图、底部 ::before 渐变及 ::after 实色底条 |
| 页头适配必须验证资料空间和插件页，覆盖共用吸顶页头的实色伪元素 | `node test/live-page-headers.mjs` 在真实应用切换两个页面，截图并检查页头各层背景 |
| 悬浮设置必须在真实应用中验证开关、拖动、缩放及配置写入 | `node test/live-floating.mjs`，Esc 需兼容 Codex 截获 keydown 的行为 |

不要向头像悬浮窗注入主窗口背景。窗口 URL 筛选后仍需检查实际 app-shell-frame。

本地插件安装还需运行 `npm run test:plugin`；安装后的实际 MCP 路径须用 `node test/installed-plugin.mjs` 验证，不能只检查清单存在。当前 Codex 兼容 MCP 配置使用相对参数和 `cwd: "."`，不依赖未展开的 `${PLUGIN_ROOT}`。Windows 安装器等待激活进程本身，不用 Start-Process -Wait 等待包含常驻服务的进程树。
| 会话消息和输入框使用磨砂玻璃，同时保留全局透明度 | `node test/live-glass.mjs` 检查真实消息、回复和输入框，截图验证可读性；`node test/live-codex.mjs` 验证全局透明度 |
| 音理主题素材必须真实解码，阅读列居中且最大 860px，装饰不能拦截输入，字体跟随应用设置 | `node test/live-neri.mjs` 检查资源、宽窄屏居中、字体原生值、低透明度边框、聚焦及截图 |
| 自定义侧栏图标原位替换 SVG，18px 统一尺寸与文字对齐，新聊天使用深色底 | `node test/live-sidebar.mjs` 检查真实图标、色值、对齐、项目折叠和点击命中 |
| 输入胶囊外圈必须包住全部按钮；PNG 只作底缘微光，不得横切图标；保留回底间距及茜红主操作按钮 | `node test/live-composer.mjs` 检查外圈偏移、按钮包裹、PNG 高度、点击命中、10px间距和悬停色 |
| 思考强度滑块须用宿主真实档位、松手才提交、键盘不与菜单冲突、切模型后更新档位并可恢复原生 | `node test/live-effort-slider.mjs` 在真实 Codex 验证拖动、方向键和 Home/End、五/六档模型、重开同步及恢复，结束还原模型与强度 |

| 额度双环须以内联SVG同步真实剩余额度，保留原生节点，0%无残点，多实例ID唯一且菜单可用 | `node test/live-quota.mjs` 修改并恢复显示属性，验证进度、聚焦、ID与原生菜单 |

| 波纹须比较实际图案，宽窄屏都需上下镜像一致，故意偏移必须被拒绝 | node test/live-frame.mjs + python test/frame-pixels.py |
| 完整主题不得依赖旧Prism或单独文字特效目录，迁移后旧数据保留 | 独立解压冷启动、内置视频与test/installed-plugin.mjs；文字特效开关持久化检查 |
| 禁用宿主插件必须停止后台服务并清除所有注入，不得由旧MCP重新拉起；升级保留禁用状态 | node --test test/lifecycle.test.mjs + 实机启用/禁用清理报告 |

| 设置列表不可因一张预览出错而全部失败；输入必须修改真实样式，状态不能无限停留应用中；入口位于左侧导航 | node test/live-settings.mjs + node test/live-floating.mjs |

| 自定义面板须保留目录/开关/轮换/下一张/恢复/快捷键与窄屏布局，原生蓝色checkbox不得露出 | node test/live-panel-ui.mjs（21项）+ node test/live-floating.mjs |

| 安装不能新增主题快捷方式；已有入口必须使用原生 Codex 用户目录，并追溯旧 Prism 创建记录清理重复入口 | powershell.exe -NoProfile -ExecutionPolicy Bypass -File test/shortcuts.ps1 |

| 额度归零、原生警示图标或关联 Tooltip 用尽提示须切换专用图标；恢复无跳位，所有 ID 与引用唯一且菜单保持原生 | node test/quota-exhausted.mjs + node test/live-quota.mjs + node test/live-quota-exhausted.mjs |

| 浅色模式须同步正文/侧栏/输入框/菜单及 Shadow DOM 设置，保留字体与壁纸；显式模式优先系统并可切回 | npm run test:appearance + node test/live-appearance.mjs（实机模式切换后恢复） |
