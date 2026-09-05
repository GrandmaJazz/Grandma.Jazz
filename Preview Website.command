#!/bin/bash
# Double-click this file to preview the Grandma Jazz website locally.
# It starts the dev server and opens it in your browser.
cd "/Users/accorreya/Grandma.Jazz" || exit 1
echo "Starting the Grandma Jazz preview..."
echo "This window must stay open while you view the site."
echo "When you're done, close this window to stop the preview."
echo ""
# Open the browser once the server has had time to start.
( sleep 15 && open "http://localhost:3000" ) &
# Prefer bun if available, otherwise npm.
if command -v bun >/dev/null 2>&1; then
  bun run dev
else
  npm run dev
fi
