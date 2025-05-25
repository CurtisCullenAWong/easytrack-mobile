import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SegmentedButtons, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'
import AcceptContracts from './subscreen/AcceptContracts'
import ContractsAccepted from './subscreen/ContractsAccepted'

const BookingManagement = ({ navigation }) => {
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
            { value: 1, label: 'Accept Contracts' },
            { value: 2, label: 'Contracts Accepted' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {mode === 1 ? (
          <AcceptContracts navigation={navigation} />
        ) : (
          <ContractsAccepted navigation={navigation} />
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
    marginTop: 10,
    marginBottom: 5,
  },
  content: {
    flex: 9, // ensures content expands to fill space and doesn't center
  },
})

export default BookingManagement
