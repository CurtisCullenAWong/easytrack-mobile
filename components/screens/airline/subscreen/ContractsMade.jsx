import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme } from 'react-native-paper'

const MOCK_BOOKINGS = [
  { id: '1', bookingId: 'A4G-BUIN8-IAS09855', passengerId: '2022-15482324253', passengerName: 'Naiza F. Albina', fare: '₱ 185', fromLocation: 'SM CITY North EDSA Main Entrance', toLocation: '76 P Florentino Street' },
  { id: '2', bookingId: 'A5X-JK98K-QWE09233', passengerId: '2023-12345678901', passengerName: 'Miguel S. Cruz', fare: '₱ 210', fromLocation: 'Ayala Center Cebu', toLocation: 'Mactan Airport' },
]

const ContractsMade = () => {
  const { colors, fonts } = useTheme()
  const [currentTime, setCurrentTime] = useState('')
  const [sortedBookings, setSortedBookings] = useState(MOCK_BOOKINGS)

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Manila',
        })
      )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const BookingCard = ({ booking }) => (
    <Card style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.bookingCardHeader}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>BOOKING ID</Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{booking.bookingId}</Text>
        </View>
        <Divider />
        <View style={styles.passengerInfoContainer}>
          <Avatar.Image
            size={40}
            source={require('../../../../assets/profile-placeholder.png')}
            style={styles.avatarImage}
          />
          <View>
            <Text style={[fonts.labelSmall, { fontWeight: 'bold', color: colors.primary }]}>{booking.passengerId}</Text>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>{booking.passengerName}</Text>
          </View>
        </View>
        <Divider />
        <View style={styles.fareInfoContainer}>
          <Text style={[fonts.labelSmall, styles.fareLabel]}>FARE:</Text>
          <Text style={[fonts.bodySmall, styles.fareAmount]}>{booking.fare}</Text>
        </View>
        <Divider />
        <View style={styles.locationContainer}>
          {[{ location: booking.fromLocation, color: colors.primary }, { location: booking.toLocation, color: colors.error }].map(
            (loc, idx) => (
              <View key={idx} style={styles.locationRow}>
                <IconButton icon="map-marker" size={20} iconColor={loc.color} />
                <Text style={[fonts.bodySmall, styles.locationText]}>{loc.location}</Text>
              </View>
            )
          )}
        </View>
        <Button mode="contained" onPress={() => console.log('Track Delivery')} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          Track Delivery
        </Button>
        <Button mode="contained" onPress={() => console.log('Show Details')} style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          Show Details
        </Button>
        <Button mode="contained" onPress={() => console.log('Cancel')} style={[styles.actionButton, { backgroundColor: colors.error }]}>
          Cancel Contract
        </Button>
      </Card.Content>
    </Card>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ListHeaderComponent={
          <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
              <Card.Content style={styles.timeCardContent}>
                <Text style={fonts.titleSmall}>{currentTime}</Text>
              </Card.Content>
            </Card>
          </View>
        }
        data={sortedBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  timeCard: {
    borderRadius: 10,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  timeCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  bookingCard: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarImage: {
    marginRight: 10,
  },
  fareInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  fareLabel: {
    fontWeight: 'bold',
  },
  fareAmount: {
    fontWeight: 'bold',
  },
  locationContainer: {
    paddingVertical: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationText: {
    flex: 1,
  },
  actionButton: {
    borderRadius: 25,
    marginTop: 10,
    alignSelf: 'center',
    width: '80%',
  },
  flatListContent: {
    paddingBottom: 20,
  },
})

export default ContractsMade
