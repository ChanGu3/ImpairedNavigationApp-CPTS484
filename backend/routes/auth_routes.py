from flask import Blueprint, request, session, g
from services.database import database
import json

auth_bp = Blueprint(
    'auth',           
    __name__,        
    url_prefix='/auth'
)

@auth_bp.after_request
def after_request(response):
    if g.get("user_id") is not None:
        ""
    return response

@auth_bp.post("/login")
def login():
    data_json = request.get_json();
    
    row_data = database.get_user_id_if_exists(data_json['email'], data_json['password'])
    if ( row_data is None):
        return { "error": { "message": "credentials were incorrect" } }
    
    session["user_id"] = json.loads(row_data)["id"]
    return { "success": { "message": "successfully logged in" } }

@auth_bp.post("/logout")
def logout():
    g.user_id = session["user_id"];
    session.clear()
    return { "success": { "message": "successfully logged out" } }

