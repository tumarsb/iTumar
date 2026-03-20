#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🏥 启动阿斯塔纳诊所管理系统..."

# 检查 Node.js
if ! command -v node &>/dev/null; then
  osascript -e 'display alert "缺少 Node.js" message "请先安装 Node.js：https://nodejs.org" buttons {"好的"}' 2>/dev/null
  echo "❌ 未找到 Node.js，请先安装：https://nodejs.org"
  exit 1
fi

# 创建 uploads 目录
mkdir -p "$ROOT/backend/uploads"

# 如果 .env 不存在，从 .env.example 复制
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
fi

# 检查 Key 是否已填写（不是默认占位符就算填写了）
OPENAI_KEY=$(grep "OPENAI_API_KEY" "$ROOT/backend/.env" | cut -d'=' -f2 | tr -d ' ')
ANTHROPIC_KEY=$(grep "ANTHROPIC_API_KEY" "$ROOT/backend/.env" | cut -d'=' -f2 | tr -d ' ')

if [ "$OPENAI_KEY" = "your_openai_key_here" ] || [ -z "$OPENAI_KEY" ] || \
   [ "$ANTHROPIC_KEY" = "your_anthropic_key_here" ] || [ -z "$ANTHROPIC_KEY" ]; then
  echo ""
  echo "⚠️  需要配置 API Key，正在打开配置文件..."
  open -e "$ROOT/backend/.env"
  echo ""
  echo "请在打开的文件里填写："
  echo "  OPENAI_API_KEY=你的Key"
  echo "  ANTHROPIC_API_KEY=你的Key"
  echo ""
  echo "保存后重新运行此脚本"
  exit 1
fi

echo "✅ API Key 已配置"

# 安装依赖
echo "📦 检查依赖..."
cd "$ROOT/backend" && npm install --silent 2>/dev/null
cd "$ROOT/frontend" && npm install --silent 2>/dev/null

# 启动后端
echo "🚀 启动后端..."
cd "$ROOT/backend" && node server.js &
BACKEND_PID=$!
sleep 3

# 启动前端
echo "🌐 启动前端..."
cd "$ROOT/frontend" && BROWSER=none npm start &
FRONTEND_PID=$!
sleep 8

# 打开浏览器
open "http://localhost:3000" 2>/dev/null

# 通知
osascript -e 'display notification "诊所系统已启动！" with title "🏥 阿斯塔纳诊所"' 2>/dev/null

echo ""
echo "================================================"
echo "  🏥 诊所系统已启动！"
echo "  浏览器：http://localhost:3000"
echo "  医生：doctor / doctor123"
echo "  前台：nurse  / nurse123"
echo "  管理员：admin / admin123"
echo "================================================"
echo "  关闭此窗口即可停止系统"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '系统已关闭'" EXIT INT TERM
wait
