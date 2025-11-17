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
            return json.dumps( [dict(data_item) for data_item in data]) 
        else: 
            return json.dumps( dict(data) ) 
        
    @staticmethod
    def get_user_data(id: int):
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT id, email, firstname, lastname, user_type 
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
    # assuming only one caretaker and impaired users pair
    #
    # id: caretakers id
    #
    @staticmethod
    def get_user_id_of_impaired_if_session_user_is_their_caretaker(id: int) -> int|None:
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT impaired_user_id
            FROM caretaker_info
            WHERE caretaker_user_id = ?
        """, (id,))
        
        fetched = cursor.fetchone()
        if(fetched is not None):
            impaired_user_id = (fetched)["impaired_user_id"]
        else:
            impaired_user_id = None
        
        cursor.close()
        db_conn.close()
        
        return impaired_user_id
    
    #
    # assuming only one caretaker and impaired users pair
    #
    # id: impaired id
    #
    @staticmethod
    def get_user_id_of_caretaker_if_session_user_is_their_impaired(id: int) -> int|None:
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT caretaker_user_id
            FROM caretaker_info
            WHERE impaired_user_id = ?
        """, (id,))
        
        fetched = cursor.fetchone()
        if(fetched is not None):
            caretaker_user_id = (fetched)["caretaker_user_id"]
        else:
            caretaker_user_id = None
            
        cursor.close()
        db_conn.close()
        
        return caretaker_user_id
    
    # assuming only one caretaker and user pair
    #
    # id: impaired id
    #
    @staticmethod
    def is_impaired_user_on_trip(id: int) -> bool:
        db_conn = sqlite3.connect(db_path)
        cursor = db_conn.cursor()
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM current_trip
                WHERE impaired_user_id = ?
            )
        """, (id,))
        
        is_on_trip = bool((cursor.fetchone())[0])
        cursor.close()
        db_conn.close()
        
        return is_on_trip
    
        #
    
    # columns: list[tuple[name:str, value:any]]
    #
    @staticmethod
    def add_conversation_msg(ccc_id, user_type, msg) ->  bool:        
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()        
        
        execute_script = f"""
            INSERT INTO current_caretaker_conversation_messages (ccc_id, msg_ordered_number, user_type, msg)
            VALUES ({ccc_id}, (
                SELECT (COALESCE(MAX(msg_ordered_number), 0) + 1)
                FROM current_caretaker_conversation_messages
                WHERE ccc_id = {ccc_id} 
            ), '{user_type}', '{msg}')
        """
        
        print(execute_script)
        cursor.execute(execute_script)
        
        db_conn.commit()
        cursor.close()
        db_conn.close()
        
        return True
    
    #
    # columns: list[tuple[name:str, value:any]]
    #
    @staticmethod
    def update_data_by_id_and_table(key: tuple[str,any], tablename: str, columns: list[tuple[str,any]]) ->  bool:
        
        if columns == []:
            return False
        
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()        
        
        execute_script = f"""
            UPDATE {tablename}
            SET 
        """
        update_values = ()
        
        for col in columns:
            execute_script += f"""
                {col[0]} = ?
            """
            update_values += (col[1],)
        
        
        if(update_values != ()):
            execute_script = execute_script + f"""
                WHERE {key[0]} = ?
            """ 
            update_values += (key[1],)
            
            cursor.execute(execute_script, update_values)
            db_conn.commit()
            
        cursor.close()
        db_conn.close()
        
        return True
    
        #
    
    #
    # columns: list[tuple[name:str, value:any]]
    #
    @staticmethod
    def add_data_by_table(tablename: str, columns: list[tuple[str,any]]) ->  bool:
        if len(columns) <= 0:
            return False
        
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()        
        
        execute_script = f"""
            INSERT INTO {tablename} (
        """
        
        first_check = True
        for col in columns:
            if (first_check):
                execute_script += f"""
                    {col[0]}
                """
                first_check = False
            else:
                execute_script += f"""
                    , {col[0]}
                """
        execute_script += """
            ) VALUES (
        """
        
        first_check = True
        for col in columns:
            if (first_check):
                execute_script += f"""
                    {col[1]}
                """
                first_check = False
            else:
                execute_script += f"""
                , {col[1]}
                """
        execute_script += """
            )
        """
        
        print(execute_script)
        cursor.execute(execute_script)
        
        db_conn.commit()
        cursor.close()
        db_conn.close()
        
        return True
    
    #
    # where: list[tuple[name:str, value:any]]
    #
    @staticmethod
    def delete_data_by_where_and_table(where: list[tuple[str,any]], tablename: str) -> bool:
        if len(where) <= 0:
            return False
        
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()        
        
        execute_script = f"""
            DELETE FROM {tablename}
            WHERE 
        """
        
        delete_values = ()
        first_check = True
        for w in where:
            if (first_check):
                execute_script += f"""
                    {w[0]} = ?
                """
                first_check = False
            else:
                execute_script += f"""
                    AND {w[0]} = ?
                """
            delete_values += (w[1],)
        
        cursor.execute(execute_script, delete_values) 
        
        db_conn.commit()
        cursor.close()
        db_conn.close()
        
        return True
    
    
    #
    # where: list[tuple[name:str,value:any]]
    # columns: list[(name:str, value:any)]
    # isSingle: true when only getting one row
    #
    @staticmethod
    def get_data_by_key_and_table(where: list[tuple[str,any]], tablename: str, columns: list[str], isSingle: bool = True):
        
        if len(columns) <= 0:
            return None
        
        db_conn = sqlite3.connect(db_path)
        db_conn.row_factory = sqlite3.Row
        cursor = db_conn.cursor()        
        
        execute_script = f"""
            SELECT
        """
        
        first_check = True
        for col in columns:
            if (first_check):
                execute_script += f"""
                    {col}
                """
                first_check = False
            else:
                execute_script += f"""
                    , {col}
                """
        
        execute_script = execute_script + f"""
            FROM {tablename}
            WHERE
        """
         
        where_values = ()
        first_check = True
        for w in where:
            if (first_check):
                execute_script += f"""
                    {w[0]} = ?
                """
                first_check = False
            else:
                execute_script += f"""
                    AND {w[0]} = ?
                """
            where_values += (w[1],)
         
        user_data = None
        print(execute_script)
        print(where_values)
        cursor.execute(execute_script, where_values)
        if (isSingle):
            user_data = cursor.fetchone()
        else:
            user_data = cursor.fetchall()
            if user_data == []:
                return None
        
        cursor.close()
        db_conn.close()
        
        
        return database.__create_json(user_data)
        
        