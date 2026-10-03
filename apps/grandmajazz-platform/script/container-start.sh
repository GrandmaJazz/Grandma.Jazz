#!/bin/sh
set -eu
mkdir -p /app/uploads/events /app/uploads/garments /app/.pm2
chown -R node:node /app/uploads /app/.pm2
exec gosu node /app/node_modules/.bin/pm2-runtime /app/ecosystem.config.cjs
