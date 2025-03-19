import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@env';

// Conditionally import MapView for non-web platforms
const Maps = Platform.OS === 'web' ? () => null : require('react-native-maps');

const NavigationScreen = ({ route }) => {
  const { latitude, longitude, spaceNumber } = route.params || {};
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);
  const fallbackLocation = { latitude: 53.419841, longitude: -7.907497 }; // Default fallback

  // Parse route params with fallback
  const destination = {
    latitude: Number(latitude) || fallbackLocation.latitude,
    longitude: Number(longitude) || fallbackLocation.longitude,
  };

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied. Please enable it in settings.');
          Alert.alert('Permission Denied', 'Location access is required for navigation. Please enable it in settings.');
          setUserLocation(fallbackLocation);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 30000,
          maximumAge: 10000,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setError(null);
      } catch (err) {
        setError(`Failed to get location: ${err.message}`);
        Alert.alert('Location Error', `Unable to retrieve your location: ${err.message}. Using fallback location.`);
        setUserLocation(fallbackLocation);
      }
    };

    requestLocationPermission();
  }, []);

  if (error && !userLocation) {
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
          <Marker coordinate={destination} title={`Parking Space ${spaceNumber || 'Unknown'}`} pinColor="red" />
          <MapViewDirections
            origin={userLocation}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="blue"
            onError={(errorMessage) => {
              Alert.alert('Navigation Error', `Failed to load route: ${errorMessage}. Check your network or API key setup.`);
            }}
          />
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading navigation...</Text>
        </View>
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
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingText: {
    fontSize: 16,
    color: '#1a2e44',
    marginTop: 10,
  },
});

export default NavigationScreen;