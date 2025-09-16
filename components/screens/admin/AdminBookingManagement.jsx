import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SegmentedButtons, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'
import Booking from '../airline/subscreen/Booking'
import BookingList from './subscreen/booking_management/AdminBookingList'
const AdminBookingManagement = ({ navigation }) => {
  const { colors } = useTheme()
  const [mode, setMode] = useState('made')

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Booking Management" />

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={mode}
          onValueChange={setMode}
          buttons={[
            { value: 'made', label: 'Booking List' },
            { value: 'create', label: 'Booking' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {mode === 'made' ? (
          <BookingList navigation={navigation} />
        ) : (
          <Booking navigation={navigation} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 2,
  },
  segmentContainer: {
    marginTop: '4%',
    marginBottom: 5,
  },
  content: {
    flex: 9,
  },
})

export default AdminBookingManagement
