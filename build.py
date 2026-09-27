#!/usr/bin/env python3
"""把 src/ 下的模块打包成根目录单文件 index.html（下载即玩，无依赖）。用法：python3 build.py"""
import glob, os
root = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(root, 'src/shell.html'), encoding='utf-8').read()
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(root, 'src/0*.js'))))
out = shell.replace('/*__JS__*/', js)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(out)
open('/tmp/chaoxi_bundle.js', 'w', encoding='utf-8').write(js)
print('index.html', len(out.encode('utf-8')) // 1024, 'KB')
