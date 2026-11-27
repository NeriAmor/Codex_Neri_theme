音理（Neri）ChatGPT / Antigravity UI 主题素材包说明
==================================================

目录结构：
1. icons/（已裁切、去白底并做深色背景边缘去白边处理的透明 PNG）
   - icon-bow.png         : 茜红黑蕾丝蝴蝶结（主操作按钮 / 新聊天徽章）
   - icon-cat.png         : 蜷缩小黑猫（带柔雾粉紫发光外晕，适合深色界面思考态/空状态）
   - icon-cat-clean.png   : 蜷缩小黑猫（无外晕清爽版）
   - icon-hairpin.png     : 黑色“X”字形发卡（关闭 / 清除图标）
   - icon-white-bow.png   : 白色丝绸蝴蝶结（保留内部纯白，仅去外围背景）
   - icon-notebook.png    : 白翼深蓝手账本（项目 / 知识库图标）
   - icon-line.png        : 星光双黑毛球分隔线（已镂空毛球系带内部白三角）

2. overlays/transparent/（透明底 PNG，直接 background-image 即可叠加，无需混合模式）
   - neri-overlay-transparent.png        : 全屏四角星夜蕾丝与光尘叠层
   - neri-lace-transparent.png           : 银白星光蕾丝花边横条（原第3张图第1条）
   - neri-divider-transparent.png        : 紫粉星芒分隔线（原第3张图第2条）
   - neri-composer-trim-transparent.png  : 柔光弧角星光输入框装饰框（原第3张图第3条）

3. overlays/screen/（纯黑底已压净至 #000000，搭配 CSS mix-blend-mode: screen 使用光效最通透）
   - neri-overlay-screen.png
   - neri-lace-screen.png
   - neri-divider-screen.png
   - neri-composer-trim-screen.png

4. neri-assets-snippet.css
   - 开箱即用的 CSS 变量与叠层示例代码。
