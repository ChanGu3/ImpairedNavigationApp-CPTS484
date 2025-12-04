import { UserContext } from "@/contexts/UserContext";
import { useContext, useState } from "react";
import { StyleProp, Text, TextInput, TextStyle, View, Button} from "react-native";

export default function Login() {
  const userContext = useContext(UserContext)
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMSG, setErrorMSG] = useState<string|null>(null);

  async function doLogin() {
    const message = await userContext?.login(email, password)

    if (message)
    {
      setErrorMSG(message);
    }
  }

  const inputStyle: StyleProp<TextStyle> = {
    borderColor: "black",
    borderWidth: 2, 
    borderRadius: 24, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    width: "100%",
    height: 50
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View style={{ display: "flex", gap: 4, marginBottom: 100,}} >
        <Text style={{ fontSize: 52, textAlign: "center"}}>Login</Text>
        <Text style={{ fontSize: 16, textAlign: "center" }}>please enter your email and password to login</Text>
      </View>

      <View style={{ display: "flex", gap: 12, maxWidth: 600, width: "65%", alignItems: "center" }}>
        <TextInput style={inputStyle} placeholder="Email" keyboardType="email-address" value={email} onChangeText={(text) => { setEmail(text) }}></TextInput>
        <TextInput style={inputStyle} placeholder="Password" value={password} secureTextEntry={true} onChangeText={(text) => { setPassword(text) }}></TextInput>
        <Text style={{ color: "red", }}>{errorMSG}</Text>
       <Button title="Submit" onPress={doLogin} />
      </View>
    </View>
  );
}