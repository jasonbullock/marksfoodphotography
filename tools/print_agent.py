#!/usr/bin/env python3
"""Sends queued tags to the studio's Zebra printers.

The API runs in the cloud and the printers sit on private studio addresses, so
the API cannot open a socket to them. It queues the label instead, and this - run
on any machine that is on the studio network - claims the label and prints it.

Nothing listens on a port here: the agent only makes outbound calls, so it needs
no firewall change and no fixed address of its own.

    export MARKS_API=https://marksfoodphotography-api.onrender.com
    export PRINT_AGENT_KEY=...        # must match the key set on the server
    python3 tools/print_agent.py

Stop it with Ctrl-C. To keep it running across reboots see the README section at
the foot of this file.
"""
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request

API = os.getenv("MARKS_API", "http://127.0.0.1:5057").rstrip("/")
KEY = os.getenv("PRINT_AGENT_KEY", "")
NAME = os.getenv("PRINT_AGENT_NAME", socket.gethostname())
# Long enough that an idle studio is not hammering the API, short enough that
# nobody standing at the printer wonders whether the button worked.
POLL_SECONDS = float(os.getenv("PRINT_AGENT_POLL", "3"))
CONNECT_TIMEOUT = float(os.getenv("PRINT_AGENT_TIMEOUT", "5"))


def log(message):
    print(f"{time.strftime('%H:%M:%S')} {message}", flush=True)


def call(path, payload):
    request = urllib.request.Request(
        f"{API}/api{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Print-Agent-Key": KEY,
            "X-Print-Agent-Name": NAME,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8") or "{}")


def send_to_printer(zpl, host, port):
    with socket.create_connection((host, int(port)), timeout=CONNECT_TIMEOUT) as printer:
        printer.sendall(zpl.encode("utf-8"))


def run_once():
    """Claim one label and print it. Returns True if there was work."""
    claimed = call("/print-jobs/claim", {})
    job = claimed.get("job")
    if not job:
        return False

    label = job.get("label") or job["id"]
    try:
        send_to_printer(job["zpl"], job["host"], job.get("port") or 9100)
    except OSError as error:
        log(f"failed  {label} -> {job['host']}: {error}")
        call(f"/print-jobs/{job['id']}/finish", {"ok": False, "error": str(error)})
        return True

    log(f"printed {label} -> {job.get('printerName') or job['host']}")
    call(f"/print-jobs/{job['id']}/finish", {"ok": True})
    return True


def main():
    if not KEY:
        sys.exit("PRINT_AGENT_KEY is not set. It must match the key on the server.")
    log(f"watching {API} as {NAME}")
    # A server that is down or a network that drops should not end the agent; it
    # is meant to be started once and left alone.
    while True:
        try:
            # Drain the queue before sleeping, so a burst of tags prints together.
            while run_once():
                pass
        except urllib.error.HTTPError as error:
            log(f"api {error.code}: {error.reason}")
            if error.code in (401, 403):
                sys.exit("The server rejected this agent's key.")
        except (urllib.error.URLError, OSError, ValueError) as error:
            log(f"cannot reach the api: {error}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("stopped")
