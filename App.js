import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./HomeScreen";
import RekapScreen from "./RekapScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Beranda" }}
        />
        <Stack.Screen
          name="Rekap"
          component={RekapScreen}
          options={{ title: "Rekap Penjualan" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}