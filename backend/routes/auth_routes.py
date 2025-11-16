from flask import Blueprint, request, session
from services.database import database
import json

auth_bp = Blueprint(
    'auth',           
    __name__,        
    url_prefix='/auth'
)

@auth_bp.post("/login")
def login():
    email = request.form.get("email")
    password = request.form.get("password")
    
    row_data = database.get_user_id_if_exists(email, password)
    if ( row_data is None):
        return { "error": { "message": "credentials were incorrect" } }
    
    session["user_id"] = json.loads(row_data)["id"]
    return { "success": { "message": "successfully logged in" } }

@auth_bp.post("/logout")
def logout():
    session.clear()
    return { "success": { "message": "successfully logged out" } }