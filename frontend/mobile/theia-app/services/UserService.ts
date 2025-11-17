import { hostroot } from "./hostname";

export async function TryLogin(email: string, password: string): Promise<any> {

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


export async function TryLogout(): Promise<any> {

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

export async function GetSessionUserData(): Promise<any> {
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