#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Mercury ACH Sender — Installer${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required. Install it from https://nodejs.org${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required. Install Node.js from https://nodejs.org${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}git is required. Install it from https://git-scm.com${NC}"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ is required (found v$(node -v)). Update at https://nodejs.org${NC}"
  exit 1
fi

# Install directory
INSTALL_DIR="${1:-$HOME/mercury-ach}"

if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Directory $INSTALL_DIR already exists.${NC}"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  rm -rf "$INSTALL_DIR"
fi

# Clone
echo -e "${GREEN}Cloning repository...${NC}"
git clone --depth 1 https://github.com/CashQ/mercury.git "$INSTALL_DIR" 2>/dev/null
cd "$INSTALL_DIR"

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install --silent 2>/dev/null

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "  Installed to: ${CYAN}$INSTALL_DIR${NC}"
echo ""
echo -e "  To start:  ${CYAN}cd $INSTALL_DIR && npm start${NC}"
echo -e "  Then open: ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "  The app will guide you through API token setup."
echo ""

# Ask to start now
read -p "Start the server now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  echo ""
  npm start
fi
