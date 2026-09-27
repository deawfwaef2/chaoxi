# 截图测试：PYTHONPATH=/tmp/pylib PLAYWRIGHT_BROWSERS_PATH=/tmp/pw python3 tools/shot.py [脚本名]
import sys, os, json, time
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = '/tmp/shots'; os.makedirs(out, exist_ok=True)
mode = sys.argv[1] if len(sys.argv) > 1 else 'basic'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    for dev in (['pc', 'phone'] if mode == 'basic' else [mode.split(':')[0]]):
        if dev == 'phone': ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else: ctx = b.new_context(viewport={'width': 1366, 'height': 768})
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e) + ' @ ' + str(getattr(e,'stack',''))[:300]))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        pg.goto('file://' + root + '/index.html'); time.sleep(1.2)
        pg.screenshot(path=f'{out}/{dev}_0start.png')
        pg.click('#bStart'); time.sleep(2.5)
        pg.screenshot(path=f'{out}/{dev}_1game.png')
        extra = os.environ.get('JS')
        if extra:
            r = pg.evaluate(extra); print('JS->', r); time.sleep(float(os.environ.get('WAIT', '2')))
            pg.screenshot(path=f'{out}/{dev}_2js.png')
        print(dev, 'errors:', errs[:8])
        ctx.close()
    b.close()
