import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Re-added
import { format } from 'date-fns'; // Ensure this is installed

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    console.log('✅ handleLogin triggered', { username, password });

    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    try {
      console.log('✅ Attempting fetch to http://192.168.80.210:5000/login');
      const response = await fetch('http://192.168.80.210:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        timeout: 10000, // 10-second timeout
      });

      console.log('✅ Fetch successful - Status:', response.status, 'OK:', response.ok);

      const data = await response.json();
      console.log('✅ Server response:', data);

      if (data.session_token) {
        // Store session data
        await AsyncStorage.setItem('session_token', data.session_token);
        await AsyncStorage.setItem('username', username);
        await AsyncStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');

        // Store last login timestamp at the time of login
        const loginTime = format(new Date(), 'MMM d, yyyy, h:mm a'); // e.g., "Mar 8, 2025, 10:30 AM"
        await AsyncStorage.setItem('last_login', loginTime);
        console.log('✅ Last login saved:', loginTime);

        Alert.alert('Success', 'Login successful');
        navigation.navigate('HomeTabs');
      } else {
        Alert.alert('Error', data.error || 'Invalid login credentials');
      }
    } catch (error) {
      console.error('❌ Fetch failed:', error.message);
      Alert.alert('Error', `Login failed: ${error.message}. Check network or server.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
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
    backgroundColor: '#4c669f',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#4c669f',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#4c669f',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default LoginScreen;