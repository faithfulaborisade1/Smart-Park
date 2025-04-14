import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../components/ThemeContext';

const API_BASE_URL = 'http://192.168.147.210:5000';

const Dashboard = ({ navigation }) => {
  const { darkMode } = useContext(ThemeContext);
  const [username, setUsername] = useState('User');
  const [parkingData, setParkingData] = useState({ total: 0, available: 0, occupied: 0, reserved: 0 });
  const [lastLogin, setLastLogin] = useState('N/A');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        const storedLastLogin = await AsyncStorage.getItem('last_login');
        setUsername(storedUsername || 'User');
        setLastLogin(storedLastLogin || 'N/A');
      } catch (error) {
        console.error('Fetch User Data Error:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    const fetchParkingStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/parking-summary`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch parking summary: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setParkingData({
          total: data.total || 0,
          available: data.available || 0,
          occupied: data.occupied || 0,
          reserved: data.reserved || 0,
        });
      } catch (error) {
        console.error('Fetch Parking Status Error:', error.message);
        Alert.alert('Error', 'Unable to fetch parking data. Please try again later.');
        setParkingData({ total: 0, available: 0, occupied: 0, reserved: 0 });
      }
    };

    fetchUserData();
    fetchParkingStatus();
    const interval = setInterval(fetchParkingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    console.log('Logout button pressed');
    try {
      const sessionToken = await AsyncStorage.getItem('session_token');
      console.log('Session Token:', sessionToken);
      if (!sessionToken) {
        console.log('No session token found');
        Alert.alert('Error', 'No active session found.');
        return;
      }
  
      console.log('Making logout request to:', `${API_BASE_URL}/logout`);
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      }).catch((error) => {
        // Catch network errors (e.g., server unreachable)
        throw new Error(`Network error: ${error.message}`);
      });
  
      console.log('Logout Response Status:', response.status);
      const responseData = await response.json();
      console.log('Logout Response Data:', responseData);
  
      if (!response.ok) {
        throw new Error(responseData.error || `Logout failed with status ${response.status}`);
      }
  
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared');
      Alert.alert('Success', 'Logged out successfully');
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout Error:', error.message);
      Alert.alert('Error', error.message || 'Something went wrong during logout');
    }
  };
  
  return (
    <ScrollView style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      {/* Header */}
      <View style={[styles.header, darkMode ? styles.darkCard : styles.lightCard]}>
        <View>
          <Text style={[styles.welcomeText, darkMode ? styles.darkText : styles.lightText]}>
            Welcome, {username}!
          </Text>
          <Text style={[styles.subtitle, darkMode ? styles.darkText : styles.lightText]}>
            Last Login: {lastLogin}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#FF6347" />
        </TouchableOpacity>
      </View>

      {/* Parking Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <StatCard title="Total Spaces" value={parkingData.total} color="#4682B4" icon="grid-outline" />
          <StatCard title="Available" value={parkingData.available} color="#2ECC71" icon="checkmark-circle-outline" />
        </View>
        <View style={styles.statsRow}>
          <StatCard title="Occupied" value={parkingData.occupied} color="#E74C3C" icon="close-circle-outline" />
          <StatCard title="Reserved" value={parkingData.reserved} color="#7F8C8D" icon="bookmark-outline" />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={[styles.sectionTitle, darkMode ? styles.darkText : styles.lightText]}>
          Quick Actions
        </Text>
        <ActionButton
          title="View Layout"
          icon="map-outline"
          onPress={() => navigation.navigate('Parking Layout')}
          darkMode={darkMode}
        />
        <ActionButton
          title="Notifications"
          icon="notifications-outline"
          onPress={() => navigation.navigate('Notifications')}
          darkMode={darkMode}
        />
      </View>
    </ScrollView>
  );
};

// Reusable StatCard Component
const StatCard = ({ title, value, color, icon }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Ionicons name={icon} size={30} color="#fff" style={styles.statIcon} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
);

// Reusable ActionButton Component
const ActionButton = ({ title, icon, onPress, darkMode }) => (
  <TouchableOpacity
    style={[styles.actionButton, darkMode ? styles.darkActionButton : styles.lightActionButton]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} />
    <Text style={[styles.actionText, darkMode ? styles.darkText : styles.lightText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lightCard: {
    backgroundColor: '#fff',
  },
  darkCard: {
    backgroundColor: '#333',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  logoutButton: {
    padding: 10,
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
  },
  statIcon: {
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  lightActionButton: {
    backgroundColor: '#fff',
  },
  darkActionButton: {
    backgroundColor: '#333',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '600',
  },
  lightText: {
    color: '#333',
  },
  darkText: {
    color: '#f7f9fc',
  },
});

export default Dashboard;