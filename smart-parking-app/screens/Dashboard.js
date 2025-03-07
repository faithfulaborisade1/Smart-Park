import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../components/ThemeContext'; // Adjust path if needed

const Dashboard = ({ navigation }) => {
  const { darkMode } = useContext(ThemeContext); // Access global darkMode
  const [username, setUsername] = useState('');
  const [parkingData, setParkingData] = useState({ total: 0, available: 0, occupied: 0, reserved: 0 });
  const [lastLogin, setLastLogin] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUsername = await AsyncStorage.getItem('username');
      const storedLastLogin = await AsyncStorage.getItem('last_login') || 'N/A';
      setUsername(storedUsername || 'User');
      setLastLogin(storedLastLogin);
    };

    const fetchParkingStatus = async () => {
      try {
        const response = await fetch('http://192.168.80.210:5000/api/parking-summary');
        const data = await response.json();
        console.log('Dashboard API Response:', data);
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
      const response = await fetch('http://192.168.80.210:5000/logout', {
        method: 'POST',
        headers: { 'Authorization': sessionToken },
      });

      if (response.ok) {
        await AsyncStorage.clear();
        Alert.alert('Success', 'Logged out successfully');
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Something went wrong during logout');
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
          title="Find Parking"
          icon="car-outline"
          onPress={() => navigation.navigate('Detection')}
          darkMode={darkMode}
        />
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
    backgroundColor: '#f7f9fc', // Light mode background
  },
  darkContainer: {
    backgroundColor: '#1c1c1c', // Dark mode background
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
    backgroundColor: '#fff', // Light mode card
  },
  darkCard: {
    backgroundColor: '#333', // Dark mode card
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
    backgroundColor: '#fff', // Light mode action button
  },
  darkActionButton: {
    backgroundColor: '#333', // Dark mode action button
  },
  actionText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '600',
  },
  lightText: {
    color: '#333', // Light mode text
  },
  darkText: {
    color: '#f7f9fc', // Dark mode text
  },
});

export default Dashboard;