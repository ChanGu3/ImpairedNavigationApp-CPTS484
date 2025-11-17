from pathlib import Path
import sqlite3
import json
db_path = Path(__file__).parent.parent / "data" / "theia_db.db"

class database :

    #
    # returns none when none otherwise a json of rows or row if singular
    #
    @staticmethod
    def __create_json(data):
        if (data is None):
            return None
        elif (isinstance(data, list)):
            print("HERE")
            return json.dumps( (dict(data_item) for data_item in data))
        else:
            return json.dumps( dict(data) )
        
    @staticmethod
    def get_user_data(id: int):
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT email, firstname, lastname, user_type 
            FROM users
            WHERE id = ?
        """, (id,))
        
        user_data = cursor.fetchone()
        cursor.close()
        db_conn.close()
        
        return database.__create_json(user_data)
    
    @staticmethod
    def get_user_id_if_exists(email: str, password: str):
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT id
            FROM users
            WHERE email = ? AND pswd = ?
        """, (email.lower(), password))
        
        user_id = cursor.fetchone()
        cursor.close()
        db_conn.close()
        
        return database.__create_json(user_id)
    
    

# 
# 
#    SELECT (COALESCE(MAX(msg_ordered_number), 0) + 1)
#    INTO NEW.msg_ordered_number
#    FROM current_caretaker_conversation_messages
#    WHERE ccc_id = NEW.ccc_id 
#
#        
        
        