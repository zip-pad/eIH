#!/bin/bash

# eInformation Hub - Complete Startup Script
# This script starts both the backend server and frontend server

echo "🚀 Starting eInformation Hub..."
echo ""

# Color codes for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Backend already running on port 3001${NC}"
else
    echo -e "${BLUE}📦 Starting backend server...${NC}"
    cd server
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
fi

# Check if frontend is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Frontend already running on port 8000${NC}"
else
    echo -e "${BLUE}🌐 Starting frontend server...${NC}"
    cd UI
    python3 -m http.server 8000 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 eInformation Hub is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📚 Backend API:${NC}  http://localhost:3001"
echo -e "${BLUE}🌐 Frontend UI:${NC}  http://localhost:8000"
echo ""
echo -e "${YELLOW}👉 Open your browser to: http://localhost:8000${NC}"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers, run: ./stop-all.sh"
echo ""




