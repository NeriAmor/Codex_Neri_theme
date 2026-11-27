"""固定透明度和视频帧，验证主聊天区背景确实发生模糊变化。"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json
root = Path(__file__).resolve().parent.parent / 'artifacts'
clear = Image.open(root / 'glass-blur-clear.png').convert('RGB')
soft = Image.open(root / 'glass-blur-soft.png').convert('RGB')
assert clear.size == soft.size
w, h = clear.size
# 阅读列右边的壁纸留白，不包含正文、输入框、侧栏及装饰边线。
rect = (w-210, int(h*.3), w-65, int(h*.65))
mean = sum(ImageStat.Stat(ImageChops.difference(clear.crop(rect), soft.crop(rect))).mean)/3
assert mean > 1, f'主聊天背景未呈现可见的模糊变化: {mean}'
report = {'wallpaperMeanDifference': mean, 'failures': 0}
(root / 'glass-pixel-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
