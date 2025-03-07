import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from './components/ThemeContext';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import Dashboard from './screens/Dashboard';
import DetectionScreen from './screens/DetectionScreen';
import ParkingLot from './screens/ParkingLayout';
import ProfileScreen from './screens/ProfileScreen';
import AdminDashboard from './screens/AdminDashboard';
import Notifications from './screens/Notifications';
import NavigationScreen from './screens/NavigationScreen';
import AddParkingLot from './screens/AddParkingLot';
import ManageParking from './screens/ManageParking';
import SendNotification from './screens/SendNotifications';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      try {
        const adminStatus = await AsyncStorage.getItem('isAdmin');
        setIsAdmin(adminStatus === 'true');
      } catch (error) {
        console.log('Error fetching admin status:', error);
      }
    };
    fetchAdminStatus();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'home-outline';
          else if (route.name === 'Detection') iconName = 'camera-outline';
          else if (route.name === 'Parking Layout') iconName = 'car-outline';
          else if (route.name === 'Notifications') iconName = 'notifications-outline';
          else if (route.name === 'Profile') iconName = 'settings-outline';
          else if (route.name === 'Admin') iconName = 'shield-outline'; // Added for Admin
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4682B4',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Detection" component={DetectionScreen} />
      <Tab.Screen name="Parking Layout" component={ParkingLot} />
      <Tab.Screen name="Notifications" component={Notifications} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminDashboard} />}
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Signup"
                component={SignupScreen}
                options={{ title: 'Sign Up' }}
            />
            <Stack.Screen
                name="HomeTabs"
                component={BottomTabNavigator}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Navigation"
                component={NavigationScreen}
                options={{ title: 'Navigation' }}
            />
            <Stack.Screen
                name="AddParkingLot"
                component={AddParkingLot}
                options={{ title: 'Add Parking Lot' }}
            />
            <Stack.Screen
                name="ManageParking"
                component={ManageParking}
                options={{ title: 'Manage Parking' }}
            />
            <Stack.Screen
                name="SendNotification"
                component={SendNotification}
                options={{ title: 'Send Notification' }}
            />
            </Stack.Navigator>
        </NavigationContainer>
        </GestureHandlerRootView>
    </ThemeProvider>
  );
}