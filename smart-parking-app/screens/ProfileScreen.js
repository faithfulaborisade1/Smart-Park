import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, FlatList, Image, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../components/ThemeContext';

// API Config (Ideally move to config.js)
const API_BASE_URL = 'http://192.168.147.210:5000';

// Predefined list of animated avatar URLs
const avatarOptions = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FtdjVmdjJsc2xrdzI5cXF3NmR2M3Y0bTFsY2w4amFheDVhYjZ5ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o85xIO33l7R9fci9W/giphy.gif', // Animated dog
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTZmdmM2YzNrbjBweDV5c2xweDNodjN2c2x3cHFydmZhM3U5a2I5NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPRARvPN4s8/giphy.gif', // Animated cat
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTN3aGNkN2w3aHVvM3FocTBtdTFreWdxdTJvN3RtdjU0NHZhZDV6NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPy3QZQqGtDcrja/giphy.gif', // Animated robot
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXF3eDJ2a3J5a3Y5cG5mZGpueHNyM2ZhZmN2aWp1aW1idnM2dG1rZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt6KHxJTzLpxD0I/giphy.gif', // Animated astronaut
];

const ProfileScreen = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch with retry logic
  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay between retries
      }
    }
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const savedUsername = await AsyncStorage.getItem('username');
        const savedEmail = await AsyncStorage.getItem('email');
        const savedAvatar = await AsyncStorage.getItem('avatar');
        if (savedUsername) setUsername(savedUsername);
        if (savedEmail) setEmail(savedEmail);
        if (savedAvatar) setAvatar(savedAvatar);
        else setAvatar(avatarOptions[Math.floor(Math.random() * avatarOptions.length)]);
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile data from storage.');
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleUpdate = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('session_token');
      if (!sessionToken) {
        Alert.alert('Error', 'You must be logged in to update your profile.');
        return;
      }

      setLoading(true);
      const responseData = await fetchWithRetry(`${API_BASE_URL}/api/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken,
        },
        body: JSON.stringify({ username, email, password: password || undefined, avatar }),
      });

      if (responseData.success) {
        await AsyncStorage.multiSet([
          ['username', username],
          ['email', email],
          ['avatar', avatar],
        ]);
        Alert.alert('Success', responseData.message || 'Profile updated successfully');
        setIsEditing(false);
        setPassword(''); // Clear password field after update
      } else {
        Alert.alert('Error', responseData.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAvatarItem = ({ item }) => (
    <TouchableOpacity
      style={styles.avatarOption}
      onPress={() => {
        setAvatar(item);
        setShowAvatarPicker(false);
      }}
    >
      <Image source={{ uri: item }} style={styles.avatarSmall} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.outerContainer, darkMode ? styles.darkContainer : styles.lightContainer]}>
        <Text style={[styles.loadingText, darkMode ? styles.darkText : styles.lightText]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </TouchableOpacity>
          <Text style={[styles.username, darkMode ? styles.darkText : styles.lightText]}>
            {username || 'User'}
          </Text>
          <Text style={[styles.email, darkMode ? styles.darkText : styles.lightText]}>
            {email || 'No email provided'}
          </Text>
        </View>

        {/* Settings Section */}
        <View style={[styles.card, darkMode ? styles.darkCard : styles.lightCard]}>
          <View style={styles.settingRow}>
            <Ionicons name="moon-outline" size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} style={styles.icon} />
            <Text style={[styles.settingText, darkMode ? styles.darkText : styles.lightText]}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: '#4682B4' }}
              thumbColor={darkMode ? '#f7f9fc' : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="shield-outline" size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} style={styles.icon} />
            <Text style={[styles.settingText, darkMode ? styles.darkText : styles.lightText]}>
              Role: {username === 'admin' ? 'Admin' : 'User'}
            </Text>
          </View>

          {/* Edit Profile Section */}
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editButtonText}>{isEditing ? 'Cancel' : 'Edit Profile'}</Text>
          </TouchableOpacity>

          {isEditing && (
            <View style={styles.editSection}>
              <TextInput
                style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={darkMode ? '#999' : '#666'}
              />
              <TextInput
                style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="New Password (leave blank to keep current)"
                placeholderTextColor={darkMode ? '#999' : '#666'}
                secureTextEntry
              />
              <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} disabled={loading}>
                <Text style={styles.updateButtonText}>{loading ? 'Updating...' : 'Update Profile'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <View style={styles.avatarPicker}>
          <FlatList
            data={avatarOptions}
            renderItem={renderAvatarItem}
            keyExtractor={(item) => item}
            numColumns={2}
            contentContainerStyle={styles.avatarList}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowAvatarPicker(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  lightContainer: { backgroundColor: '#f7f9fc' },
  darkContainer: { backgroundColor: '#1c1c1c' },
  header: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#4682B4' },
  username: { fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  email: { fontSize: 16, color: '#666' },
  card: { width: '100%', padding: 20, borderRadius: 15, elevation: 4 },
  lightCard: { backgroundColor: '#fff' },
  darkCard: { backgroundColor: '#333' },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  icon: { marginRight: 15 },
  settingText: { fontSize: 18, flex: 1 },
  editButton: { backgroundColor: '#4682B4', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 20 },
  editButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  editSection: { marginTop: 20 },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  lightInput: { backgroundColor: '#f5f5f5', color: '#333' },
  darkInput: { backgroundColor: '#555', color: '#f7f9fc' },
  updateButton: { backgroundColor: '#2ECC71', borderRadius: 8, padding: 15, alignItems: 'center' },
  updateButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  avatarPicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarList: { padding: 20 },
  avatarOption: { margin: 10 },
  avatarSmall: { width: 80, height: 80, borderRadius: 40 },
  closeButton: { backgroundColor: '#FF5A5F', borderRadius: 8, padding: 10, marginTop: 20 },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  lightText: { color: '#1a2e44' },
  darkText: { color: '#f7f9fc' },
  loadingText: { fontSize: 18, fontWeight: '500', textAlign: 'center', flex: 1, justifyContent: 'center' },
});

export default ProfileScreen;