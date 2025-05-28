import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Appbar } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const CheckLocation = ({ route, navigation }) => {
  const { colors, fonts } = useTheme();
  const [currentLocation, setCurrentLocation] = useState(null);
  const { dropOffLocation, dropOffLocationGeo } = route.params;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      } catch (error) {
        console.error('Failed to get current location:', error);
      }
    })();
  }, []);

  const parseGeometry = (geoString) => {
    if (!geoString) return null;

    try {
      if (typeof geoString === 'string') {
        const coords = geoString.replace('POINT(', '').replace(')', '').split(' ');
        return {
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1]),
        };
      } else if (typeof geoString === 'object' && geoString.coordinates) {
        return {
          longitude: parseFloat(geoString.coordinates[0]),
          latitude: parseFloat(geoString.coordinates[1]),
        };
      }
    } catch (error) {
      console.error('Error parsing geometry:', error);
    }

    return null;
  };

  const dropOffCoords = parseGeometry(dropOffLocationGeo);

  const defaultRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const mapRegion = dropOffCoords
    ? {
        latitude: dropOffCoords.latitude,
        longitude: dropOffCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : defaultRegion;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('BookingManagement')} />
        <Appbar.Content title="Drop-Off Location" />
      </Appbar.Header>

      <View style={styles.header}>
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
          {dropOffLocation || 'No address provided'}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
        >
          {dropOffCoords && (
            <Marker
              coordinate={dropOffCoords}
              title="Drop-off Location"
              description={dropOffLocation}
              pinColor={colors.error}
            />
          )}

          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              }}
              title="Your Location"
              pinColor={colors.primary}
            />
          )}
        </MapView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    margin: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default CheckLocation;
