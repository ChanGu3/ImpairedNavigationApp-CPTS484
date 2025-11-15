import { Stack } from "expo-router";

export default function RootLayout() {
  return ( 
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'Index' }} />
      <Stack.Screen name="test" options={{ title: 'test' }} />
    </Stack>
  )
}
