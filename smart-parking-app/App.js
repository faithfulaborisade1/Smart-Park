import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import Dashboard from './screens/Dashboard';
import DetectionScreen from './screens/DetectionScreen';
import ParkingLot from './screens/ParkingLayout';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator (Dashboard, Detection, Parking Layout, Profile)
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'home-outline';
          else if (route.name === 'Detection') iconName = 'camera-outline';
          else if (route.name === 'Parking Layout') iconName = 'car-outline';
          else if (route.name === 'Profile') iconName = 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4682B4',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Detection" component={DetectionScreen} />
      <Tab.Screen name="Parking Layout" component={ParkingLot} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
        <Stack.Screen name="HomeTabs" component={BottomTabNavigator} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
