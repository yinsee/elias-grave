#!/bin/sh
# Boss fight bots, headless (tests/bossbot.html). Needs a static server on PORT (default 8779) in the repo root.
#   sh tools/bossbot.sh pier 1 varied [seed] [extra query, e.g. &view3d]
# boss: street | pier; diff: 0 Easy .. 3 Wicked; bot: jab | varied. Prints the result line (the page title).
BOSS=${1:-pier}; DIFF=${2:-1}; BOT=${3:-jab}; SEED=${4:-1}; EXTRA=${5:-}; PORT=${PORT:-8779}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=1200000 --dump-dom \
  "http://localhost:$PORT/tests/bossbot.html?boss=$BOSS&diff=$DIFF&bot=$BOT&seed=$SEED$EXTRA&v=$(date +%s)$$" 2>/dev/null | grep -o 'BOSSBOT boss=[^<]*' | head -1
