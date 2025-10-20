#!/bin/bash

# eInformation Hub - Stop Script
# This script stops both the backend and frontend servers

echo "🛑 Stopping eInformation Hub..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop backend (port 3001)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping backend server...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Backend stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  Backend was not running${NC}"
fi

# Stop frontend (port 8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping frontend server...${NC}"
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Frontend stopped${NC}"
else
    echo -e "${YELLOW}ℹ️  Frontend was not running${NC}"
fi

echo ""
echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""




