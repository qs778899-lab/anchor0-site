#!/usr/bin/env python3
"""Start/stop/status for this checkout only; no global services or settings."""
from pathlib import Path
import argparse
import os
import signal
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / '.run'
PID = RUN / 'server.pid'
URL = 'http://127.0.0.1:18081/'

def running():
    if not PID.exists(): return None
    try:
        pid = int(PID.read_text())
        command = subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True).strip()
        return pid if str(ROOT / 'scripts/serve.py') in command else None
    except (ValueError,subprocess.CalledProcessError): return None

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['start','stop','status'])
args = parser.parse_args()
pid = running()
if args.action == 'stop':
    if pid: os.kill(pid,signal.SIGTERM)
    PID.unlink(missing_ok=True)
    print('Stopped.' if pid else 'Not running.')
elif args.action == 'status':
    print(f'Running (PID {pid}): {URL}' if pid else 'Not running.')
elif pid:
    print(f'Already running (PID {pid}): {URL}')
else:
    RUN.mkdir(exist_ok=True)
    with (RUN / 'server.log').open('ab') as log:
        child = subprocess.Popen([sys.executable,str(ROOT/'scripts/serve.py')], cwd=ROOT, stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
    PID.write_text(str(child.pid))
    for _ in range(40):
        if child.poll() is not None: raise SystemExit(f'Server failed; see {RUN / "server.log"}')
        try:
            with urllib.request.urlopen(URL,timeout=1) as response:
                if response.status == 200: break
        except Exception: time.sleep(.1)
    else: raise SystemExit('Server is not responding; see .run/server.log')
    print(f'Running (PID {child.pid}): {URL}')
