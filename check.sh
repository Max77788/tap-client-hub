#!/bin/bash
cd /home/max/projects/tap-client-hub
# Quick type check 
echo "Running type check..."
npx tsc --noEmit --pretty 2>&1 | grep -E "time/page|use-clients|Error" | head -30
echo "--- Type check done ---"