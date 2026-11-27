"""比较实际窗口截图中的上下波纹；错位样本必须失败，不能只验证容器尺寸。"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json
root = Path(__file__).resolve().parent.parent / 'artifacts'
def error(name):
    im = Image.open(root / name).convert('RGB')
    width, height = im.size
    # 排除保留的四角插画，只比对真正的连续波纹、星点和轨道线。
    margin = int(min(width * .24, height * .4, 380)) + 8
    depth = int(min(width * .24, height * .4, 380) * .12)
    top = im.crop((margin, 0, width-margin, depth))
    bottom = im.crop((margin, height-depth, width-margin, height)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    return sum(ImageStat.Stat(ImageChops.difference(top, bottom)).mean) / 3
desktop, bad, narrow = [error(n) for n in ['frame-pixels.png','frame-pixels-misaligned.png','frame-pixels-narrow.png']]
# 抗锯齿允许每通道平均不到1/255的差异，偏移必须显著高于正常渲染。
assert desktop < 1, f'宽屏波纹不对齐: {desktop}'
assert narrow < 1, f'窄屏波纹不对齐: {narrow}'
assert bad > max(desktop * 3, 1), f'故意错位未被识别: {bad}'
report = dict(desktopMeanPixelError=desktop, narrowMeanPixelError=narrow, rejectedMisalignmentError=bad, failures=0)
(root / 'frame-pixel-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
