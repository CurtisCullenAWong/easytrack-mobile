import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SegmentedButtons, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'
import PickupLuggage from './subscreen/PickupLuggage'
import ContractsInTransit from './subscreen/ContractsInTransit'

const DeliveryBookingManagement = ({ navigation }) => {
  const { colors } = useTheme()
  const [mode, setMode] = useState(1)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Booking Management" />
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={mode}
          onValueChange={setMode}
          buttons={[
            { value: 1, label: 'Pickup Luggage' },
            { value: 2, label: 'In Transit' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <View style={styles.content}>
        {mode === 1 ? (
          <PickupLuggage navigation={navigation} />
        ) : (
          <ContractsInTransit navigation={navigation} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  segmentedButtons: {
    width: '100%',
  },
  content: {
    flex: 1,
  },
})

export default DeliveryBookingManagement
