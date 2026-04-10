#!/bin/bash
# LTspice Workbench — one-command setup for macOS
# Run this in Terminal on your Mac:
#   bash setup-workbench.sh
# Then open: http://localhost:5174/workbench

set -e

REPO_URL="https://github.com/aidan-analog/pst-nlm"
BRANCH="claude/ltspice-agent-api-DeMKp"
DIR="$HOME/pst-nlm"
LTSPICE_SERVER_DIR="$DIR/ltspice-server"

echo ""
echo "=== LTspice Workbench Setup ==="
echo ""

# ── 1. Check for Node.js ────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Download it from https://nodejs.org and re-run this script."
  exit 1
fi
echo "✓ Node.js $(node --version)"

# ── 2. Check for git ────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "ERROR: git is not installed."
  echo "Install Xcode Command Line Tools: xcode-select --install"
  exit 1
fi
echo "✓ git $(git --version | awk '{print $3}')"

# ── 3. Clone or update the repo ─────────────────────────────────────────────
if [ -d "$DIR/.git" ]; then
  echo "→ Repo already exists, pulling latest..."
  git -C "$DIR" fetch origin
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull origin "$BRANCH"
else
  echo "→ Cloning repo to $DIR ..."
  git clone --branch "$BRANCH" "$REPO_URL" "$DIR"
fi
echo "✓ Repo ready at $DIR"

# ── 4. Check LTspice is installed ───────────────────────────────────────────
LTSPICE_BIN=""
for path in \
  "/Applications/LTspice.app/Contents/MacOS/LTspice" \
  "/Applications/LTspice XVII.app/Contents/MacOS/LTspice XVII" \
  "/Applications/LTspice 24.app/Contents/MacOS/LTspice 24"; do
  if [ -f "$path" ]; then
    LTSPICE_BIN="$path"
    break
  fi
done

if [ -z "$LTSPICE_BIN" ]; then
  echo "WARNING: Could not find LTspice. Simulations will fail."
  echo "  Install LTspice from https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html"
  LTSPICE_BIN="/Applications/LTspice.app/Contents/MacOS/LTspice"
else
  echo "✓ LTspice found: $LTSPICE_BIN"
fi

# ── 5. Write .env ───────────────────────────────────────────────────────────
ENV_FILE="$DIR/.env"

if grep -q "your_api_key_here" "$ENV_FILE" 2>/dev/null; then
  echo ""
  echo "→ Enter your Anthropic API key (from console.anthropic.com):"
  read -r -p "  API key: " API_KEY
  if [ -z "$API_KEY" ]; then
    echo "WARNING: No API key entered. Add it to $ENV_FILE manually."
    API_KEY="your_api_key_here"
  fi
else
  API_KEY=$(grep ANTHROPIC_API_KEY "$ENV_FILE" | cut -d= -f2)
  echo "✓ API key already set"
fi

cat > "$ENV_FILE" <<EOF
ANTHROPIC_API_KEY=$API_KEY
LTSPICE_SERVER_URL=http://localhost:8765
LTSPICE_BIN=$LTSPICE_BIN
EOF
echo "✓ .env written"

# ── 6. Install ltspice-server dependencies ──────────────────────────────────
echo "→ Installing ltspice-server dependencies..."
cd "$LTSPICE_SERVER_DIR"
npm install --silent
echo "✓ ltspice-server ready"

# ── 7. Install main project dependencies ────────────────────────────────────
echo "→ Installing workbench dependencies..."
cd "$DIR"
npm install --silent
echo "✓ workbench ready"

# ── 8. Start both servers ───────────────────────────────────────────────────
echo ""
echo "=== Starting servers ==="
echo ""
echo "  LTspice server  → http://localhost:8765"
echo "  Workbench API   → http://localhost:3002"
echo "  Workbench UI    → http://localhost:5174/workbench"
echo ""
echo "Press Ctrl+C to stop."
echo ""

# Start LTspice server in background
cd "$LTSPICE_SERVER_DIR"
LTSPICE_BIN="$LTSPICE_BIN" node server.js &
LTSPICE_PID=$!

sleep 1

# Verify LTspice server started
if ! kill -0 "$LTSPICE_PID" 2>/dev/null; then
  echo "ERROR: LTspice server failed to start."
  exit 1
fi
echo "✓ LTspice server running (PID $LTSPICE_PID)"

# Start workbench (API + Vite) in foreground
cd "$DIR"
LTSPICE_BIN="$LTSPICE_BIN" npm run workbench:dev

# Cleanup on exit
kill "$LTSPICE_PID" 2>/dev/null
