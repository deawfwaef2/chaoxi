# 潮汐生态圈 · Chaoxi

**下载后直接双击根目录的 `index.html` 就能玩**：不用安装、不用服务器、不用联网（单文件，约 160KB）。

- 电脑：WASD / 方向键移动 · 点击地面瞬移 · 滚轮缩放 · 按住空格吸引能量 · 撞向黑墙可以消融 · B 打开方塔 · R 旋转 · Esc 取消
- 手机：左下摇杆移动 · 点地面瞬移 · 双指缩放 · 右下按钮吸引能量

目标：搭配 Q 版生物和观测者装置，让能量守恒的生态圈稳定运转，把【观测潮汐】（每 10 秒结算一次）推到 Lv.10。

开发：源码在 `src/`，改完运行 `python3 build.py` 重新打包 `index.html`。生态无头测试：`node tools/simtest.js 分钟 dt "slime=6,mush=6" [额外光能]`。
上传到各平台：在 `index.html` 的 `<head>` 里取消注释对应平台 SDK 的那一行（CrazyGames / Playgama / Poki / GameDistribution），广告会自动接入。
