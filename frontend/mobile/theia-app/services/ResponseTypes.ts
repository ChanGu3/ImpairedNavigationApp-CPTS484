export type ErrorJSON = {
    error?: { message: string }
}

export type SuccessJSON = {
    success?: { message: string }
}

export type StatusJSON = {
    status?: "active" | "inactive"
}

export type EmergencyContactJSON = {
    id?: number,
    contact_name?: string,
    contact_tel?: string    
}


export type CurrentTripJSON = {
    to_location?: string,
    from_location?: string  
}

/* 
 * To turn complete date into date do new Date(complete_date) should get you
 * Date object in javascript for stuff like date formatting etc.
*/
export type PastTripJSON = {
    id?: number,
    destination_location?: string,
    complete_date?: string,
}

/*
 * notice_date is the same as complete_date in PastTripJSON
*/
export type ActivityJSON = {
    id?: number,
    notice_status?: "Good" | "Okay" | "Bad",
    small_description?: string,
    notice_date?: string,
}

/*
 * because a conversation is only between impaired and caretaker you can find the difference 
 * between sender and receiver by using the user_type in the message on both sides of conversation.
*/
export type ConversationMessageJSON = {
    msg_ordered_number?: string,
    user_type?: string,
    msg?: string
}
