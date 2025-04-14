import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../components/ThemeContext';
import carIcon from '../assets/car.png';

// API Config (Ideally move to config.js)
const API_BASE_URL = 'http://192.168.147.210:5000';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// Adjust canvas size to fit screen width with reduced padding
const CANVAS_WIDTH = width - 40;
const CANVAS_HEIGHT = (CANVAS_WIDTH * 8) / 8;
const SPACE_WIDTH = CANVAS_WIDTH / 8.5;
const SPACE_HEIGHT = SPACE_WIDTH * 1.5;

const ParkingLot = () => {
  const { darkMode } = useContext(ThemeContext);
  const [spaces, setSpaces] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [lots, setLots] = useState([]);
  const navigation = useNavigation();

  // Fetch with retry logic
  const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay between retries
      }
    }
  };

  useEffect(() => {
    fetchParkingLots();
  }, []);

  useEffect(() => {
    if (selectedLot) {
      fetchParkingStatus();
      const statusInterval = setInterval(fetchParkingStatus, 2000);
      return () => clearInterval(statusInterval);
    }
  }, [selectedLot]);

  const fetchParkingLots = async () => {
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/api/parking-lots`);
      if (!Array.isArray(data)) {
        Alert.alert('Error', 'Invalid parking lots data received');
        setLots([]);
        return;
      }
      setLots(data);
      const lastLot = await AsyncStorage.getItem('last_selected_lot');
      setSelectedLot((lastLot && data.some(lot => lot.id === lastLot)) ? lastLot : (data[0]?.id || null));
    } catch (error) {
      Alert.alert('Error', 'Unable to load parking lots. Please try again later.');
      setLots([]);
    }
  };

  const fetchParkingStatus = async () => {
    if (!selectedLot) return;
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/api/parking-status?lot=${selectedLot}`);
      if (!Array.isArray(data)) {
        throw new Error('Invalid parking status data received');
      }
      setSpaces(data);
    } catch (error) {
      Alert.alert('Error', 'Unable to load parking status. Please check your connection.');
      setSpaces([]);
    }
  };

  const topRow = spaces.slice(0, 8);
  const middleRow = spaces.slice(8, 16);
  const bottomRow = spaces.slice(16, 24);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, darkMode ? styles.darkText : styles.lightText]}>
        Parking Availability
      </Text>
      <Text style={[styles.subtitle, darkMode ? styles.darkSubtitle : styles.lightSubtitle]}>
        Select a lot and tap an available space to navigate
      </Text>

      <View style={[styles.pickerContainer, darkMode ? styles.darkPickerContainer : styles.lightPickerContainer]}>
        <Picker
          selectedValue={selectedLot}
          style={[styles.picker, darkMode ? styles.darkPicker : styles.lightPicker]}
          onValueChange={(itemValue) => {
            setSelectedLot(itemValue);
            AsyncStorage.setItem('last_selected_lot', itemValue).catch(() => {
              // Silently fail; non-critical
            });
          }}
        >
          {lots.map((lot) => (
            <Picker.Item key={lot.id} label={lot.name} value={lot.id} />
          ))}
        </Picker>
      </View>

      <View style={[styles.layoutCard, darkMode ? styles.darkCard : styles.lightCard]}>
        <Text style={[styles.sectionTitle, darkMode ? styles.darkText : styles.lightText]}>
          Parking Layout - {selectedLot || 'Select a Lot'}
        </Text>

        {/* Legend */}
        <View style={[styles.legend, darkMode ? styles.darkLegend : styles.lightLegend]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.available]} />
            <Text style={[styles.legendText, darkMode ? styles.darkText : styles.lightText]}>
              Available
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.occupied]} />
            <Text style={[styles.legendText, darkMode ? styles.darkText : styles.lightText]}>
              Occupied
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.reserved]} />
            <Text style={[styles.legendText, darkMode ? styles.darkText : styles.lightText]}>
              Disabled
            </Text>
          </View>
        </View>

        {/* Parking Lot Container */}
        <View style={[styles.parkingLotContainer, darkMode ? styles.darkParkingLot : styles.lightParkingLot]}>
          {/* Top Row */}
          <View style={styles.rowContainer}>
            {topRow.map((space) => (
              <TouchableOpacity
                key={space.space_id}
                style={[
                  styles.parkingSlot,
                  space.status === 'occupied' ? styles.occupied :
                  space.status === 'available' ? styles.available :
                  styles.reserved,
                  darkMode ? styles.darkSlot : styles.lightSlot
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (space.status === 'occupied') {
                    Alert.alert('Navigation Restricted', 'This space is currently occupied.');
                  } else {
                    if (space.status === 'reserved') {
                      Alert.alert('Handicap Spot', 'This is a handicap parking space.');
                    }
                    navigation.navigate('Navigation', {
                      spaceNumber: space.space_number,
                      latitude: space.latitude,
                      longitude: space.longitude,
                    });
                  }
                }}
              >
                {space.status === 'occupied' && (
                  <Image source={carIcon} style={styles.carIconSmall} />
                )}
                {space.status === 'reserved' && (
                  <Text style={styles.reservedSymbol}>♿</Text>
                )}
                <Text style={[styles.slotText, darkMode ? styles.darkSlotText : styles.lightSlotText]}>
                  {space.space_number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Driving Lane */}
          <View style={[styles.drivingLane, darkMode ? styles.darkDrivingLane : styles.lightDrivingLane]}>
            <View style={[styles.arrowLeft, darkMode ? styles.darkArrow : styles.lightArrow]} />
          </View>

          {/* Middle Row */}
          <View style={styles.rowContainer}>
            {middleRow.map((space) => (
              <TouchableOpacity
                key={space.space_id}
                style={[
                  styles.parkingSlot,
                  space.status === 'occupied' ? styles.occupied :
                  space.status === 'available' ? styles.available :
                  styles.reserved,
                  darkMode ? styles.darkSlot : styles.lightSlot
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (space.status === 'occupied') {
                    Alert.alert('Navigation Restricted', 'This space is currently occupied.');
                  } else {
                    if (space.status === 'reserved') {
                      Alert.alert('Handicap Spot', 'This is a handicap parking space.');
                    }
                    navigation.navigate('Navigation', {
                      spaceNumber: space.space_number,
                      latitude: space.latitude,
                      longitude: space.longitude,
                    });
                  }
                }}
              >
                {space.status === 'occupied' && (
                  <Image source={carIcon} style={styles.carIconSmall} />
                )}
                {space.status === 'reserved' && (
                  <Text style={styles.reservedSymbol}>♿</Text>
                )}
                <Text style={[styles.slotText, darkMode ? styles.darkSlotText : styles.lightSlotText]}>
                  {space.space_number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Driving Lane */}
          <View style={[styles.drivingLane, darkMode ? styles.darkDrivingLane : styles.lightDrivingLane]}>
            <View style={[styles.arrowLeft, darkMode ? styles.darkArrow : styles.lightArrow]} />
          </View>

          {/* Bottom Row */}
          <View style={styles.rowContainer}>
            {bottomRow.map((space) => (
              <TouchableOpacity
                key={space.space_id}
                style={[
                  styles.parkingSlot,
                  space.status === 'occupied' ? styles.occupied :
                  space.status === 'available' ? styles.available :
                  styles.reserved,
                  darkMode ? styles.darkSlot : styles.lightSlot
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  if (space.status === 'occupied') {
                    Alert.alert('Navigation Restricted', 'This space is currently occupied.');
                  } else {
                    if (space.status === 'reserved') {
                      Alert.alert('Handicap Spot', 'This is a handicap parking space.');
                    }
                    navigation.navigate('Navigation', {
                      spaceNumber: space.space_number,
                      latitude: space.latitude,
                      longitude: space.longitude,
                    });
                  }
                }}
              >
                {space.status === 'occupied' && (
                  <Image source={carIcon} style={styles.carIconSmall} />
                )}
                {space.status === 'reserved' && (
                  <Text style={styles.reservedSymbol}>♿</Text>
                )}
                <Text style={[styles.slotText, darkMode ? styles.darkSlotText : styles.lightSlotText]}>
                  {space.space_number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  lightContainer: {
    backgroundColor: '#f7f9fc',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lightPickerContainer: {
    backgroundColor: '#fff',
    borderColor: '#e0e6ed',
  },
  darkPickerContainer: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  picker: {
    width: '100%',
  },
  lightPicker: {
    backgroundColor: '#fff',
    color: '#1a2e44',
  },
  darkPicker: {
    backgroundColor: '#333',
    color: '#f7f9fc',
  },
  layoutCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  lightCard: {
    backgroundColor: '#fff',
    borderColor: '#e0e6ed',
  },
  darkCard: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  lightLegend: {
    borderBottomColor: '#e0e6ed',
  },
  darkLegend: {
    borderBottomColor: '#555',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  parkingLotContainer: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  lightParkingLot: {
    backgroundColor: '#e8ecef',
  },
  darkParkingLot: {
    backgroundColor: '#2a2a2a',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CANVAS_WIDTH,
    height: SPACE_HEIGHT,
    paddingHorizontal: 5,
    alignSelf: 'center',
  },
  parkingSlot: {
    width: SPACE_WIDTH,
    height: SPACE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lightSlot: {
    borderColor: '#d0d7e1',
  },
  darkSlot: {
    borderColor: '#555',
  },
  available: {
    backgroundColor: '#81c784', // Green for available
  },
  occupied: {
    backgroundColor: '#f8d7da', // Red for occupied
  },
  reserved: {
    backgroundColor: '#cce5ff', // Blue for handicap
  },
  reservedSymbol: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  carIconSmall: {
    width: SPACE_WIDTH * 0.6,
    height: SPACE_HEIGHT * 0.3,
    marginBottom: 2,
    transform: [{ rotate: '180deg' }],
  },
  slotText: {
    fontSize: 10,
    fontWeight: '500',
  },
  drivingLane: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT / 10,
    position: 'relative',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  lightDrivingLane: {
    backgroundColor: '#e8ecef',
    borderColor: '#d0d7e1',
  },
  darkDrivingLane: {
    backgroundColor: '#2a2a2a',
    borderColor: '#555',
  },
  arrowLeft: {
    width: 15,
    height: 15,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    left: CANVAS_WIDTH / 2 - 7.5,
    top: CANVAS_HEIGHT / 20 - 7.5,
  },
  lightArrow: {
    borderColor: '#FFFFFF',
  },
  darkArrow: {
    borderColor: '#f7f9fc',
  },
  lightText: {
    color: '#1a2e44',
  },
  darkText: {
    color: '#f7f9fc',
  },
  lightSubtitle: {
    color: '#5a6e88',
  },
  darkSubtitle: {
    color: '#999',
  },
  lightSlotText: {
    color: '#1a2e44',
  },
  darkSlotText: {
    color: '#f7f9fc',
  },
});

export default ParkingLot;