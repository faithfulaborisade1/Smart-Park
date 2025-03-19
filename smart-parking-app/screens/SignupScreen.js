import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../components/ThemeContext'; // Adjust path if needed

// API Config (Ideally move to config.js)
const API_BASE_URL = 'http://192.168.77.210:5000';

// Predefined list of animated avatar URLs
const avatarOptions = [
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3FtdjVmdjJsc2xrdzI5cXF3NmR2M3Y0bTFsY2w4amFheDVhYjZ5ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o85xIO33l7R9fci9W/giphy.gif', // Animated dog
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTZmdmM2YzNrbjBweDV5c2xweDNodjN2c2x3cHFydmZhM3U5a2I5NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPRARvPN4s8/giphy.gif', // Animated cat
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTN3aGNkN2w3aHVvM3FocTBtdTFreWdxdTJvN3RtdjU0NHZhZDV6NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPy3QZQqGtDcrja/giphy.gif', // Animated robot
  'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXF3eDJ2a3J5a3Y5cG5mZGpueHNyM2ZhZmN2aWp1aW1idnM2dG1rZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt6KHxJTzLpxD0I/giphy.gif', // Animated astronaut
];

const SignupScreen = ({ navigation }) => {
  const { darkMode } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSignup = async () => {
    // Input validation
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const responseData = await fetchWithRetry(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (responseData.success) {
        const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
        await AsyncStorage.multiSet([
          ['email', email],
          ['avatar', randomAvatar],
        ]);
        Alert.alert('Success', 'Signup successful! Please log in.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', responseData.error || 'Failed to sign up');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please check your network or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={[styles.card, darkMode ? styles.darkCard : styles.lightCard]}>
        <Text style={[styles.title, darkMode ? styles.darkText : styles.lightText]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, darkMode ? styles.darkSubtitle : styles.lightSubtitle]}>
          Join us today
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
            placeholder="Username"
            placeholderTextColor={darkMode ? '#999' : '#999'}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
            placeholder="Email"
            placeholderTextColor={darkMode ? '#999' : '#999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
            placeholder="Password"
            placeholderTextColor={darkMode ? '#999' : '#999'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
            placeholder="Confirm Password"
            placeholderTextColor={darkMode ? '#999' : '#999'}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={[styles.link, darkMode ? styles.darkLink : styles.lightLink]}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  card: {
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  lightCard: {
    backgroundColor: '#fff',
  },
  darkCard: {
    backgroundColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  lightInput: {
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#555',
    color: '#f7f9fc',
  },
  button: {
    backgroundColor: '#4c669f',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
  },
  lightLink: {
    color: '#4c669f',
  },
  darkLink: {
    color: '#4682B4',
  },
  lightText: {
    color: '#1a2e44',
  },
  darkText: {
    color: '#f7f9fc',
  },
  lightSubtitle: {
    color: '#5a6e88',
  },
  darkSubtitle: {
    color: '#999',
  },
});

export default SignupScreen;