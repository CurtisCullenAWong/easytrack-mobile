import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, SegmentedButtons } from 'react-native-paper'
import Header from '../../customComponents/Header'
import PendingReceipts from './PendingReceipts'
import CompletedReceipts from './CompletedReceipts'

const TransactionManagement = ({ navigation, route }) => {
  const { colors } = useTheme()
  const [receiptSegment, setReceiptSegment] = useState('pending')

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Transaction Management" />

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={receiptSegment}
          onValueChange={setReceiptSegment}
          buttons={[
            { value: 'pending', label: 'Pending Receipts' },
            { value: 'completed', label: 'Completed Receipts' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {receiptSegment === 'pending' ? (
          <PendingReceipts navigation={navigation} />
        ) : (
          <CompletedReceipts navigation={navigation} />
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
    marginTop: '10%',
    marginBottom: 5,
  },
  content: {
    flex: 9,
  },
})

export default TransactionManagement 