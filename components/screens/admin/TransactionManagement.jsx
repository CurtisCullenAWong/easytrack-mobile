import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, SegmentedButtons } from 'react-native-paper'
import Header from '../../customComponents/Header'
import PendingContracts from './subscreen/PendingContracts'
import SummarizedContracts from './subscreen/SummarizedContracts'
import DeliveryRates from './subscreen/transaction_management_subscreen/DeliveryRates'

const TransactionManagement = ({ navigation, route }) => {
  const { colors } = useTheme()
  const [activeSegment, setActiveSegment] = useState('pending')

  useEffect(() => {
    const incomingSegment = route?.params?.segment
    if (incomingSegment && (incomingSegment === 'pending' || incomingSegment === 'completed' || incomingSegment === 'rates')) {
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
            { value: 'pending', label: 'Pending', icon: 'clock-outline' },
            { value: 'completed', label: 'Summarized', icon: 'check-circle-outline' },
            { value: 'rates', label: 'Rates', icon: 'currency-php' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {activeSegment === 'pending' ? (
          <PendingContracts navigation={navigation} />
        ) : activeSegment === 'completed' ? (
          <SummarizedContracts navigation={navigation} />
        ) : (
          <DeliveryRates navigation={navigation} />
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