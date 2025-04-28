import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Card, Divider, useTheme, Avatar, Button } from 'react-native-paper'
import Header from '../customComponents/Header'
import DraggableFAB from '../customComponents/DraggableFAB'

const MOCK_TRANSACTIONS = [
  { id: '1', transactionId: 'TXN-981237', date: '2025-04-25', passengerName: 'Naiza F. Albina', amount: '₱ 185', status: 'Paid' },
  { id: '2', transactionId: 'TXN-981238', date: '2025-04-26', passengerName: 'Miguel S. Cruz', amount: '₱ 210', status: 'Pending' },
  { id: '3', transactionId: 'TXN-981239', date: '2025-04-26', passengerName: 'Miguel S. Cruz', amount: '₱ 210', status: 'Paid' },
]

const TransactionHistory = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => setCurrentTime(
      new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' })
    )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const TransactionCard = ({ transaction }) => (
    <Card style={[styles.transactionCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>TRANSACTION ID</Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{transaction.transactionId}</Text>
        </View>
        <Divider />
        <View style={styles.passengerInfoContainer}>
          <Avatar.Image size={40} source={require('../../assets/profile-placeholder.png')} style={styles.avatarImage} />
          <View>
            <Text style={[fonts.labelSmall, { fontWeight: 'bold', color: colors.primary }]}>{transaction.passengerName}</Text>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>Date: {transaction.date}</Text>
          </View>
        </View>
        <Divider />
        <View style={styles.amountInfoContainer}>
          <Text style={[fonts.labelSmall, styles.amountLabel]}>AMOUNT:</Text>
          <Text style={[fonts.bodyMedium, styles.amount]}>{transaction.amount}</Text>
        </View>
        <Divider />
        <View style={styles.statusContainer}>
          <Text style={[fonts.labelSmall, styles.statusLabel]}>STATUS:</Text>
          <Text style={[fonts.bodySmall, { color: transaction.status === 'Paid' ? colors.primary : colors.error }]}>{transaction.status}</Text>
        </View>
        <Button mode="contained" onPress={() => console.log('View Transaction')} style={{...styles.actionButton, backgroundColor: colors.primary }}>
          View Details
        </Button>
      </Card.Content>
    </Card>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFAB/>
      <FlatList
        ListHeaderComponent={
          <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} title={'Transaction History'} />
            <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
              <Card.Content style={styles.timeCardContent}>
                <Text style={fonts.titleSmall}>{currentTime}</Text>
              </Card.Content>
            </Card>
          </View>
        }
        data={MOCK_TRANSACTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard transaction={item} />}
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
  transactionCard: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  transactionHeader: {
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
  amountInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  amountLabel: {
    fontWeight: 'bold',
  },
  amount: {
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statusLabel: {
    fontWeight: 'bold',
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

export default TransactionHistory
