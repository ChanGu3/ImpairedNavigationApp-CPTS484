from db_setup import create_db
create_db.setup_theia_db()

from flask import Flask, jsonify
from flask_cors import CORS
from routes.api_routes import api_bp

app = Flask(__name__)

# CORS configuration - more permissive for development
CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:8081", "http://127.0.0.1:8081"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "Accept"],
         "supports_credentials": True,
         "expose_headers": ["Content-Type"],
         "max_age": 3600
     }})

app.secret_key = 'fake_key_seriously_its_fake'

@app.route('/')
def home():
    return jsonify({"message": "Hello from Python!", "status": "running"})

# routes - /api
app.register_blueprint(api_bp)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
    