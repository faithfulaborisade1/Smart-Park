import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@env';

const Maps = Platform.OS === 'web' ? () => null : require('react-native-maps');


const NavigationScreen = ({ route }) => {
    const { latitude, longitude, spaceNumber } = route.params;
    const [userLocation, setUserLocation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const requestLocationPermission = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            console.log("Location Permission Status:", status);

            if (status === 'granted') {
                console.log("Location Permission Granted, Fetching Location...");
                try {
                    let location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                        timeout: 30000,
                        maximumAge: 10000,
                    });
                    console.log("✅ User Location Retrieved:", location.coords);
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });
                    setError(null);
                } catch (err) {
                    console.error("❌ Location Error:", err);
                    setError(`Location Error: ${err.message}`);
                    Alert.alert("Location Error", `Failed to get location: ${err.message}`);
                    setUserLocation({ latitude: 53.419841, longitude: -7.907497 }); // Fallback
                }
            } else {
                console.log("Location Permission Denied");
                setError("Location permission denied. Please enable location access in settings.");
                Alert.alert("Permission Denied", "Location access is required for navigation. Please enable it in settings.");
                setUserLocation({ latitude: 53.419841, longitude: -7.907497 }); // Fallback
            }
        };

        requestLocationPermission();
        console.log("Route Params:", route.params); // Debug route.params
        console.log("Google Maps API Key:", GOOGLE_MAPS_API_KEY); // Debug API key
    }, []);

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {userLocation ? (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                >
                    <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />
                    <Marker
                        coordinate={{ latitude: Number(latitude) || 53.419841, longitude: Number(longitude) || -7.907497 }}
                        title={`Parking Space ${spaceNumber}`}
                        pinColor="red"
                    />
                    <MapViewDirections
                        origin={userLocation}
                        destination={{ latitude: Number(latitude) || 53.419841, longitude: Number(longitude) || -7.907497 }}
                        apikey={GOOGLE_MAPS_API_KEY}
                        strokeWidth={5}
                        strokeColor="blue"
                        onError={(error) => {
                            console.error("Map Directions Error:", error);
                            Alert.alert("Navigation Error", `Failed to load route: ${error}. Check your Google Maps API key and billing setup.`);
                        }}
                        onReady={(result) => {
                            console.log("Directions Loaded Successfully:", result);
                        }}
                    />
                </MapView>
            ) : (
                <ActivityIndicator size="large" color="#0000ff" />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f9fc',
    },
    errorText: {
        fontSize: 16,
        color: '#1a2e44',
        marginBottom: 10,
    },
});

export default NavigationScreen;