import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { ThemeContext } from '../components/ThemeContext'; // Adjust path if needed

const NotificationsScreen = () => {
  const { darkMode } = useContext(ThemeContext); // Access global darkMode
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastNotifiedId, setLastNotifiedId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('http://192.168.80.210:5000/api/notifications');
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const latestNotification = data[0];
        if (!lastNotifiedId || latestNotification.notification_id > lastNotifiedId) {
          setLastNotifiedId(latestNotification.notification_id);
          playAlertSound();
          Alert.alert('🔔 New Notification', latestNotification.message);
        }
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [lastNotifiedId]);

  const playAlertSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3') // Ensure this file exists
      );
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.title, darkMode ? styles.darkText : styles.lightText]}>
        🔔 Notifications
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color={darkMode ? '#f7f9fc' : '#0000ff'} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.notificationItem, darkMode ? styles.darkItem : styles.lightItem]}>
              <Text style={[styles.message, darkMode ? styles.darkText : styles.lightText]}>
                {item.message}
              </Text>
              <Text style={[styles.timestamp, darkMode ? styles.darkTimestamp : styles.lightTimestamp]}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc', // Light mode background
  },
  darkContainer: {
    backgroundColor: '#1c1c1c', // Dark mode background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  notificationItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  lightItem: {
    backgroundColor: '#fff', // Light mode notification item
  },
  darkItem: {
    backgroundColor: '#333', // Dark mode notification item
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 5,
  },
  lightText: {
    color: '#1a2e44', // Light mode text
  },
  darkText: {
    color: '#f7f9fc', // Dark mode text
  },
  lightTimestamp: {
    color: '#5a6e88', // Light mode timestamp
  },
  darkTimestamp: {
    color: '#999', // Dark mode timestamp (slightly muted for contrast)
  },
});

export default NotificationsScreen;