import { GetSessionUserData, IsLoggedIn, TryLogin, TryLogout } from "@/services/UserService";
import { useRouter } from "expo-router";
import { createContext, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type ContextDataType = {
  userData: UserDataType|null,
  isLoggedIn: boolean,
  login(email: string, password: string): Promise<string>,
  logout(): Promise<void>,
}
export const UserContext = createContext<ContextDataType|null>(null)

export type UserDataType = {
  email: string,
	firstname: string,
	lastname: string,
	user_type: string
}

type props = {
  children: React.ReactNode,
}
export function UserProvider({ children } : props) {
  const router = useRouter();
  const [userData, setUser] = useState<UserDataType|null>(null);
  const [isLoadingCheckedLogIn, setIsLoadingCheckedLogIn] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  async function login (email: string, password: string): Promise<string> {
    const result = await TryLogin(email, password);
    if(result?.success) {
      const data = await GetSessionUserData();
      setUser(data)
      setIsLoggedIn(true);
      router.navigate("/(authenticated)/home");
      return "";
    } 
    else if (result?.error) {
      return result.error.message;
    } 
    else {
      return "problem reaching server"
    }
  }
  
  async function logout(): Promise<void> {
    await TryLogout();
    setIsLoggedIn(false);
    setUser(null);
    router.navigate("/login");
  }

  async function CheckIsLoggedIn(): Promise<void> {
    setIsLoadingCheckedLogIn(true);

    if(await IsLoggedIn()) {
      const data = await GetSessionUserData();
      setUser(data)
      setIsLoggedIn(true);
    } else 
    {
      setUser(null)
      setIsLoggedIn(false);
    }
    
    setIsLoadingCheckedLogIn(false);
  }

  useEffect(() => {
    CheckIsLoggedIn().then();
  }, [])

  if(!isLoadingCheckedLogIn) {
    return (
      <UserContext.Provider value={{ userData, isLoggedIn, login, logout }}>
        {children}
      </UserContext.Provider>
    );
  }
  else {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ color: "black" }} > Please Wait A Moment... </Text>
      </View>
    )
  }
}


