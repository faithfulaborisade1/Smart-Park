import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const AddParkingLot = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [totalSpaces, setTotalSpaces] = useState('');
    const [availableSpaces, setAvailableSpaces] = useState('');

    const handleAddParkingLot = () => {
        fetch('http://192.168.80.210:5000/api/add-parking-lot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, total_spaces: totalSpaces, available_spaces: availableSpaces })
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                Alert.alert("Success", "Parking lot added successfully!");
                setName('');
                setDescription('');
                setTotalSpaces('');
                setAvailableSpaces('');
            } else {
                Alert.alert("Error", data.error || "Something went wrong.");
            }
        })
        .catch(err => Alert.alert("Error", "Failed to connect to server."));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Parking Lot</Text>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Total Spaces" value={totalSpaces} onChangeText={setTotalSpaces} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Available Spaces" value={availableSpaces} onChangeText={setAvailableSpaces} keyboardType="numeric" />
            <Button title="Add Parking Lot" onPress={handleAddParkingLot} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f9fc' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 10, borderRadius: 5 },
});

export default AddParkingLot;
