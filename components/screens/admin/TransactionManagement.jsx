import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, SegmentedButtons } from 'react-native-paper'
import Header from '../../customComponents/Header'
import Bookings from './subscreen/transaction_management_subscreen/ToPay'
import Invoices from './subscreen/transaction_management_subscreen/Invoices'
import Rate from './subscreen/transaction_management_subscreen/Rate'

const TransactionManagement = ({ navigation, route }) => {
  const { colors } = useTheme()
  const [activeSegment, setActiveSegment] = useState('to_pay')

  useEffect(() => {
    const incomingSegment = route?.params?.segment
    if (incomingSegment && (incomingSegment === 'to_pay' || incomingSegment === 'invoices' || incomingSegment === 'rate')) {
      setActiveSegment(incomingSegment)
    }
  }, [route?.params?.segment])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Manage Transactions" />

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={activeSegment}
          onValueChange={setActiveSegment}
          buttons={[
            { value: 'to_pay', label: 'To Pay', icon: 'book-outline' },
            { value: 'invoices', label: 'Invoices', icon: 'file-document-outline' },
            { value: 'rate', label: 'Rate', icon: 'currency-php' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {activeSegment === 'to_pay' ? (
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