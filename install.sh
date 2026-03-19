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

# Install directory
INSTALL_DIR="${1:-$HOME/mercury-ach}"

if [ -d "$INSTALL_DIR" ]; then
  printf "${YELLOW}Directory $INSTALL_DIR already exists.${NC}\n"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  rm -rf "$INSTALL_DIR"
fi

# Clone
printf "${GREEN}Cloning repository...${NC}\n"
git clone --depth 1 https://github.com/CashQ/mercury.git "$INSTALL_DIR" 2>/dev/null

cd "$INSTALL_DIR"

# Install dependencies
printf "${GREEN}Installing dependencies...${NC}\n"
npm install --silent 2>/dev/null

# Install mercury-ach command
printf "${GREEN}Installing mercury-ach command...${NC}\n"
if [ -w /usr/local/bin ]; then
  ln -sf "$INSTALL_DIR/bin/mercury-ach" /usr/local/bin/mercury-ach
elif command -v sudo >/dev/null 2>&1; then
  sudo ln -sf "$INSTALL_DIR/bin/mercury-ach" /usr/local/bin/mercury-ach
else
  printf "${YELLOW}Could not install to /usr/local/bin. Add $INSTALL_DIR/bin to your PATH manually.${NC}\n"
fi

printf "\n"
printf "${GREEN}═══════════════════════════════════════${NC}\n"
printf "${GREEN}  Installation complete!${NC}\n"
printf "${GREEN}═══════════════════════════════════════${NC}\n"
printf "\n"
printf "  Installed to: ${CYAN}$INSTALL_DIR${NC}\n"
printf "\n"
printf "  To start:  ${CYAN}mercury-ach${NC}\n"
printf "  Then open: ${CYAN}http://localhost:3000${NC}\n"
printf "\n"
printf "  The app will guide you through API token setup.\n"
printf "\n"

# Ask to start now
read -p "Start now? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  printf "\n"
  mercury-ach
fi
