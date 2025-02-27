import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';

const NotificationsScreen = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastNotifiedId, setLastNotifiedId] = useState(null); // Tracks the last notification shown in a popup

    // Fetch notifications with debouncing to avoid rapid re-renders
    const fetchNotifications = useCallback(async () => {
        try {
            const response = await fetch('http://192.168.112.210:5000/api/notifications');
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                const latestNotification = data[0]; // Get the newest notification

                // Only show popup if this is a new notification (not seen before)
                if (!lastNotifiedId || latestNotification.notification_id > lastNotifiedId) {
                    setLastNotifiedId(latestNotification.notification_id); // Update the last shown notification ID
                    playAlertSound(); // Play sound for new notification
                    Alert.alert("🔔 New Notification", latestNotification.message);
                }

                setNotifications(data); // Update the notification list
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            Alert.alert("Error", "Failed to load notifications.");
        } finally {
            setLoading(false);
        }
    }, [lastNotifiedId]); // Add lastNotifiedId as a dependency to re-fetch only when needed

    const playAlertSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/notification.mp3') // Ensure you have a valid sound file
            );
            await sound.playAsync();
        } catch (error) {
            console.error("Failed to play sound:", error);
        }
    };

    // Use useEffect to set up and clean up the polling interval
    useEffect(() => {
        fetchNotifications(); // Fetch initially
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds

        // Cleanup interval on unmount to prevent memory leaks
        return () => clearInterval(interval);
    }, [fetchNotifications]); // Use fetchNotifications as dependency to re-run effect on function change

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔔 Notifications</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.notification_id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.notificationItem}>
                            <Text style={styles.message}>{item.message}</Text>
                            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f9fc' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    notificationItem: { padding: 15, backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, elevation: 3 },
    message: { fontSize: 16, fontWeight: '600', color: '#1a2e44' },
    timestamp: { fontSize: 12, color: '#5a6e88', marginTop: 5 },
});

export default NotificationsScreen;