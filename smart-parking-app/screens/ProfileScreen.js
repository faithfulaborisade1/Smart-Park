import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [username, setUsername] = useState('');

    // ✅ Load dark mode preference & username on startup
    useEffect(() => {
        const loadPreferences = async () => {
            const savedDarkMode = await AsyncStorage.getItem('darkMode');
            const savedUsername = await AsyncStorage.getItem('username');
            if (savedDarkMode !== null) setDarkMode(savedDarkMode === 'true');
            if (savedUsername) setUsername(savedUsername);
        };
        loadPreferences();
    }, []);

    // ✅ Toggle Dark Mode & Save it
    const toggleDarkMode = async () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        await AsyncStorage.setItem('darkMode', newMode.toString());
    };

    return (
        <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
            <View style={[styles.profileCard, darkMode ? styles.darkCard : styles.lightCard]}>
                <Text style={[styles.username, darkMode ? styles.darkText : styles.lightText]}>
                    👤 {username || "User"}
                </Text>
                <Text style={[styles.info, darkMode ? styles.darkText : styles.lightText]}>
                    📧 Email: example@example.com
                </Text>
                <Text style={[styles.info, darkMode ? styles.darkText : styles.lightText]}>
                    🔑 Role: {username === 'admin' ? "Admin" : "User"}
                </Text>
            </View>

            {/* Dark Mode Toggle */}
            <View style={styles.switchContainer}>
                <Text style={[styles.switchText, darkMode ? styles.darkText : styles.lightText]}>
                    🌙 Dark Mode
                </Text>
                <Switch value={darkMode} onValueChange={toggleDarkMode} />
            </View>

            <Button title="Logout" onPress={() => console.log("Logout clicked")} color={darkMode ? "#FF5A5F" : "#4682B4"} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    lightContainer: { backgroundColor: '#f7f9fc' },
    darkContainer: { backgroundColor: '#1c1c1c' },

    profileCard: { width: '100%', padding: 20, borderRadius: 10, marginBottom: 20, alignItems: 'center' },
    lightCard: { backgroundColor: '#fff', elevation: 4 },
    darkCard: { backgroundColor: '#333', elevation: 4 },

    username: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    info: { fontSize: 16, marginBottom: 5 },
    lightText: { color: '#1a2e44' },
    darkText: { color: '#f7f9fc' },

    switchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    switchText: { fontSize: 18, marginRight: 10 },
});

export default ProfileScreen;
