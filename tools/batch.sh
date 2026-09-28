#!/bin/bash
# 用法: tools/batch.sh 分钟 物种 [并行数]  —— 并行跑多次，只看最后一行
N=${3:-4}; for k in $(seq 1 $N); do (node $(dirname $0)/simtest.js $1 0.0333 $2 0 60 | tail -2 | head -1 | cut -c1-150 > /tmp/batch_$k.txt) & done; wait; cat /tmp/batch_*.txt; rm -f /tmp/batch_*.txt
