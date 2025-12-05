from flask import Blueprint, request, session
from services.database import database
from functools import wraps
import json

user_bp = Blueprint(
    'user',           
    __name__,        
    url_prefix='/user'
)

def check_if_user_has_caretaker_impaired_pair(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_type = (json.loads(database.get_user_data(session.get("user_id"))))["user_type"]
        
        if (user_type == 'impaired'):
            if( database.get_user_id_of_caretaker_if_session_user_is_their_impaired(session.get("user_id")) is None):
                return { "error": { "message": "user currently does not have an assigned caretaker please assign one before using this feature" } }
        elif (user_type == 'caretaker'):
            if( database.get_user_id_of_impaired_if_session_user_is_their_caretaker(session.get("user_id")) is None):
                return { "error": { "message": "user currently does not have an assigned impaired user please assign one before using this feature" } }
        
        return f(*args, **kwargs)
    return wrapper

def allow_access_if_caretaker(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_type = (json.loads(database.get_user_data(session.get("user_id"))))["user_type"]
        if (user_type != 'caretaker'):
            return { "error": { "message": "user must be a caretaker user to access this information" } }        
        return f(*args, **kwargs)
    return wrapper

def allow_access_if_impaired(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user_type = (json.loads(database.get_user_data(session.get("user_id"))))["user_type"]
        if (user_type != 'impaired'):
            return { "error": { "message": "user must be a impaired user to access this information" } }        
        return f(*args, **kwargs)
    return wrapper

# gets the users status by the id in the path only if they are that user or they are that users caretaker
@user_bp.get("<int:user_id>/status")
def get_user_status_by_id(user_id):
    if(session.get("user_id") is not None):
        if ( database.get_user_data(session.get("user_id"))["user_type"] == "caretaker" ):
            return { "error": { "message": "caretaker does not have a status since they dont go on trips" } },
        elif (session.get("user_id") == user_id  or database.get_user_id_of_impaired_if_session_user_is_their_caretaker(session.get("user_id")) == user_id ):
            if (database.is_impaired_user_on_trip(user_id)):
                return { "status": { "active" } }
            else:
                return { "status": { "inactive" } }
        
    return { "error": { "message": "cannot access status of user if they exist" } }

# makes sure user is logged in before accessing data
@user_bp.before_request
def authorize():
    # Allow OPTIONS requests (CORS preflight) without authentication
    if request.method == 'OPTIONS':
        return
    
    # blocks endpoint from following this before request
    if request.endpoint == "user.get_user_status_by_id":
        return
    
    if(session.get("user_id") is None):
        return { "error": { "message": "not logged in" } }, 401

# gets the current sessions user data -> (Checked In Insomnia)
@user_bp.get("/")
def get_data():
    id = session.get("user_id")
    return database.get_user_data(id)

# updates the current sessions user data -> (Checked In Insomnia)
@user_bp.put("/")
def update_data():
    data = request.get_json()
    dataList = []
    if("email" in data):
        dataList.append(("email", data["email"]))
    if("password" in data):
        dataList.append(("pswd", data["password"]))
    if("firstname" in data):
        dataList.append(("firstname", data["firstname"]))
    if("lastname" in data):
        dataList.append(("lastname", data["lastname"]))    
    
    if (len(dataList) <= 0):
        return { "error": { "message": "did not give any data to update user to the server" } }
            
    id = session.get("user_id")
    database.update_data_by_id_and_table(("id", id), 'users', dataList)
    return { "success": { "message": "updated user account" } }

# gets the current sessions users status only if they are a impaired user -> (Checked In Insomnia)
@user_bp.get("/status")
@allow_access_if_impaired
def get_user_status():
    if (database.is_impaired_user_on_trip(session["user_id"])):
        return { "status": "active"   }
    else:
        return { "status": "inactive" }

# gets a impaired caretaker user if they are a caretaker otherwise error if not caretaker or no set impaired user -> (Checked In Insomnia)
@user_bp.get("/caretaker")
@check_if_user_has_caretaker_impaired_pair
@allow_access_if_impaired
def get_caretaker_data():
    data = database.get_data_by_key_and_table([("impaired_user_id", session["user_id"])], "caretaker_info", ["caretaker_user_id"], True)
    caretaker_user_id = (json.loads(data))["caretaker_user_id"]
    return database.get_user_data(caretaker_user_id)
    
# adds or updates a caretaker on a  impaired user  -> (Checked In Insomnia)
@user_bp.put("/caretaker")
@allow_access_if_impaired
def update_caretaker_data():
    user_id = session.get("user_id")
    data = request.get_json()
    if("email" not in data or "password" not in data):
        return { "error": { "message": "error adding caretaker to account"}}
    
    caretaker_user_id = (json.loads(database.get_user_id_if_exists(data["email"], data["password"])))["id"]
    if (caretaker_user_id is None):
        return { "error": { "message": "error adding caretaker to account"}}
    
    caretaker_data = json.loads(database.get_user_data(caretaker_user_id))
    if (caretaker_data is None or caretaker_data["user_type"] != "caretaker"):
        return { "error": { "message": "error adding caretaker to account"}}
    
    if (database.get_user_id_of_caretaker_if_session_user_is_their_impaired(user_id) is None) :
        database.add_data_by_table("caretaker_info", [("impaired_user_id", user_id), ("caretaker_user_id", caretaker_user_id)])
    else:
        print("HerE")
        database.update_data_by_id_and_table(("impaired_user_id", user_id), "caretaker_info", [("caretaker_user_id", caretaker_user_id)])
    
    return { "success": { "message": "successfully added new caretaker" } }
    
# adds or updates a caretaker on a  impaired user -> (Checked In Insomnia)
@user_bp.delete("/caretaker")
@check_if_user_has_caretaker_impaired_pair
@allow_access_if_impaired
def delete_caretaker_data():
    user_id = session.get("user_id")
    database.delete_data_by_where_and_table([("impaired_user_id", user_id)],"caretaker_info")
    return { "success": { "message": "successfully deleted caretaker" } }

# gets a caretakers impaired user if they are a caretaker otherwise error if not caretaker or no set impaired user
@user_bp.get("/impaired")
@check_if_user_has_caretaker_impaired_pair
@allow_access_if_caretaker
def get_impaired_data():
    data = database.get_data_by_key_and_table([("caretaker_user_id", session["user_id"])], "caretaker_info", ["impaired_user_id"], True)
    impaired_user_id = (json.loads(data))["impaired_user_id"]
    return database.get_user_data(impaired_user_id)

# get all of the emergency contacts -> (Checked In Insomnia)
@user_bp.get("/emergency_contact")
@allow_access_if_impaired
def get_emergency_contacts():
    user_id = session.get("user_id")
    data = database.get_data_by_key_and_table([("impaired_user_id", user_id)], "emergency_contact", ["id", "contact_name", "contact_tel"], False)
    if(data is None):
        return { "error": { "message": "user has no emergency contacts"}}
    return data

# adds a emergency contact -> (Checked In Insomnia)
@user_bp.post("/emergency_contact")
@allow_access_if_impaired
def add_a_emergency_contact():
    data = request.get_json()
    if("contact_name" not in data or "contact_tel" not in data):
        return { "error": { "message": "must contain a json with contact_name and contact_tel to add a emergency contact"}}
    
    user_id = session.get("user_id")
    database.add_data_by_table("emergency_contact", [("impaired_user_id", user_id), ("contact_name", ("\'" + data["contact_name"] + "\'")), ("contact_tel", ("\'" + data["contact_tel"] + "\'"))])
    return { "success": { "message": "successfully added emergency contact" } }

# deletes a emergency contact -> (Checked In Insomnia)
@user_bp.delete("/emergency_contact/<int:ec_id>")
@allow_access_if_impaired
def delete_a_emergency_contact(ec_id: int):
    user_id = session.get("user_id")
    database.delete_data_by_where_and_table([("id", ec_id), ("impaired_user_id", user_id)], "emergency_contact")
    return { "success": { "message": "successfully deleted emergency contact" } }

# gets a emergency contact -> (Checked In Insomnia)
@user_bp.get("/emergency_contact/<int:ec_id>")
@allow_access_if_impaired
def get_a_emergency_contact(ec_id: int):
    user_id = session.get("user_id")
    data = database.get_data_by_key_and_table([("impaired_user_id", user_id), ("id", ec_id)], "emergency_contact", ["id", "contact_name", "contact_tel"], True)
    if(data is None):
        return { "error": { "message": "emergency contact doesn't exist"}}
    return data

# gets the current trip -> (Checked In Insomnia)
@user_bp.get("/current_trip")
def get_current_trip():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        impaired_user_id = user_id
    elif (user_type == 'caretaker'):
        impaired_user_id = database.get_user_id_of_impaired_if_session_user_is_their_caretaker(user_id)
        if (impaired_user_id is None):
             return { "error": { "message": "caretaker does not have a impaired user to look at their current trip"}}
    
    
    data = database.get_data_by_key_and_table([("impaired_user_id", impaired_user_id)], "current_trip", ["to_location", "from_location"], True)
    if(data is None):
        return { "error": { "message": "user is not on a trip"}}
    return data

# add a current trip if one doesn't already exist otherwise error -> (Checked In Insomnia)
@user_bp.route("/current_trip", methods=['OPTIONS'])
def current_trip_options():
    return '', 200

@user_bp.post("/current_trip")
@allow_access_if_impaired
def add_a_current_trip():
    data = request.get_json()
    if("to_location" not in data or "from_location" not in data):
        return { "error": { "message": "must contain a json with from_location and to_location to add a current trip"}}
    
    user_id = session.get("user_id")
    trip_data = database.get_data_by_key_and_table([("impaired_user_id", user_id)],"current_trip",["impaired_user_id"],True)
    
    if (trip_data is not None):
        return { "error": { "message": "the user is on a trip that is already in progress first complete the trip by removing it"}}
    
    database.add_data_by_table("current_trip", [("impaired_user_id", user_id), ("to_location", ("\'" + data["to_location"] + "\'")), ("from_location", ("\'" + data["from_location"] + "\'"))])
    return { "success": { "message": "successfully added current trip" } }

# deletes a current trip if one doesn't exist error -> (Checked In Insomnia)
@user_bp.delete("/current_trip")
@allow_access_if_impaired
def delete_a_current_trip():
    user_id = session.get("user_id")
    database.delete_data_by_where_and_table([("impaired_user_id", user_id)], "current_trip")
    return { "success": { "message": "successfully deleted current trip" } }

# get all past trips -> (Checked In Insomnia)
@user_bp.get("/past_trip")
def get_past_trips():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        impaired_user_id = user_id
    elif (user_type == 'caretaker'):
        impaired_user_id = database.get_user_id_of_impaired_if_session_user_is_their_caretaker(user_id)
        if (impaired_user_id is None):
             return { "error": { "message": "caretaker does not have a impaired user to look at their past trips"}}
    
    data = database.get_data_by_key_and_table([("impaired_user_id", impaired_user_id)], "past_trips", ["id", "destination_location", "complete_date"], False)
    if(data is None):
        return { "error": { "message": "user has no past trips"}}
    return data

# add a past trip -> (Checked In Insomnia)
@user_bp.post("/past_trip")
@allow_access_if_impaired
def add_a_past_trip():
    data = request.get_json()
    if("destination_location" not in data):
        return { "error": { "message": "must contain a json with destination_location to add a past trip"}}
    
    user_id = session.get("user_id")
    database.add_data_by_table("past_trips", [("impaired_user_id", user_id), ("destination_location", ("\'" + data["destination_location"] + "\'")), ("complete_date", "CURRENT_TIMESTAMP")])
    return { "success": { "message": "successfully added past trips" } }

# get a past trip by id -> (Checked In Insomnia)
@user_bp.get("/past_trip/<int:pt_id>")
def get_a_past_trip(pt_id: int):
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        impaired_user_id = user_id
    elif (user_type == 'caretaker'):
        impaired_user_id = database.get_user_id_of_impaired_if_session_user_is_their_caretaker(user_id)
        if (impaired_user_id is None):
             return { "error": { "message": "caretaker does not have a impaired user to look at their past trip"}}
    
    data = database.get_data_by_key_and_table([("impaired_user_id", impaired_user_id), ("id", pt_id)], "past_trips", ["id", "destination_location", "complete_date"], True)
    if(data is None):
        return { "error": { "message": "past trip doesn't exist"}}
    return data

# get all activities -> (Checked In Insomnia)
@user_bp.get("/activity")
def get_activities():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        impaired_user_id = user_id
    elif (user_type == 'caretaker'):
        impaired_user_id = database.get_user_id_of_impaired_if_session_user_is_their_caretaker(user_id)
        if (impaired_user_id is None):
             return { "error": { "message": "caretaker does not have a impaired user to look at their activities"}}
    
    data = database.get_data_by_key_and_table([("impaired_user_id", impaired_user_id)], "activity", ["id", "notice_status", "small_description", "notice_date"], False)
    if(data is None):
        return { "error": { "message": "user has no activities"}}
    return data

# add a activity -> (Checked In Insomnia)
# status must be Good, Okay, Bad
@user_bp.post("/activity")
@allow_access_if_impaired
def add_a_activity():
    data = request.get_json()
    if("notice_status" not in data or "small_description" not in data):
        return { "error": { "message": "must contain a json with notice_status and small_description to add a activity"}}
    
    if(data["notice_status"] != "Good" and data["notice_status"] != "Okay" and data["notice_status"] != "Bad"):
        return { "error": { "message": "notice_status must contain the value Good, Okay, or Bad "}}

    user_id = session.get("user_id")
    database.add_data_by_table("activity", [("impaired_user_id", user_id), ("notice_status", ("\'" + data["notice_status"] + "\'")), ("small_description", ("\'" + data["small_description"] + "\'")), ("notice_date", "CURRENT_TIMESTAMP")])
    return { "success": { "message": "successfully added activity" } }

# get a activity by id -> (Checked In Insomnia)
@user_bp.get("/activity/<int:a_id>")
@allow_access_if_impaired
def get_a_activity(a_id: int):
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        impaired_user_id = user_id
    elif (user_type == 'caretaker'):
        impaired_user_id = database.get_user_id_of_impaired_if_session_user_is_their_caretaker(user_id)
        if (impaired_user_id is None):
             return { "error": { "message": "caretaker does not have a impaired user to look at their activity"}}
    
    data = database.get_data_by_key_and_table([("impaired_user_id", impaired_user_id), ("id", a_id)], "activity", ["id", "notice_status", "small_description", "notice_date"], True)
    if(data is None):
        return { "error": { "message": "activity doesn't exist"}}
    return data

# deletes a conversation -> (Checked In Insomnia)
@user_bp.delete("/caretaker_conversation")
@check_if_user_has_caretaker_impaired_pair
def remove_current_conversation():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
        
    if (user_type == 'impaired'):
        database.delete_data_by_where_and_table([("impaired_user_id", user_id)], "current_caretaker_conversation")
    elif (user_type == 'caretaker'):
        database.delete_data_by_where_and_table([("caretaker_user_id", user_id)], "current_caretaker_conversation")
   
    return { "success": { "message": "successfully removed conversation" } }

# creates a conversation -> (Checked In Insomnia)
@user_bp.post("/caretaker_conversation")
@check_if_user_has_caretaker_impaired_pair
def create_current_conversation():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
        
    if (user_type == 'impaired'):
        data = database.get_data_by_key_and_table([("impaired_user_id", user_id)], "caretaker_info", ["caretaker_user_id"], True)
        database.add_data_by_table("current_caretaker_conversation", [("caretaker_user_id", (json.loads(data))["caretaker_user_id"]), ("impaired_user_id", user_id)])
    elif (user_type == 'caretaker'):
        data = database.get_data_by_key_and_table([("caretaker_user_id", user_id)], "caretaker_info", ["impaired_user_id"], True)
        database.add_data_by_table("current_caretaker_conversation", [("caretaker_user_id", user_id), ("impaired_user_id", (json.loads(data))["impaired_user_id"])])
   
    return { "success": { "message": "successfully added conversation" } }

# gets all messages of conversation -> (Checked In Insomnia)
# use user type to detect which person is doing the messaging
@user_bp.get("/caretaker_conversation/messages")
@check_if_user_has_caretaker_impaired_pair
def get_conversation_messages():
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    convo_data = None
    if (user_type == 'impaired'):
        convo_data = database.get_data_by_key_and_table([("impaired_user_id", user_id)], "current_caretaker_conversation", ["id"], True)
    elif (user_type == 'caretaker'):
        convo_data = database.get_data_by_key_and_table([("caretaker_user_id", user_id)], "current_caretaker_conversation", ["id"], True)
    
    if(convo_data is None):
        return { "error": { "message": "conversation between users has not been created"}}
    
    data = database.get_data_by_key_and_table([("ccc_id", (json.loads(convo_data))["id"])], "current_caretaker_conversation_messages", ["msg_ordered_number", "user_type", "msg"], False)
    if(data is None):
        return { "error": { "message": "user has no messages in existing current conversation"}}
    return data

# adds a message to conversation -> (Checked In Insomnia)
@user_bp.post("/caretaker_conversation/messages")
@check_if_user_has_caretaker_impaired_pair
def add_message_to_conversation():
    data = request.get_json()
    if("msg" not in data):
        return { "error": { "message": "must contain a json with msg to add a conversation message"}}
    
    user_id = session.get("user_id")
    user_type = (json.loads(database.get_user_data(user_id)))["user_type"]
    
    if (user_type == 'impaired'):
        convo_data = database.get_data_by_key_and_table([("impaired_user_id", user_id)],"current_caretaker_conversation",["id"],True)
        database.add_conversation_msg((json.loads(convo_data))["id"], user_type,  data["msg"])
    elif (user_type == 'caretaker'):
        convo_data = database.get_data_by_key_and_table([("caretaker_user_id", user_id)],"current_caretaker_conversation",["id"],True)
        database.add_conversation_msg((json.loads(convo_data))["id"], user_type, data["msg"])
   
    return { "success": { "message": "successfully added conversation" } }
