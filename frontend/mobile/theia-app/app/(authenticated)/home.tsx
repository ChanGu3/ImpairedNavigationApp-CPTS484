import { UserContext } from "@/contexts/UserContext";
import { useContext } from "react";
import { Text, View } from "react-native";

export default function Home() {
  const userContext = useContext(UserContext);

  async function doLogout() {
    await userContext?.logout();
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>{userContext?.userData?.email}</Text>
      <button onClick={() => { doLogout() }} >LOGOUT</button>
      <Text>Home</Text>
    </View>
  );
}