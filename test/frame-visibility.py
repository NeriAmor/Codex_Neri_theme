"""在完整宿主界面中比较装饰开关，避免只隐藏侧栏后检测边框。"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json
root = Path(__file__).resolve().parent.parent / 'artifacts'
report = {}
for mode in ['dark', 'light']:
    visible = Image.open(root / f'frame-visible-{mode}.png').convert('RGB')
    hidden = Image.open(root / f'frame-hidden-{mode}.png').convert('RGB')
    w, h = visible.size
    diff = ImageChops.difference(visible, hidden)
    regions = {'left': (0, 80, 32, h-50), 'bottom_left': (32, h-32, min(400,w//4), h), 'top': (100, 0, w-100, 32)}
    report[mode] = {}
    for name, rect in regions.items():
        mean = sum(ImageStat.Stat(diff.crop(rect)).mean)/3
        assert mean > .10, f'{mode} {name}: 边缘装饰被宿主遮住或未绘制 ({mean})'
        report[mode][name] = mean
report['failures'] = 0
(root / 'frame-visibility-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
