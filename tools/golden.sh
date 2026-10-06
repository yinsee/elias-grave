#!/bin/sh
# The golden autotests (tests/golden.md), headless: prints each URL's page title (state, buf and l3 hashes).
# Needs a static server on PORT (default 8779) in the repo root.
PORT=${PORT:-8779}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for q in "autotest=demo&frames=1200" "autotest=boss&frames=1800" "autotest=demo&frames=1200&view3d" "autotest=boss&frames=1800&view3d"; do
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=600000 --dump-dom \
    "http://localhost:$PORT/index.html?$q&v=$(date +%s)" 2>/dev/null | grep -o '<title>[^<]*' | head -1
done
