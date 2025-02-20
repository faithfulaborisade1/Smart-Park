import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Arrow from '../components/Arrow'; // SVG Arrow Component

import carIcon from '../assets/car.png'; // Car image

const { width } = Dimensions.get('window');
const isMobile = width < 768; // Define mobile breakpoint

const ParkingLot = () => {
    const [spaces, setSpaces] = useState([]);
    const [selectedLot, setSelectedLot] = useState(null);
    const [lots, setLots] = useState([]);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [fadeAnim] = useState(new Animated.Value(1));

    useEffect(() => { fetchParkingLots(); }, []);
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

    // Fetch parking lots
    const fetchParkingLots = async () => {
        try {
            const response = await fetch('http://192.168.8.51:5000/api/parking-lots');
            const data = await response.json();
            if (!Array.isArray(data)) return;

            setLots(data);

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

            {/* Entry Label */}
            <View style={styles.arrowWrapper}>
                <Arrow direction="up" size={isMobile ? 30 : 40} />
                <Text style={styles.entryText}>Entry</Text>
            </View>

            {/* Multi-Lane Parking Grid (VERTICAL NUMBERING) */}
            <View style={styles.laneContainer}>
                {Array.from({ length: 3 }).map((_, laneIndex) => (
                    <View key={laneIndex} style={styles.lane}>
                        {spaces
                            .filter((_, index) => index % 3 === laneIndex) // Ensures vertical numbering
                            .sort((a, b) => parseInt(a.space_number.substring(1)) - parseInt(b.space_number.substring(1))) // Sort by S1, S2, S3...
                            .map((space, index, array) => (
                                <View key={space.space_id} style={styles.parkingRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.parkingSlot,
                                            space.status === 'occupied' ? styles.occupied :
                                            space.status === 'available' ? styles.available :
                                            styles.reserved
                                        ]}
                                        onPress={() => setSelectedSpace(space.space_number)}
                                    >
                                        {/* 🚗 Show Car When Space is Occupied */}
                                        {space.status === 'occupied' && (
                                            <Image source={carIcon} style={isMobile ? styles.carIconSmall : styles.carIconLarge} />
                                        )}

                                        <Text style={styles.slotText}>{space.space_number}</Text>
                                    </TouchableOpacity>


                                    {/* Ensure divider only appears between slots, not after the last one */}
                                    {index < array.length - 1 && <View style={styles.dividerLine} />}
                                </View>
                            ))}
                    </View>
                ))}
            </View>

            {/* Exit Label */}
            <View style={styles.arrowWrapper}>
                <Text style={styles.exitText}>Exit</Text>
                <Arrow direction="down" size={isMobile ? 30 : 40} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 16, alignItems: 'center', backgroundColor: '#F5F5F5' },
    title: { fontSize: isMobile ? 18 : 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
    picker: { width: 220, height: 50, marginBottom: 20, backgroundColor: '#FFF', borderRadius: 8 },

    arrowWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
    entryText: { fontSize: 18, fontWeight: 'bold', color: '#28A745', marginLeft: 10 },
    exitText: { fontSize: 18, fontWeight: 'bold', color: '#DC3545', marginRight: 10 },

    laneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    lane: { width: '30%', alignItems: 'center' },

    parkingSlot: { 
        width: isMobile ? 90 : 120, height: isMobile ? 60 : 75, justifyContent: 'center', alignItems: 'center', 
        borderWidth: 1, borderColor: '#000', borderRadius: 10,
        backgroundColor: '#FFF', elevation: 3, flexDirection: 'row',
        marginVertical: isMobile ? 3 : 5,
    },
    available: { backgroundColor: '#E3FCEF' },
    occupied: { backgroundColor: '#FCE3E3' },
    reserved: { backgroundColor: '#FFF3CD' },
    selectedSlot: { borderColor: '#007AFF', borderWidth: 3 },

    slotText: { fontSize: isMobile ? 14 : 16, fontWeight: 'bold', color: '#333', marginLeft: 10 },
    carIconSmall: { width: 50, height: 25, resizeMode: 'contain' }, 
    carIconLarge: { width: 70, height: 40, resizeMode: 'contain' },

    // **Fixed Blue Line Issue**
    dividerLine: { 
        width: isMobile ? '70%' : '100%', // Reduce width on mobile
        height: 3, // Ensure visible thickness
        backgroundColor: '#007AFF', // Strong blue color
        marginTop: 3, // Add spacing to make it clear
        position: 'absolute',
        bottom: -2, // Positions correctly between slots
    },
});

export default ParkingLot;
