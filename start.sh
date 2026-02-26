#!/bin/sh
PORT=3001 node_modules/.bin/tsx demo/server/src/index.ts &
sleep 1
nginx -g 'daemon off;'
