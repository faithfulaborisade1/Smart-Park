import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../components/ThemeContext';

// API Config (Ideally move to config.js)
const API_BASE_URL = 'http://192.168.77.210:5000';

// Parking lots data from the image
const parkingLots = [
  { id: 'BUS1', name: 'Business Building', description: 'Main parking for business faculty', total_spaces: 24 },
  { id: 'BUS2', name: 'Business Building B', description: 'Additional parking for business faculty', total_spaces: 24 },
  { id: 'ENG1', name: 'Engineering Building Back', description: 'Parking lot at the back of the engineering building', total_spaces: 24 },
  { id: 'ENG2', name: 'Engineering Building B', description: 'Secondary lot for engineering students', total_spaces: 24 },
  { id: 'ENG3', name: 'Engineering Building C', description: 'Overflow parking for engineering', total_spaces: 24 },
];

const ManageParking = () => {
  const { darkMode } = useContext(ThemeContext);
  const [selectedLot, setSelectedLot] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [newStatus, setNewStatus] = useState('available');
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch with retry logic
  const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  // Fetch spaces for the selected lot
  useEffect(() => {
    if (selectedLot) {
      fetchSpaces();
    }
  }, [selectedLot]);

  const fetchSpaces = async () => {
    setLoadingSpaces(true);
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/api/parking-status?lot=${selectedLot}`);
      if (!Array.isArray(data)) {
        throw new Error('Invalid parking spaces data received');
      }
      setSpaces(data);
      setSelectedSpace(data[0]?.space_id || null); // Default to first space
    } catch (error) {
      Alert.alert('Error', 'Unable to load parking spaces. Please try again.');
      setSpaces([]);
      setSelectedSpace(null);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedSpace) {
      Alert.alert('Error', 'Please select a parking space.');
      return;
    }

    const currentSpace = spaces.find(space => space.space_id === selectedSpace);
    if (currentSpace.status === newStatus) {
      Alert.alert('No Change', 'The space already has this status.');
      return;
    }

    Alert.alert(
      'Confirm Update',
      `Are you sure you want to update Space ${currentSpace.space_number} in ${selectedLot} to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdating(true);
            try {
              const responseData = await fetchWithRetry(
                `${API_BASE_URL}/api/update-parking-status/${selectedSpace}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus }),
                }
              );

              if (responseData.message) {
                Alert.alert('Success', 'Parking status updated successfully!');
                fetchSpaces(); // Refresh spaces after update
                setNewStatus('available'); // Reset status
              } else {
                Alert.alert('Error', responseData.error || 'Failed to update status.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to connect to server. Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const currentSpace = spaces.find(space => space.space_id === selectedSpace);

  return (
    <View style={[styles.container, darkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.title, darkMode ? styles.darkText : styles.lightText]}>
        🚗 Manage Parking Status
      </Text>

      {/* Parking Lot Selection */}
      <View style={[styles.card, darkMode ? styles.darkCard : styles.lightCard]}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} style={styles.icon} />
            <Text style={[styles.sectionTitle, darkMode ? styles.darkText : styles.lightText]}>
              Select Parking Lot
            </Text>
          </View>
          <View style={[styles.pickerContainer, darkMode ? styles.darkPickerContainer : styles.lightPickerContainer]}>
            <Picker
              selectedValue={selectedLot}
              onValueChange={(itemValue) => {
                setSelectedLot(itemValue);
                setSelectedSpace(null); // Reset space selection
              }}
              style={[styles.picker, darkMode ? styles.darkPicker : styles.lightPicker]}
              enabled={!loadingSpaces && !updating}
            >
              <Picker.Item label="Select a lot" value={null} />
              {parkingLots.map((lot) => (
                <Picker.Item key={lot.id} label={`${lot.name} (${lot.description})`} value={lot.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Space Selection */}
        {selectedLot && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-outline" size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} style={styles.icon} />
              <Text style={[styles.sectionTitle, darkMode ? styles.darkText : styles.lightText]}>
                Select Parking Space
              </Text>
            </View>
            {loadingSpaces ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={darkMode ? '#f7f9fc' : '#4682B4'} />
                <Text style={[styles.loadingText, darkMode ? styles.darkText : styles.lightText]}>
                  Loading spaces...
                </Text>
              </View>
            ) : spaces.length === 0 ? (
              <Text style={[styles.emptyText, darkMode ? styles.darkText : styles.lightText]}>
                No spaces found for this lot.
              </Text>
            ) : (
              <View style={[styles.pickerContainer, darkMode ? styles.darkPickerContainer : styles.lightPickerContainer]}>
                <Picker
                  selectedValue={selectedSpace}
                  onValueChange={(itemValue) => setSelectedSpace(itemValue)}
                  style={[styles.picker, darkMode ? styles.darkPicker : styles.lightPicker]}
                  enabled={!updating}
                >
                  {spaces.map((space) => (
                    <Picker.Item
                      key={space.space_id}
                      label={`Space ${space.space_number} (Current: ${space.status})`}
                      value={space.space_id}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        )}

        {/* Status Update */}
        {selectedSpace && !loadingSpaces && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={24} color={darkMode ? '#f7f9fc' : '#4682B4'} style={styles.icon} />
              <Text style={[styles.sectionTitle, darkMode ? styles.darkText : styles.lightText]}>
                Update Status
              </Text>
            </View>
            <Text style={[styles.infoText, darkMode ? styles.darkText : styles.lightText]}>
              Current Status: {currentSpace?.status || 'Unknown'}
            </Text>
            <View style={[styles.pickerContainer, darkMode ? styles.darkPickerContainer : styles.lightPickerContainer]}>
              <Picker
                selectedValue={newStatus}
                onValueChange={(itemValue) => setNewStatus(itemValue)}
                style={[styles.picker, darkMode ? styles.darkPicker : styles.lightPicker]}
                enabled={!updating}
              >
                <Picker.Item label="Available" value="available" />
                <Picker.Item label="Occupied" value="occupied" />
                <Picker.Item label="Reserved" value="reserved" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.updateButton, updating && styles.buttonDisabled]}
              onPress={handleUpdateStatus}
              disabled={updating}
            >
              <Text style={styles.updateButtonText}>
                {updating ? 'Updating...' : 'Update Status'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 15,
    elevation: 4,
    borderWidth: 1,
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#4682B4',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  lightText: {
    color: '#1a2e44',
  },
  darkText: {
    color: '#f7f9fc',
  },
});

export default ManageParking;