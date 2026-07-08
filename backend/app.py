from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes import api


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=Config.cors_origins())
    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def root():
        return jsonify({"name": "Marks Food Photography API", "status": "running"})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.FLASK_DEBUG,
    )
