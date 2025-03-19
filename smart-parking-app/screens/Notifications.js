import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../components/ThemeContext';

// API Config
const API_BASE_URL = 'http://192.168.77.210:5000';

const NotificationsScreen = () => {
  const { darkMode } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastNotifiedId, setLastNotifiedId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load sound preference on mount
  useEffect(() => {
    const loadSoundPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('soundEnabled');
        setSoundEnabled(saved === null ? true : saved === 'true');
      } catch (error) {
        // Default to true if loading fails
      }
    };
    loadSoundPreference();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const latestNotification = data[0];
        if (!lastNotifiedId || latestNotification.notification_id > lastNotifiedId) {
          setLastNotifiedId(latestNotification.notification_id);
          if (soundEnabled) await playAlertSound();
          Alert.alert('🔔 New Notification', latestNotification.message);
        }
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to load notifications. Please try again later.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [lastNotifiedId, soundEnabled]);

  const playAlertSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3') // Ensure this file exists
      );
      await sound.playAsync();
    } catch (error) {
      // Silently fail
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      setNotifications(prev =>
        prev.map(notif => (notif.notification_id === notificationId ? { ...notif, is_read: true } : notif))
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notification as read.');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      setNotifications(prev => prev.filter(notif => notif.notification_id !== notificationId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  const toggleSound = async () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      await AsyncStorage.setItem('soundEnabled', newValue.toString());
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const renderNotification = ({ item }) => (
    <View style={[styles.notificationItem, darkMode ? styles.darkItem : styles.lightItem]}>
      <View style={styles.notificationContent}>
        <Text style={[styles.message, darkMode ? styles.darkText : styles.lightText]}>
          {item.message}
        </Text>
        <Text style={[styles.timestamp, darkMode ? styles.darkTimestamp : styles.lightTimestamp]}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => markAsRead(item.notification_id)}
          disabled={item.is_read}
        >
          <Ionicons
            name={item.is_read ? 'checkmark-done' : 'checkmark'}
            size={20}
            color={item.is_read ? '#999' : darkMode ? '#f7f9fc' : '#4682B4'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteNotification(item.notification_id)}
        >
          <Ionicons name="trash-outline" size={20} color={darkMode ? '#f7f9fc' : '#E74C3C'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode ? styles.darkText : styles.lightText]}>
          🔔 Notifications
        </Text>
        <TouchableOpacity onPress={toggleSound} style={styles.soundToggle}>
          <Ionicons
            name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
            size={24}
            color={darkMode ? '#f7f9fc' : '#4682B4'}
          />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkMode ? '#f7f9fc' : '#4682B4'} />
          <Text style={[styles.loadingText, darkMode ? styles.darkText : styles.lightText]}>
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={50} color={darkMode ? '#999' : '#5a6e88'} />
          <Text style={[styles.emptyText, darkMode ? styles.darkText : styles.lightText]}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.notification_id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 15,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  soundToggle: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  lightItem: {
    backgroundColor: '#fff',
  },
  darkItem: {
    backgroundColor: '#2a2a2a',
  },
  notificationContent: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  lightText: {
    color: '#1a2e44',
  },
  darkText: {
    color: '#f7f9fc',
  },
  lightTimestamp: {
    color: '#5a6e88',
  },
  darkTimestamp: {
    color: '#a0a0a0',
  },
});

export default NotificationsScreen;