CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    pswd TEXT NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('impaired', 'caretaker'))
);

CREATE TABLE caretaker_info (
    impaired_user_id INTEGER PRIMARY KEY NOT NULL,
    caretaker_user_id INTEGER KEY NOT NULL,
    FOREIGN KEY(caretaker_user_id) REFERENCES users(id) ON DELETE CASCADE, 
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE emergency_contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    impaired_user_id INTEGER NOT NULL,
    contact_name TEXT NOT NULL,
    contact_tel TEXT NOT NULL,
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE current_trip (
    impaired_user_id INTEGER PRIMARY KEY NOT NULL,
    to_location TEXT NOT NULL,
    from_location TEXT NOT NULL,
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE past_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    impaired_user_id INTEGER NOT NULL,
    destination_location TEXT NOT NULL,
    complete_date TIMESTAMPTZ NOT NULL,
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    impaired_user_id INTEGER NOT NULL,
    notice_status TEXT NOT NULL CHECK (notice_status IN ('Good', 'Okay', 'Bad')), 
    small_description TEXT NOT NULL,
    notice_date TIMESTAMPTZ NOT NULL ,
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE current_caretaker_conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    caretaker_user_id INTEGER NOT NULL,
    impaired_user_id INTEGER UNIQUE NOT NULL,
    FOREIGN KEY(caretaker_user_id) REFERENCES users(id) ON DELETE CASCADE, 
    FOREIGN KEY(impaired_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE current_caretaker_conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    ccc_id INTEGER KEY NOT NULL,
    msg_ordered_number INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('impaired', 'caretaker')),
    msg TEXT NOT NULL,
    FOREIGN KEY(ccc_id) REFERENCES current_caretaker_conversation(id) ON DELETE CASCADE
);
