import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // ✅ Import Picker

const ManageParking = () => {
    const [spaceId, setSpaceId] = useState('');
    const [newStatus, setNewStatus] = useState('available'); // ✅ Default selection

    const handleUpdateStatus = () => {
        if (!spaceId) {
            Alert.alert("❌ Error", "Please enter a valid Space ID.");
            return;
        }

        fetch(`http://192.168.80.210:5000/api/update-parking-status/${spaceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })  // ✅ Always valid status
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                Alert.alert("✅ Success", "Parking status updated successfully!");
                setSpaceId('');
                setNewStatus('available'); // ✅ Reset to default
            } else {
                Alert.alert("❌ Error", data.error || "Something went wrong.");
            }
        })
        .catch(() => Alert.alert("❌ Error", "Failed to connect to server."));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🚗 Manage Parking Status</Text>
            
            <TextInput 
                style={styles.input} 
                placeholder="Space ID (e.g., 1, 2, 3)" 
                value={spaceId} 
                onChangeText={setSpaceId} 
                keyboardType="numeric"
            />

            <Text style={styles.label}>Select New Status:</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={newStatus}
                    onValueChange={(itemValue) => setNewStatus(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Available" value="available" />
                    <Picker.Item label="Occupied" value="occupied" />
                    <Picker.Item label="Reserved" value="reserved" />
                </Picker>
            </View>

            <Button title="Update Status" onPress={handleUpdateStatus} color="#4682B4" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f9fc' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 10, borderRadius: 5 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10 },
    picker: { height: 50, width: '100%' },
});

export default ManageParking;
