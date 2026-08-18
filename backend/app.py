import os
import threading
import time

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes import api, refresh_topco_source_linked_products, source_refresh_client_configs


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

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


def _source_refresh_worker():
    last_runs = {}
    # Give Flask startup a moment before the first background Airtable/sheet read.
    time.sleep(10)
    while True:
        try:
            now = time.monotonic()
            for refresh_config in source_refresh_client_configs():
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
        except Exception as exc:  # pragma: no cover - defensive background logging
            app.logger.warning("Source-linked Product refresh failed: %s", exc)
        time.sleep(60)


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
