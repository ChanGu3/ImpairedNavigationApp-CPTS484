import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getTestData } from "@/services/TestService"
export default function Index() {
    const [testData, setTestData] = useState<string>("Loading...")

    useEffect(() => {
        getTestData().then( (json) => {
            setTestData(json.message);
        }
        ).catch( (error) => {
            setTestData(error.message);
        });
    }, [])

    return (
        <View
        style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        }}
        >
        <Text> Test Data Below From Python Will Succeed If Running Python Server With Correct Endpoint.</Text>
        <Text> Refresh For New Message</Text>
        <Text style={{
            color: "blue",
            fontSize: 24
        }}>{testData}</Text>
        </View>
    );
}
