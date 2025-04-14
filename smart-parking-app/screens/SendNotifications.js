import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const SendNotification = () => {
    const [message, setMessage] = useState('');
    const [parkingSpaceId, setParkingSpaceId] = useState('');

    const handleSendNotification = () => {
        fetch('http://192.168.147.210.210:5000/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, parking_space_id: parkingSpaceId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                Alert.alert("Success", "Notification sent successfully!");
                setMessage('');
                setParkingSpaceId('');
            } else {
                Alert.alert("Error", data.error || "Something went wrong.");
            }
        })
        .catch(() => Alert.alert("Error", "Failed to connect to server."));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Send Notification</Text>
            <TextInput style={styles.input} placeholder="Message" value={message} onChangeText={setMessage} />
            <TextInput style={styles.input} placeholder="Parking Space ID" value={parkingSpaceId} onChangeText={setParkingSpaceId} keyboardType="numeric" />
            <Button title="Send Notification" onPress={handleSendNotification} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f9fc' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 10, borderRadius: 5 },
});

export default SendNotification;
