import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Dashboard = ({ navigation }) => {

  const handleLogout = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');

    const response = await fetch('http://localhost:5000/logout', { // Update the URL
      method: 'POST',
      headers: {
        'Authorization': sessionToken,
      },
    });

    if (response.ok) {
      await AsyncStorage.removeItem('session_token'); // Clear session token
      Alert.alert('Success', 'Logged out successfully');
      navigation.navigate('Login'); // Redirect to Login
    } else {
      Alert.alert('Error', 'Failed to logout');
    }
  } catch (error) {
    console.error('Logout error:', error);
    Alert.alert('Error', 'Something went wrong during logout');
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to the Dashboard!</Text>
      <Button title="Logout" onPress={handleLogout} color="#FF6347" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});

export default Dashboard;
