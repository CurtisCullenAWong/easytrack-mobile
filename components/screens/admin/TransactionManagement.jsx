import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme, SegmentedButtons } from 'react-native-paper'
import Header from '../../customComponents/Header'
import PendingContracts from './subscreen/PendingContracts'
import SummarizedContracts from './subscreen/SummarizedContracts'

const TransactionManagement = ({ navigation, route }) => {
  const { colors } = useTheme()
  const [activeSegment, setActiveSegment] = useState('pending')

  useEffect(() => {
    const incomingSegment = route?.params?.segment
    if (incomingSegment && (incomingSegment === 'pending' || incomingSegment === 'completed')) {
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
            { value: 'pending', label: 'Pending Contracts' },
            { value: 'completed', label: 'Summarized Contracts' },
          ]}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={styles.content}>
        {activeSegment === 'pending' ? (
          <PendingContracts navigation={navigation} />
        ) : (
          <SummarizedContracts navigation={navigation} />
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