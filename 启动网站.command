#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
/usr/bin/python3 scripts/site.py start
LAN_ADDRESS=$(/usr/sbin/ipconfig getifaddr en0 2>/dev/null)
if [ -n "$LAN_ADDRESS" ]; then
  printf '\n网站地址：http://%s:18081/\n' "$LAN_ADDRESS"
fi
