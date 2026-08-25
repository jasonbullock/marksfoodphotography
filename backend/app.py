import os
import threading
import time

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes import (
    api,
    invalidate_reference_cache,
    refresh_topco_source_linked_products,
    source_refresh_client_configs,
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    # The table cache is process-global. A fresh app means a fresh cache, which
    # matters most in tests: without it one test's mocked records are served to
    # the next.
    invalidate_reference_cache()

    CORS(app, origins=Config.cors_origins(), supports_credentials=True)
    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def root():
        return jsonify({"name": "Marks Food Photography API", "status": "running"})

    return app


_source_refresh_thread_started = False


def _should_start_source_refresh_worker():
    if not Config.TOPCO_SOURCE_REFRESH_ENABLED:
        return False
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        return True
    return not Config.FLASK_DEBUG


# Reading the Clients table to ask "is it time yet" cost one Airtable call a
# minute - roughly 43,000 a month - while the work it gates runs every ten. The
# schedule is re-read on the cadence the work actually happens, and the loop
# sleeps until something is due rather than waking every minute to find nothing.
SOURCE_REFRESH_CONFIG_MAX_TTL_SECONDS = 300
SOURCE_REFRESH_MIN_SLEEP_SECONDS = 30
SOURCE_REFRESH_MAX_SLEEP_SECONDS = 300


def _next_source_refresh_sleep(configs, last_runs, now):
    """Seconds until the earliest client is due, clamped to a sane window."""
    if not configs:
        return SOURCE_REFRESH_MAX_SLEEP_SECONDS
    waits = []
    for config in configs:
        client_id = config.get("clientId")
        if not client_id:
            continue
        interval = config.get("intervalSeconds") or 300
        waits.append(interval - (now - last_runs.get(client_id, 0)))
    if not waits:
        return SOURCE_REFRESH_MAX_SLEEP_SECONDS
    return max(SOURCE_REFRESH_MIN_SLEEP_SECONDS, min(SOURCE_REFRESH_MAX_SLEEP_SECONDS, min(waits)))


def _source_refresh_worker():
    last_runs = {}
    configs, configs_read_at = [], 0.0
    # Give Flask startup a moment before the first background Airtable/sheet read.
    time.sleep(10)
    while True:
        try:
            now = time.monotonic()
            # The schedule lives in Airtable, so re-reading it is itself an API
            # call. Refresh it no more often than the shortest interval it names.
            # Capped so an edit on the Clients page takes effect within minutes,
            # rather than waiting out the longest interval it configures.
            config_ttl = min(
                SOURCE_REFRESH_CONFIG_MAX_TTL_SECONDS,
                min([c.get("intervalSeconds") or 300 for c in configs], default=300),
            )
            if not configs or now - configs_read_at >= config_ttl:
                configs = source_refresh_client_configs()
                configs_read_at = now
            for refresh_config in configs:
                client_id = refresh_config.get("clientId")
                interval = refresh_config.get("intervalSeconds") or 300
                if not client_id or now - last_runs.get(client_id, 0) < interval:
                    continue
                if refresh_config.get("provider") == "topco":
                    refresh_topco_source_linked_products(
                        client_id,
                        limit=refresh_config.get("limit") or 100,
                        enforce_permissions=False,
                    )
                    last_runs[client_id] = now
            sleep_for = _next_source_refresh_sleep(configs, last_runs, time.monotonic())
        except Exception as exc:  # pragma: no cover - defensive background logging
            app.logger.warning("Source-linked Product refresh failed: %s", exc)
            sleep_for = SOURCE_REFRESH_MAX_SLEEP_SECONDS
        time.sleep(sleep_for)


def start_source_refresh_worker():
    global _source_refresh_thread_started
    if _source_refresh_thread_started or not _should_start_source_refresh_worker():
        return
    _source_refresh_thread_started = True
    thread = threading.Thread(target=_source_refresh_worker, name="topco-source-refresh", daemon=True)
    thread.start()


app = create_app()
start_source_refresh_worker()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.FLASK_DEBUG,
    )
