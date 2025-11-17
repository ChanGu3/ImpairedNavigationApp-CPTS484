import { UserDataType } from "@/contexts/UserContext";
import { hostroot } from "./hostname";
import { ActivityJSON, ConversationMessageJSON, CurrentTripJSON, EmergencyContactJSON, ErrorJSON, PastTripJSON, StatusJSON, SuccessJSON } from "./ResponseTypes";

export async function TryLogin(email: string, password: string): Promise<SuccessJSON&ErrorJSON> {

    try {
        const response = await fetch(`${hostroot}/api/auth/login`,
            {
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

export async function TryLogout(): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/auth/logout`,
            { 
                method: 'post',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

export async function GetSessionUserData(): Promise<UserDataType&ErrorJSON> {
    try {
        const resp = await fetch(`${hostroot}/api/user`, {
            method: 'get',
            credentials: "include",
        });
        
        if(!resp.ok) {
            return { error: { message: "could not get json data" } }
        }

        const data:any = await resp.json();

        return  data;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

export async function IsLoggedIn(): Promise<boolean> {
    const result = await GetSessionUserData();
    return !(result?.error)
}

/*
 * can update user info by adding any of the parameters 
*/
export async function UpdateUserAccount(email?: string, password?: string, firstname?: string, lastname?: string): Promise<SuccessJSON&ErrorJSON> {
    const data:any = {}
    if (email) { data.email = email }
    if (password) { data.password = password }
    if (firstname) { data.firstname = firstname }
    if (lastname) { data.lastname = lastname }

    try {
        const response = await fetch(`${hostroot}/api/user`,
            {
                method: 'put',
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * used by caretaker to get impaired status, impaired can also use this to
*/
export async function getUserStatusByID(user_id: number): Promise<ErrorJSON&StatusJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/${user_id}/status`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * status here means (active: on a trip, inactive: not on a trip)
 * must be a impaired user to use this and get status
*/
export async function getUserStatus(): Promise<ErrorJSON&StatusJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/status`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets caretaker data if impaired has one otherwise error
*/
export async function getUserCaretakerAsImpaired(): Promise<UserDataType&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/caretaker`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets impaired data if caretaker has one otherwise error
*/
export async function getUserImpairedAsCaretaker(): Promise<UserDataType&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/impaired`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * updates/adds the impaired users caretaker by adding them using their email and password
*/
export async function updateUserCaretakerAsImpaired(caretakerEmail: string, caretakerPassword: string): Promise<ErrorJSON&StatusJSON> {
    const data:any = {}
    if(caretakerEmail) { data.email = caretakerEmail }
    if(caretakerPassword) { data.password = caretakerPassword }

    try {
        const response = await fetch(`${hostroot}/api/user/caretaker`,
            { 
                method: 'put',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * deleted a caretaker from impaired otherwise error if none assigned already
*/
export async function deleteUserCaretakerAsImpaired(): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/impaired`,
            { 
                method: 'delete',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets emergency contacts if impaired otherwise error
*/
export async function getUserEmergencyContactsAsImpaired(): Promise<EmergencyContactJSON[]|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/emergency_contact`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets a single emergency contact if impaired otherwise error
*/
export async function getUserEmergencyContactAsImpaired(ec_id: number): Promise<EmergencyContactJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/emergency_contact/${ec_id}`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * adds an emergency contact to the impaired user
*/
export async function addUserEmergencyContactAsImpaired(contact_name: string, contact_tel: string): Promise<ErrorJSON&SuccessJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/emergency_contact`,
            { 
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    contact_name,
                    contact_tel
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * deletes a single emergency contact if it exists and is impaired otherwise error
*/
export async function deleteUserEmergencyContactAsImpaired(ec_id: number): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/emergency_contact/${ec_id}`,
            { 
                method: 'delete',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets the current trip if impaired otherwise error
*/
export async function getUserCurrentTripAsImpaired(): Promise<CurrentTripJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/current_trip`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}


/*
 * creates a current trip if impaired otherwise error
 * only one exists since a user can only be on one trip at a time
*/
export async function createUserCurrentTripAsImpaired(to_location: string, from_location: string): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/current_trip`,
            { 
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    to_location,
                    from_location
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets the current trip if impaired otherwise error
*/
export async function deleteUserCurrentTripAsImpaired(): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/current_trip`,
            { 
                method: 'delete',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}


/*
 * gets past trips if impaired otherwise error
*/
export async function getUserPastTripsAsImpaired(): Promise<PastTripJSON[]|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/past_trip`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * adds a past trip if impaired user otherwise error
*/
export async function addUserPastTripAsImpaired(destination_location: string): Promise<SuccessJSON|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/past_trip`,
            { 
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    destination_location
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets a past trip by its id if impaired user otherwise error
*/
export async function getUserPastTripAsImpaired(pt_id: number): Promise<PastTripJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/past_trip/${pt_id}`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}


/*
 * gets activities if impaired otherwise error
*/
export async function getUserActivitiesAsImpaired(): Promise<ActivityJSON[]|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/activity`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * adds a Activity if impaired user otherwise error
*/
export async function addUserActivityAsImpaired(notice_status:"Good"|"Okay"|"Bad", small_description: string): Promise<SuccessJSON|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/activity`,
            { 
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    notice_status,
                    small_description
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets a Activity by its id if impaired user otherwise error
*/
export async function getUserActivityAsImpaired(a_id: number): Promise<ActivityJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/activity/${a_id}`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * starts a conversation between a caretaker and impaired user. must not already exist before creation and must have the users pair 
*/
export async function startConversationBetweenExistingCaretakerAndImpairedPair(): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/caretaker_conversation`,
            { 
                method: 'post',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * stops a conversation between a caretaker and impaired user. must already exist before deletion and must have the users pair 
 * deletes the entire conversation including the messages
*/
export async function stopConversationBetweenExistingCaretakerAndImpairedPair(): Promise<SuccessJSON&ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/caretaker_conversation`,
            { 
                method: 'delete',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * gets all the messages in the current conversation error when no conversation exists or when empty messages
*/
export async function getConversationMessagesBetweenExistingCaretakerAndImpairedPair(): Promise<ConversationMessageJSON[]|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/caretaker_conversation/messages`,
            { 
                method: 'get',
                credentials: "include",
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}

/*
 * add a message in the current conversation error when no conversation exists
*/
export async function addConversationMessagesBetweenExistingCaretakerAndImpairedPair(msg: string): Promise<SuccessJSON|ErrorJSON> {
    try {
        const response = await fetch(`${hostroot}/api/user/caretaker_conversation/messages`,
            { 
                method: 'post',
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    msg
                }),
            }
        );
        const result = await response.json();
        return result;
    } 
    catch
    {
        return { error: { message:  "could not reach server" } }
    }
}
