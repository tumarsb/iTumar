#!/bin/bash

# 获取脚本所在目录
DIR="$(cd "$(dirname "$0")" && pwd)"

# 检查 Node.js
if ! command -v node &>/dev/null; then
  osascript -e 'display alert "缺少 Node.js" message "请先安装 Node.js：https://nodejs.org" buttons {"好的"}'
  open "https://nodejs.org"
  exit 1
fi

# 检查 .env
if [ ! -f "$DIR/backend/.env" ]; then
  osascript -e 'display alert "需要配置 API Key" message "请先配置 backend/.env 文件，填入 OPENAI_API_KEY 和 ANTHROPIC_API_KEY" buttons {"好的"}'
  open -e "$DIR/backend/.env.example"
  exit 1
fi

# 创建 uploads 目录
mkdir -p "$DIR/backend/uploads"

# 安装依赖（只有第一次需要时间）
echo "📦 检查依赖..."
cd "$DIR/backend" && npm install --silent 2>/dev/null
cd "$DIR/frontend" && npm install --silent 2>/dev/null

# 启动后端
echo "🚀 启动后端..."
cd "$DIR/backend" && node server.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "🌐 启动前端..."
cd "$DIR/frontend" && BROWSER=none npm start &
FRONTEND_PID=$!

# 等待前端启动
sleep 8

# 自动打开浏览器
open "http://localhost:3000"

# 显示通知
osascript -e 'display notification "诊所系统已启动！" with title "🏥 阿斯塔纳诊所" subtitle "点击浏览器查看"'

echo ""
echo "================================================"
echo "  🏥 诊所系统已启动！"
echo "  浏览器已自动打开 http://localhost:3000"
echo "  关闭此窗口即可停止系统"
echo "================================================"

# 保持运行，关闭窗口时停止服务
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '系统已关闭'" EXIT INT TERM
wait
