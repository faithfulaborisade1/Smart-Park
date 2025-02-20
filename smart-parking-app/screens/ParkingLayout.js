import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Animated, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import carIcon from '../assets/car.png';  // Correct relative path


const ParkingLot = () => {
    const [spaces, setSpaces] = useState([]);
    const [selectedLot, setSelectedLot] = useState(null);
    const [lots, setLots] = useState([]);
    const [columns, setColumns] = useState(2);
    const [selectedSpace, setSelectedSpace] = useState(null);

    // Fetch parking lots
    const fetchParkingLots = async () => {
        try {
            const response = await fetch('http://192.168.8.51:5000/api/parking-lots');
            const data = await response.json();
            if (!Array.isArray(data)) return;

            setLots(data);

            // Load last visited lot
            const lastLot = await AsyncStorage.getItem('last_selected_lot');
            setSelectedLot(lastLot && data.some(lot => lot.id === lastLot) ? lastLot : (data[0]?.id || null));
        } catch (error) {
            console.error("Error fetching parking lots:", error);
        }
    };

    // Fetch parking spaces
    const fetchParkingStatus = () => {
        if (!selectedLot) return;

        fetch(`http://192.168.8.51:5000/api/parking-status?lot=${selectedLot}`)
            .then(response => response.json())
            .then(data => {
                if (Array.isArray(data)) setSpaces(data);
            })
            .catch(error => console.error("Error fetching parking data:", error));
    };

    useEffect(() => {
        fetchParkingLots();
    }, []);

    useEffect(() => {
        fetchParkingStatus();
        const interval = setInterval(fetchParkingStatus, 5000);
        return () => clearInterval(interval);
    }, [selectedLot]);

    useFocusEffect(
        useCallback(() => {
            fetchParkingStatus();
        }, [selectedLot])
    );

    // Handle navigation
    const navigateToSpace = (lot, space) => {
        fetch(`http://192.168.8.51:5000/api/parking-status?lot=${lot}&space=${space}`)
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    Alert.alert('Error', 'No parking data found.');
                    return;
                }

                const spaceData = data[0];
                if (!spaceData.latitude || !spaceData.longitude) {
                    Alert.alert('Error', 'GPS coordinates not available for this space.');
                    return;
                }

                setSelectedSpace(space); // Highlight the selected space

                const latitude = parseFloat(spaceData.latitude);
                const longitude = parseFloat(spaceData.longitude);

                if (!isNaN(latitude) && !isNaN(longitude)) {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                    Linking.openURL(url);
                }
            })
            .catch(() => Alert.alert('Error', 'Failed to fetch navigation data'));
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Select Parking Lot</Text>

            <Picker
                selectedValue={selectedLot}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedLot(itemValue)}
            >
                {lots.map((lot) => (
                    <Picker.Item key={lot.id} label={lot.name} value={lot.id} />
                ))}
            </Picker>

            <Text style={styles.title}>Parking Layout - {selectedLot}</Text>

            <View style={styles.parkingLot}>
                {spaces.map((space) => (
                    <TouchableOpacity
                        key={space.space_id}
                        style={[
                            styles.space,
                            space.status === 'occupied' ? styles.occupied :
                            space.status === 'available' ? styles.available :
                            styles.reserved,
                            selectedSpace === space.space_number && styles.selectedSpace
                        ]}
                        onPress={() => navigateToSpace(selectedLot, space.space_number)}
                    >
                       <Image source={carIcon} style={styles.carIcon} />

                        <Text style={styles.text}>{space.space_number}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 15, backgroundColor: '#1E1E1E', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#FFF' },
    picker: { width: 220, height: 50, marginBottom: 20, backgroundColor: '#333', borderRadius: 8, color: '#FFF' },
    parkingLot: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    space: { 
        width: 65, height: 100, justifyContent: 'center', alignItems: 'center', 
        borderWidth: 1, borderColor: '#FFF', margin: 6, borderRadius: 8,
        elevation: 5, shadowColor: '#000'
    },
    available: { backgroundColor: '#4CAF50' }, // Brighter green
    occupied: { backgroundColor: '#FF3B30' }, // Stronger red
    reserved: { backgroundColor: '#FFC107' }, // Yellow for reservations
    selectedSpace: { borderColor: '#00FFFF', borderWidth: 3 }, // Cyan glow for selection
    text: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    carIcon: {
        width: 40, // Adjust size as needed
        height: 70, // Adjust size as needed
        resizeMode: 'contain',
    }
});

export default ParkingLot;
