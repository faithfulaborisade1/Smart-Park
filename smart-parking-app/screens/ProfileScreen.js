import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { View, Text, StyleSheet, Switch, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../components/ThemeContext'; // Ensure path is correct

const ProfileScreen = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext); // Use global darkMode
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    const loadPreferences = async () => {
      const savedUsername = await AsyncStorage.getItem('username');
      const savedEmail = await AsyncStorage.getItem('email');
      console.log('✅ Profile - Loaded from AsyncStorage:', { savedUsername, savedEmail });
      if (savedUsername) setUsername(savedUsername);
      if (savedEmail) setEmail(savedEmail);
    };
    loadPreferences();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('email');
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('isAdmin');
      console.log('✅ User logged out');
      navigation.replace('Login');
    } catch (error) {
      console.error('❌ Logout Error:', error);
    }
  };

  return (
    <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
        </View>
        <Text style={[styles.username, darkMode ? styles.darkText : styles.lightText]}>
          {username || 'User'}
        </Text>
        <Text style={[styles.email, darkMode ? styles.darkText : styles.lightText]}>
          {email || 'No email provided'}
        </Text>
      </View>

      <View style={[styles.card, darkMode ? styles.darkCard : styles.lightCard]}>
        <View style={styles.settingRow}>
          <Ionicons
            name="moon-outline"
            size={24}
            color={darkMode ? '#f7f9fc' : '#4682B4'}
            style={styles.icon}
          />
          <Text style={[styles.settingText, darkMode ? styles.darkText : styles.lightText]}>
            Dark Mode
          </Text>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#4682B4' }}
            thumbColor={darkMode ? '#f7f9fc' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingRow}>
          <Ionicons
            name="shield-outline"
            size={24}
            color={darkMode ? '#f7f9fc' : '#4682B4'}
            style={styles.icon}
          />
          <Text style={[styles.settingText, darkMode ? styles.darkText : styles.lightText]}>
            Role: {username === 'admin' ? 'Admin' : 'User'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  lightContainer: { backgroundColor: '#f7f9fc' },
  darkContainer: { backgroundColor: '#1c1c1c' },
  header: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 15, borderWidth: 2, borderColor: '#4682B4' },
  avatar: { width: '100%', height: '100%' },
  username: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  email: { fontSize: 16, color: '#666' }, // This will be overridden by darkText/lightText
  card: { width: '100%', padding: 20, borderRadius: 15, marginBottom: 20 },
  lightCard: { backgroundColor: '#fff', elevation: 4 },
  darkCard: { backgroundColor: '#333', elevation: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  icon: { marginRight: 15 },
  settingText: { fontSize: 18, flex: 1 },
  logoutButton: { backgroundColor: '#FF5A5F', borderRadius: 8, padding: 15, alignItems: 'center' },
  logoutButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  lightText: { color: '#1a2e44' },
  darkText: { color: '#f7f9fc' },
});

export default ProfileScreen;