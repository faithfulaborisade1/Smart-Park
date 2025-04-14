import React, { useEffect, useState, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback 
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../components/ThemeContext';

// API Config
const API_BASE_URL = 'http://192.168.147.210:5000';

const Notifications = () => {
  const { darkMode } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastNotifiedId, setLastNotifiedId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Send notification state
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [parkingSpaceId, setParkingSpaceId] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);

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
    // Also fetch parking spaces when component mounts
    fetchParkingSpaces();
  }, []);

  const fetchParkingSpaces = async () => {
    try {
      setLoadingSpaces(true);
      const response = await fetch(`${API_BASE_URL}/api/parking-spaces`);
      
      if (!response.ok) throw new Error('Failed to fetch parking spaces');
      
      const data = await response.json();
      setParkingSpaces(data);
    } catch (error) {
      console.error('Error fetching parking spaces:', error);
      // Don't show alert here to avoid disrupting the main notification experience
    } finally {
      setLoadingSpaces(false);
    }
  };

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

  // Send notification function
  const sendNotification = async () => {
    // Validate input
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }
    
    if (!parkingSpaceId) {
      Alert.alert('Error', 'Please enter a parking space ID');
      return;
    }

    try {
      setSendingNotification(true);
      
      console.log('Sending notification to:', `${API_BASE_URL}/api/send-notification`);
      console.log('Payload:', { message, parking_space_id: parkingSpaceId });
      
      const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          parking_space_id: parseInt(parkingSpaceId, 10)
        }),
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }
      
      // Success
      Alert.alert('Success', 'Notification sent successfully');
      setMessage('');
      setParkingSpaceId('');
      setModalVisible(false);
      
      // Refresh notifications list
      fetchNotifications();
      
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', `Failed to send notification: ${error.message}`);
    } finally {
      setSendingNotification(false);
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
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleSound} style={styles.soundToggle}>
            <Ionicons
              name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
              size={24}
              color={darkMode ? '#f7f9fc' : '#4682B4'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={darkMode ? '#f7f9fc' : '#4682B4'}
            />
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={[styles.createButton, { marginTop: 20 }]}
          >
            <Text style={styles.createButtonText}>Create Notification</Text>
          </TouchableOpacity>
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

      {/* Send Notification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.centeredView}>
            <View style={[
              styles.modalView, 
              darkMode ? styles.darkModalView : styles.lightModalView
            ]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, darkMode ? styles.darkText : styles.lightText]}>
                  Create Notification
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={darkMode ? '#f7f9fc' : '#333'} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, darkMode ? styles.darkText : styles.lightText]}>
                Parking Space ID
              </Text>
              <View style={[
                styles.inputContainer,
                darkMode ? styles.darkInputContainer : styles.lightInputContainer
              ]}>
                <TextInput
                  style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                  placeholder="Enter parking space ID"
                  placeholderTextColor={darkMode ? '#a0a0a0' : '#5a6e88'}
                  keyboardType="numeric"
                  value={parkingSpaceId}
                  onChangeText={setParkingSpaceId}
                />
              </View>

              <Text style={[styles.inputLabel, darkMode ? styles.darkText : styles.lightText]}>
                Message
              </Text>
              <View style={[
                styles.inputContainer, 
                styles.messageContainer,
                darkMode ? styles.darkInputContainer : styles.lightInputContainer
              ]}>
                <TextInput
                  style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                  placeholder="Enter notification message"
                  placeholderTextColor={darkMode ? '#a0a0a0' : '#5a6e88'}
                  multiline
                  numberOfLines={3}
                  value={message}
                  onChangeText={setMessage}
                />
              </View>

              {/* Show a list of parking spaces to help the user */}
              {loadingSpaces ? (
                <ActivityIndicator 
                  size="small" 
                  color={darkMode ? '#f7f9fc' : '#4682B4'} 
                  style={{ marginTop: 10 }}
                />
              ) : (
                <View style={styles.spacesContainer}>
                  <Text style={[styles.spacesTitle, darkMode ? styles.darkText : styles.lightText]}>
                    Available Parking Spaces:
                  </Text>
                  <View style={styles.spacesList}>
                    {parkingSpaces.slice(0, 5).map((space) => (
                      <TouchableOpacity 
                        key={space.space_id} 
                        style={styles.spaceItem}
                        onPress={() => setParkingSpaceId(space.space_id.toString())}
                      >
                        <Text style={[styles.spaceText, darkMode ? styles.darkText : styles.lightText]}>
                          {space.area_id} - Space {space.space_number} (ID: {space.space_id})
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {parkingSpaces.length > 5 && (
                      <Text style={[styles.moreSpaces, darkMode ? styles.darkTimestamp : styles.lightTimestamp]}>
                        + {parkingSpaces.length - 5} more spaces
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sendingNotification ? styles.disabledButton : null
                ]}
                onPress={sendNotification}
                disabled={sendingNotification}
              >
                {sendingNotification ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Notification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Floating action button to send notification */}
      {!modalVisible && notifications.length > 0 && (
        <TouchableOpacity
          style={[styles.floatingButton, darkMode ? styles.darkFloatingButton : {}]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  soundToggle: {
    padding: 5,
    marginRight: 10,
  },
  addButton: {
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
  // Modal Styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '85%',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  lightModalView: {
    backgroundColor: 'white',
  },
  darkModalView: {
    backgroundColor: '#2a2a2a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  lightInputContainer: {
    backgroundColor: '#f0f2f5',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  darkInputContainer: {
    backgroundColor: '#3a3a3a',
    borderColor: '#444',
    borderWidth: 1,
  },
  messageContainer: {
    minHeight: 100,
    paddingVertical: 10,
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
  },
  lightInput: {
    color: '#1a2e44',
  },
  darkInput: {
    color: '#f7f9fc',
  },
  sendButton: {
    backgroundColor: '#4682B4',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#4682B4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    width: '70%',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#4682B4',
    borderRadius: 30,
    bottom: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  darkFloatingButton: {
    backgroundColor: '#3b6d99',
  },
  spacesContainer: {
    marginTop: 5,
    marginBottom: 15,
  },
  spacesTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  spacesList: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  spaceItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  spaceText: {
    fontSize: 14,
  },
  moreSpaces: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 5,
  }
});

export default Notifications;