import { UserContext } from "@/contexts/UserContext";
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";

export default function AuthenticatedLayout() {
  const userContext = useContext(UserContext);

  if(userContext?.isLoggedIn) {
    return ( 
      <Stack>
        <Stack.Screen name="home" options={{ headerShown: false }} />
      </Stack>
    )
  } else {
    return (
      <Redirect href="/(unauthenticated)/login"/>
    );
  }
}
