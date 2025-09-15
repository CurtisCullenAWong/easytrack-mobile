import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, SegmentedButtons } from 'react-native-paper'
import Header from '../../customComponents/Header'
import Bookings from './subscreen/Bookings'
import Invoices from './subscreen/Invoices'
import Rate from './subscreen/transaction_management_subscreen/Rate'

const TransactionManagement = ({ navigation, route }) => {
  const { colors } = useTheme()
  const [activeSegment, setActiveSegment] = useState('bookings')

  useEffect(() => {
    const incomingSegment = route?.params?.segment
    if (incomingSegment && (incomingSegment === 'bookings' || incomingSegment === 'invoices' || incomingSegment === 'rate')) {
      setActiveSegment(incomingSegment)
    }
  }, [route?.params?.segment])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Transaction Management" />

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={activeSegment}
          onValueChange={setActiveSegment}
          buttons={[
            { value: 'bookings', label: 'To Pay', icon: 'book-outline' },
            { value: 'invoices', label: 'Invoices', icon: 'file-document-outline' },
            { value: 'rate', label: 'Rate', icon: 'currency-php' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {activeSegment === 'bookings' ? (
          <Bookings navigation={navigation} />
        ) : activeSegment === 'invoices' ? (
          <Invoices navigation={navigation} />
        ) : (
          <Rate navigation={navigation} />
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

export default TransactionManagement 