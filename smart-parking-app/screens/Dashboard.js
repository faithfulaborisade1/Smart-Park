import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Dashboard = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [parkingData, setParkingData] = useState({ total: 0, available: 0, occupied: 0, reserved: 0 });
  const [lastLogin, setLastLogin] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUsername = await AsyncStorage.getItem('username');
      const storedLastLogin = await AsyncStorage.getItem('last_login');
      setUsername(storedUsername || 'User');
      setLastLogin(storedLastLogin || 'N/A');
    };

    const fetchParkingStatus = async () => {
      try {
          const response = await fetch('http://192.168.8.51:5000/api/parking-summary');
          const data = await response.json();
  
          console.log("Dashboard API Response:", data); // ✅ Log response to debug
  
          setParkingData({
              total: data.total || 0,
              available: data.available || 0,
              occupied: data.occupied || 0,
              reserved: data.reserved || 0,
          });
      } catch (error) {
          console.error('Error fetching parking summary:', error);
      }
  };
  

    fetchUserData();
    fetchParkingStatus();
    const interval = setInterval(fetchParkingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('session_token');
      const response = await fetch('http://192.168.8.51:5000/logout', {
        method: 'POST',
        headers: { 'Authorization': sessionToken },
      });

      if (response.ok) {
        await AsyncStorage.removeItem('session_token');
        Alert.alert('Success', 'Logged out successfully');
        navigation.navigate('Login');
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
      <Text style={styles.title}>Welcome, {username}!</Text>
      <Text style={styles.subtitle}>Last Login: {lastLogin}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <View style={[styles.statBox, { backgroundColor: '#4682B4' }]}> 
            <Text style={styles.statLabel}>Total Spaces</Text>
            <Text style={styles.statValue}>{parkingData.total}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: 'green' }]}> 
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>{parkingData.available}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.statBox, { backgroundColor: 'red' }]}> 
            <Text style={styles.statLabel}>Occupied</Text>
            <Text style={styles.statValue}>{parkingData.occupied}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: 'gray' }]}> 
            <Text style={styles.statLabel}>Reserved</Text>
            <Text style={styles.statValue}>{parkingData.reserved}</Text>
          </View>
        </View>
      </View>
      {/* <Button title="Logout" onPress={handleLogout} color="#FF6347" /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20 },
  statsContainer: { alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { width: 150, padding: 20, margin: 10, borderRadius: 10, alignItems: 'center' },
  statLabel: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  statValue: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginTop: 5 },
});

export default Dashboard;
