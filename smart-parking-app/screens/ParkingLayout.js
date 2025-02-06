import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const ParkingLot = () => {
    const [spaces, setSpaces] = useState([]);

    const fetchParkingStatus = () => {
        fetch('http://192.168.8.51:5000/api/parking-status')
            .then((response) => response.json())
            .then((data) => setSpaces(data))
            .catch((error) => console.error('Error fetching data:', error));
    };

    useEffect(() => {
        fetchParkingStatus();
        const interval = setInterval(fetchParkingStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchParkingStatus(); // Fetch fresh data when the tab is focused
        }, [])
    );

    const leftColumn = spaces.slice(0, 12);
    const rightColumn = spaces.slice(12, 24);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Parking Layout - EB1</Text>
            <View style={styles.parkingLot}>
                <View style={styles.column}>
                    {leftColumn.map((space, index) => (
                        <View
                            key={space.space_id}
                            style={[
                                styles.space,
                                index < 3 ? styles.handicap :
                                space.status === 'occupied' ? styles.occupied :
                                space.status === 'available' ? styles.available :
                                space.status === 'reserved' && styles.reserved,
                            ]}
                        >
                            <Text style={styles.text}>{space.space_number}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.column}>
                    {rightColumn.map((space) => (
                        <View
                            key={space.space_id}
                            style={[
                                styles.space,
                                space.status === 'occupied' ? styles.occupied :
                                space.status === 'available' ? styles.available :
                                space.status === 'reserved' && styles.reserved,
                            ]}
                        >
                            <Text style={styles.text}>{space.space_number}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    parkingLot: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    column: { flexDirection: 'column', alignItems: 'center', flex: 1 },
    space: { width: 50, height: 80, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000', margin: 5, borderRadius: 5 },
    available: { backgroundColor: 'green' },
    occupied: { backgroundColor: 'red' },
    handicap: { backgroundColor: 'yellow', borderColor: '#FFA500' },
    reserved: { backgroundColor: 'gray' },
    text: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});

export default ParkingLot;
