#!/bin/bash

# 端口号
PORT=5618

# 查找占用该端口的进程 PID
PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
    echo "端口 $PORT 未被占用"
    npm start
    exit 0
fi

echo "发现占用端口 $PORT 的进程 PID: $PID"

# 先尝试优雅终止
echo "尝试正常终止进程..."
kill $PID

# 等待1秒
sleep 1

# 检查是否还在运行
if ps -p $PID > /dev/null; then
    echo "进程未退出，强制终止..."
    kill -9 $PID
else
    echo "进程已正常终止"
fi

# 最终检查
sleep 1
if ! ps -p $PID > /dev/null; then
    echo "✅ 成功释放端口 $PORT"
else
    echo "❌ 无法终止进程，请手动检查"
fi

npm start