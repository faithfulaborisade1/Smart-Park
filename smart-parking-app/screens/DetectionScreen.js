import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const DetectionScreen = () => {
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);

  // Fetch detections from the backend periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://192.168.80.210:5001/detections')  // Backend API endpoint
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setDetections(data.detections || []);
            setError(null); // Clear any previous errors
          }
        })
        .catch((err) => setError('Failed to fetch detections'));
    }, 1000); // Poll every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>YOLOv11 Detections</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={detections}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.detection}>
            <Text>Class Name: {item.class_name}</Text>
            <Text>Class ID: {item.class_id}</Text>
            <Text>Confidence: {item.confidence.toFixed(2)}</Text>
            <Text>Coordinates: {JSON.stringify(item.coordinates)}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  error: { color: 'red', marginBottom: 10 },
  detection: { marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 },
});

export default DetectionScreen;
