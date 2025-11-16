from flask import Blueprint, jsonify
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp

api_bp = Blueprint(
    'api',           
    __name__,        
    url_prefix='/api'
)

api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(user_bp)

@api_bp.route('/data')
def get_data():
    return jsonify({"data": ["Item 1", "Item 2", "Item 3"]})