# NOTE: If you need to reset the db just delete the db file in data and run the app.py again

from pathlib import Path
import sqlite3
file_root_path = Path(__file__).parent

def setup_theia_db ():
    db_path = file_root_path.parent / "data" / "theia_db.db"
    
    # create tables if database doesn't exist
    sql_tables_path = file_root_path / "tables.sql"
    sql_tables_script = sql_tables_path.read_text()
    if(not db_path.exists()):
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.executescript(sql_tables_script)
        
        insert_user_query = """
            INSERT INTO users (email, pswd, firstname, lastname, user_type) 
            VALUES (?, ?, ?, ?, ?)
        """
        
        cursor.execute(insert_user_query, ('janedoe@fake.com', 'password', 'Jane', 'Doe', 'impaired'))
        cursor.execute(insert_user_query, ('philjonas@fake.com', 'password', 'Phil', 'Jonas', 'caretaker'))
        
        # Add emergency contact for Jane Doe
        insert_emergency_contact_query = """
            INSERT INTO emergency_contact (impaired_user_id, contact_name, contact_tel)
            VALUES (?, ?, ?)
        """
        cursor.execute(insert_emergency_contact_query, (1, 'Sarah Johnson', '555-123-4567'))
        
        cursor.close()
        #insert_past_trip_query = """
        #    INSERT INTO past_trips(impaired_user_id, destination_location, complete_date)
        #    VALUES (?, ?, ?)
        #"""

        conn.commit()
        conn.close()