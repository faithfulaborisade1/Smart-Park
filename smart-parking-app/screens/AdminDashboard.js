import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        const checkAdmin = async () => {
            const adminStatus = await AsyncStorage.getItem('isAdmin');
            if (adminStatus !== 'true') {
                Alert.alert("Access Denied", "Only admin can access this page.");
                navigation.navigate('HomeTabs'); // Redirect non-admins
            } else {
                setIsAdmin(true);
            }
            setLoading(false);
        };

        checkAdmin();
    }, []);

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return isAdmin ? (
        <View style={styles.container}>
            <Text style={styles.title}>🚀 Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage Parking & Notifications</Text>

            {/* Manage Parking (Change Status) */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ManageParking')}>
                <Text style={styles.buttonText}>Manage Parking</Text>
            </TouchableOpacity>

            {/* Send Notifications */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SendNotification')}>
                <Text style={styles.buttonText}>Send Notification</Text>
            </TouchableOpacity>

            {/* Add Parking Lot */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AddParkingLot')}>
                <Text style={styles.buttonText}>Add Parking Lot</Text>
            </TouchableOpacity>
        </View>
    ) : null;
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f7f9fc' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 16, textAlign: 'center', color: '#5a6e88', marginBottom: 20 },
    button: { backgroundColor: '#4682B4', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default AdminDashboard;
