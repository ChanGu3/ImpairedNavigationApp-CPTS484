import { UserProvider } from "@/contexts/UserContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return ( 
    <UserProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} /> 
        <Stack.Screen name="test" options={{ title: 'test' }} />
        <Stack.Screen name="(unauthenticated)" options={{ headerShown: false }} />
        <Stack.Screen name="(authenticated)" options={{ headerShown: false }} />
      </Stack>
    </UserProvider>
  )
}
