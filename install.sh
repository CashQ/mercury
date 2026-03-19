#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

printf "\n"
printf "${CYAN}═══════════════════════════════════════${NC}\n"
printf "${CYAN}  Mercury ACH Sender — Installer${NC}\n"
printf "${CYAN}═══════════════════════════════════════${NC}\n"
printf "\n"

# Check prerequisites
command -v node >/dev/null 2>&1 || { printf "${RED}Node.js is required. Install it from https://nodejs.org${NC}\n"; exit 1; }
command -v npm >/dev/null 2>&1 || { printf "${RED}npm is required. Install Node.js from https://nodejs.org${NC}\n"; exit 1; }
command -v git >/dev/null 2>&1 || { printf "${RED}git is required. Install it from https://git-scm.com${NC}\n"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  printf "${RED}Node.js 18+ is required (found $(node -v)). Update at https://nodejs.org${NC}\n"
  exit 1
fi

# Install to ./mercury-ach in current directory
INSTALL_DIR="$(pwd)/mercury-ach"

if [ -d "$INSTALL_DIR" ]; then
  printf "${YELLOW}Directory $INSTALL_DIR already exists.${NC}\n"
  printf "Overwrite? (y/N) "
  read -n 1 -r REPLY </dev/tty 2>/dev/null || REPLY="n"
  printf "\n"
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  rm -rf "$INSTALL_DIR"
fi

# Clone
printf "${GREEN}Cloning repository...${NC}\n"
git clone --depth 1 https://github.com/CashQ/mercury.git "$INSTALL_DIR"

cd "$INSTALL_DIR"

# Install dependencies
printf "${GREEN}Installing dependencies...${NC}\n"
npm install --silent

printf "\n"
printf "${GREEN}═══════════════════════════════════════${NC}\n"
printf "${GREEN}  Installation complete!${NC}\n"
printf "${GREEN}═══════════════════════════════════════${NC}\n"
printf "\n"
printf "  Installed to: ${CYAN}$INSTALL_DIR${NC}\n"
printf "\n"
printf "  To restart:  ${CYAN}$INSTALL_DIR/start${NC}\n"
printf "\n"

# Open browser after short delay (before server blocks)
PORT="${PORT:-3000}"
open_url() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1"
  elif command -v open >/dev/null 2>&1; then
    open "$1"
  fi
}
(sleep 2 && open_url "http://localhost:$PORT") >/dev/null 2>&1 &

# Auto-start server
printf "${GREEN}Starting Mercury ACH at http://localhost:${PORT}...${NC}\n"
printf "\n"
exec node server.js
