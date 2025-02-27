import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import carIcon from '../assets/car.png'; // Ensure this path is correct

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const ParkingLot = () => {
    const [spaces, setSpaces] = useState([]);
    const [selectedLot, setSelectedLot] = useState(null);
    const [lots, setLots] = useState([]);
    const navigation = useNavigation();

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

    const fetchParkingLots = async () => {
        try {
            const response = await fetch('http://192.168.112.210:5000/api/parking-lots');
            const data = await response.json();
            if (!Array.isArray(data)) return;
            setLots(data);
            const lastLot = await AsyncStorage.getItem('last_selected_lot');
            setSelectedLot((lastLot && data.some(lot => lot.id === lastLot)) ? lastLot : (data[0]?.id || null));
        } catch (error) {
            console.error("Error fetching parking lots:", error);
        }
    };

    const fetchParkingStatus = () => {
        if (!selectedLot) return;
            // In ParkingLot.js, inside fetchParkingStatus
        fetch(`http://192.168.112.210:5000/api/parking-status?lot=${selectedLot}`)
            .then(response => response.json())
            .then(data => {
                console.log("API Response for Parking Status:", data);
                if (Array.isArray(data)) setSpaces(data);
            })
        .catch(error => console.error("Error fetching parking data:", error));
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Parking Availability</Text>
            <Text style={styles.subtitle}>Select a lot and tap an available space to navigate</Text>

            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedLot}
                    style={styles.picker}
                    onValueChange={(itemValue) => setSelectedLot(itemValue)}
                >
                    {lots.map((lot) => (
                        <Picker.Item key={lot.id} label={lot.name} value={lot.id} />
                    ))}
                </Picker>
            </View>

            <View style={styles.layoutCard}>
                <Text style={styles.sectionTitle}>Parking Layout - {selectedLot}</Text>

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendBox, styles.available]} />
                        <Text style={styles.legendText}>Available</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendBox, styles.occupied]} />
                        <Text style={styles.legendText}>Occupied</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendBox, styles.reserved]} />
                        <Text style={styles.legendText}>Handicap</Text>
                    </View>
                </View>

                <View style={styles.laneContainer}>
                    {spaces.map((space) => (
                        <TouchableOpacity
                            key={space.space_id}
                            style={[
                                styles.parkingSlot,
                                space.status === 'occupied' ? styles.occupied :
                                space.status === 'available' ? styles.available :
                                styles.reserved
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                                if (space.status === 'occupied') {
                                    Alert.alert("Navigation Restricted", "This space is currently occupied.");
                                } else {
                                    if (space.status === 'reserved') {
                                        Alert.alert("Handicap Spot", "This is a handicap parking space.");
                                    }
                                    navigation.navigate('Navigation', {
                                        spaceNumber: space.space_number,
                                        latitude: space.latitude,
                                        longitude: space.longitude
                                    });
                                }
                            }}
                            
                            
                        >
                            {space.status === 'occupied' && (
                                <Image source={carIcon} style={styles.carIconSmall} />
                            )}
                            <Text style={styles.slotText}>{space.space_number}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 24,
        paddingHorizontal: 24,
        backgroundColor: '#f7f9fc',
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#1a2e44',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#5a6e88',
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: 0.2,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e6ed',
        marginBottom: 24,
        elevation: 3,
    },
    picker: {
        width: '100%',
        backgroundColor: '#fff',
        color: '#1a2e44',
    },
    layoutCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e0e6ed',
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1a2e44',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e6ed',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendBox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#1a2e44',
        fontWeight: '500',
    },
    laneContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    parkingSlot: {
        width: isMobile ? '48%' : '23%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e6ed',
        elevation: 3,
    },
    available: {
        backgroundColor: '#81c784', // Changed to light green
    },
    occupied: {
        backgroundColor: '#f8d7da',
    },
    reserved: {
        backgroundColor: '#cce5ff',
    },
    carIconSmall: {
        width: 40,
        height: 40,
        marginBottom: 8,
        transform: [{ rotate: '90deg' }],
    },
    slotText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a2e44',
        letterSpacing: 0.2,
    },
});

export default ParkingLot;