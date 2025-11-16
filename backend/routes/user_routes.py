from flask import Blueprint, session
from services.database import database

user_bp = Blueprint(
    'user',           
    __name__,        
    url_prefix='/user'
)

@user_bp.before_request
def authorize():
    if(session.get("user_id") is None):
        return { "error": { "message": "not logged in" } }, 401
    
@user_bp.route("/")
def get_data():
    id = session.get("user_id")
    return database.get_user_data(id)