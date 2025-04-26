import React, { useState, useEffect } from 'react';
import { View, Animated, FlatList } from 'react-native';
import { Text, Button, Card, Avatar, Divider, Menu, IconButton, useTheme } from 'react-native-paper';
import Header from '../../customComponents/Header';

const MOCK_BOOKINGS = [
  { id: '1', bookingId: 'A4G-BUIN8-IAS09855', passengerId: '2022-15482324253', passengerName: 'Naiza F. Albina', fare: '₱ 185', fromLocation: 'SM CITY North EDSA Main Entrance', toLocation: '76 P Florentino Street' },
  { id: '2', bookingId: 'A5X-JK98K-QWE09233', passengerId: '2023-12345678901', passengerName: 'Miguel S. Cruz', fare: '₱ 210', fromLocation: 'Ayala Center Cebu', toLocation: 'Mactan Airport' },
  { id: '3', bookingId: 'A5X-JK98K-QWE09233', passengerId: '2023-12345678901', passengerName: 'Miguel S. Cruz', fare: '₱ 210', fromLocation: 'Ayala Center Cebu', toLocation: 'Mactan Airport' },
];

const AirlineContracts = ({ navigation }) => {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState('');
  const [sortedBookings, setSortedBookings] = useState(MOCK_BOOKINGS);
  const [sortCriterion, setSortCriterion] = useState('none');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' }));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const sortBookings = (criterion, title) => {
    const sortedArray = [...MOCK_BOOKINGS].sort((a, b) => {
      if (criterion === 'fare') return parseInt(a.fare.replace('₱', '').replace(',', '')) - parseInt(b.fare.replace('₱', '').replace(',', ''));
      return a[criterion].localeCompare(b[criterion]);
    });
    setSortedBookings(sortedArray);
    setSortCriterion(title);
    setMenuVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[styles.stickyHeader, { backgroundColor: colors.elevation.level1 }]}>
        <Header navigation={navigation} />
        <Card style={[styles.dateCard, { backgroundColor: colors.elevation.level1 }]}>
          <Card.Content style={styles.dateContent}><Text variant="titleSmall" style={[styles.dateText, { color: colors.onSurface }]}>{currentTime}</Text></Card.Content>
        </Card>

        <View style={styles.sortOptionsContainer}>
          <Text style={[styles.sortLabel, { color: colors.onSurface }]}>Sort by:</Text>
          <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)}>{sortCriterion === 'none' ? 'Sort by' : sortCriterion}</Button>}>
            {[
              { criterion: 'bookingId', title: 'Booking ID' },
              { criterion: 'passengerName', title: 'Passenger Name' },
              { criterion: 'fare', title: 'Fare' },
            ].map(option => (
              <Menu.Item key={option.criterion} onPress={() => sortBookings(option.criterion, option.title)} title={option.title} />
            ))}
          </Menu>
        </View>
      </Animated.View>

      <FlatList
        data={sortedBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={{ paddingTop: '60%', paddingHorizontal: '5%', paddingBottom:'5%' }} // Add space for the sticky header
      />
    </View>
  );
};

const BookingCard = ({ booking }) => {
  const { colors } = useTheme();
  return (
    <Card style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.bookingHeader}>
          <Text variant="labelSmall" style={[styles.labelText, { color: colors.onSurface }]}>BOOKING ID</Text>
          <Text variant="labelSmall" style={[styles.labelText, { color: colors.onSurface }]}>{booking.bookingId}</Text>
        </View>
        <Divider />

        <View style={styles.passengerInfo}>
          <Avatar.Image size={40} source={require('../../../assets/profile-placeholder.png')} style={{ backgroundColor: colors.disabled, marginRight: 10 }} />
          <View>
            <Text style={[styles.bookingIdText, { color: colors.onSurface }]}>{booking.passengerId}</Text>
            <Text style={[styles.passengerNameText, { color: colors.onSurface }]}>{booking.passengerName}</Text>
          </View>
        </View>
        <Divider />

        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.onSurface }]}>FARE:</Text>
          <Text style={[styles.fareValue, { color: colors.primary }]}>{booking.fare}</Text>
        </View>
        <Divider />

        <View style={styles.locationContainer}>
          <View style={styles.locationItem}>
            <IconButton icon="map-marker" size={20} color="blue" />
            <Text style={[styles.locationText, { color: colors.onSurface }]}>{booking.fromLocation}</Text>
          </View>
          <View style={styles.locationItem}>
            <IconButton icon="map-marker" size={20} color="red" />
            <Text style={[styles.locationText, { color: colors.onSurface }]}>{booking.toLocation}</Text>
          </View>
        </View>

        <Button mode="contained" onPress={() => console.log('Check Location')} style={[styles.checkLocationButton, { backgroundColor: colors.primary }]}>
          CHECK LOCATION
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = {
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, width: '100%' },
  dateCard: { borderRadius: 10, marginVertical: 10 },
  dateContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dateText: { fontWeight: 'bold' },
  bookingCard: { marginTop: 10, borderRadius: 10, elevation: 2 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  labelText: { fontWeight: 'bold' },
  passengerInfo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  bookingIdText: { fontSize: 14, fontWeight: 'bold' },
  passengerNameText: { fontSize: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  label: { fontSize: 12, fontWeight: 'bold' },
  fareValue: { fontSize: 14, fontWeight: 'bold' },
  locationContainer: { paddingVertical: 10 },
  locationItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  locationText: { fontSize: 14 },
  checkLocationButton: { borderRadius: 25, marginTop: 20, alignSelf: 'center', width: '80%', elevation: 3, marginBottom: 30 },
  sortOptionsContainer: { paddingHorizontal: 16, marginBottom: '5%' },
  sortLabel: { fontWeight: 'bold', marginBottom: 8 },
};

export default AirlineContracts;
