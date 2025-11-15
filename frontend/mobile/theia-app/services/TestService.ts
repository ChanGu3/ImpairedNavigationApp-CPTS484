export async function getTestData():Promise<any> {

    try {
        const response = await fetch('http://localhost:5000/');
        const result = await response.json();
        return result;
    } 
    catch (error:any)
    {
        throw new Error(`Could Not Fetch Data ERROR: ${error.message}.`);
    }
}