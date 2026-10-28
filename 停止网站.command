#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
/usr/bin/python3 scripts/site.py stop
