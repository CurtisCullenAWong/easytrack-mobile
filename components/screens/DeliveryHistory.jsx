import React, { useState, useEffect, useCallback } from 'react'
import { View, Animated, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, Menu, IconButton, useTheme } from 'react-native-paper'
import Header from '../customComponents/Header'
import DraggableFAB from '../customComponents/DraggableFAB'

const MOCK_DELIVERIES = [
  { id: '1', deliveryId: 'D4G-PRK9-LMNO123', passengerName: 'Naiza F. Albina', status: 'In Transit', fromLocation: 'SM CITY North EDSA', toLocation: '76 P Florentino Street' },
  { id: '2', deliveryId: 'D3X-QJK7-HIJ23445', passengerName: 'Miguel S. Cruz', status: 'Delivered', fromLocation: 'Ayala Center Cebu', toLocation: 'Mactan Airport' },
  { id: '3', deliveryId: 'D5X-JK98K-QWE09876', passengerName: 'Luis P. Garcia', status: 'In Transit', fromLocation: 'Robinsons Galleria', toLocation: 'Makati Central' },
  { id: '4', deliveryId: 'D7X-VKT9-LMN90876', passengerName: 'Sarah K. Tan', status: 'Pending', fromLocation: 'Bonifacio High Street', toLocation: 'Eastwood City' },
]

const DeliveryHistory = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [currentTime, setCurrentTime] = useState('')
  const [sortedDeliveries, setSortedDeliveries] = useState(MOCK_DELIVERIES)
  const [sortCriterion, setSortCriterion] = useState('none')
  const [menuVisible, setMenuVisible] = useState(false)

  useEffect(() => {
    const updateTime = () => setCurrentTime(
      new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' })
    )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const sortDeliveries = useCallback((criterion, title) => {
    const sortedArray = [...MOCK_DELIVERIES].sort((a, b) => {
      if (criterion === 'status') {
        return a.status.localeCompare(b.status)
      }
      return a[criterion].localeCompare(b[criterion])
    })
    setSortedDeliveries(sortedArray)
    setSortCriterion(title)
    setMenuVisible(false)
  }, [])

  const SortMenu = ({ sortCriterion, sortDeliveries }) => (
    <View style={styles.sortMenuContainer}>
      <Text style={[fonts.labelSmall, styles.sortMenuLabel]}>Sort by:</Text>
      <View style={[styles.sortMenuButtonContainer, { backgroundColor: colors.surface }]} >
        <Menu
          contentStyle={{ backgroundColor: colors.surface }}
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button onPress={() => setMenuVisible(true)}>
              {sortCriterion === 'none' ? 'Sort by' : sortCriterion}
            </Button>
          }
        >
          {[{ criterion: 'deliveryId', title: 'Delivery ID' },
          { criterion: 'passengerName', title: 'Passenger Name' },
          { criterion: 'status', title: 'Delivery Status' }]
            .map(option => (
              <Menu.Item
                key={option.criterion}
                onPress={() => sortDeliveries(option.criterion, option.title)}
                title={option.title}
                titleStyle={{ ...fonts.bodyMedium, color: colors.onSurface }}
              />
            ))}
        </Menu>
      </View>
    </View>
  )

  const DeliveryCard = ({ delivery }) => (
    <Card style={[styles.deliveryCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.deliveryCardHeader}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>DELIVERY ID</Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{delivery.deliveryId}</Text>
        </View>
        <Divider />
        <View style={styles.passengerInfoContainer}>
          <Avatar.Image size={40} source={require('../../assets/profile-placeholder.png')} style={styles.avatarImage} />
          <View>
            <Text style={[fonts.labelSmall, { fontWeight: 'bold', color: colors.primary }]}>{delivery.passengerName}</Text>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>{delivery.status}</Text>
          </View>
        </View>
        <Divider />
        <View style={styles.locationContainer}>
          {[{ location: delivery.fromLocation, color: colors.primary }, { location: delivery.toLocation, color: colors.error }]
            .map((loc, idx) => (
              <View key={idx} style={styles.locationRow}>
                <IconButton icon="map-marker" size={20} iconColor={loc.color} />
                <Text style={[fonts.bodySmall, styles.locationText]}>{loc.location}</Text>
              </View>
            ))}
        </View>
        <Button mode="contained" onPress={() => console.log('Track Delivery')} style={{...styles.actionButton, backgroundColor: colors.primary }}>
          Track Delivery
        </Button>
        <Button mode="contained" onPress={() => console.log('Show Details')} style={{...styles.actionButton, backgroundColor: colors.primary }}>
          Show Details
        </Button>
      </Card.Content>
    </Card>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DraggableFAB/>
      <FlatList
        ListHeaderComponent={
          <Animated.View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} title={'Delivery History'}/>
            <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
              <Card.Content style={styles.timeCardContent}>
                <Text style={fonts.titleSmall}>{currentTime}</Text>
              </Card.Content>
            </Card>
            {/* <SortMenu sortCriterion={sortCriterion} sortDeliveries={sortDeliveries} /> */}
          </Animated.View>
        }
        data={sortedDeliveries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DeliveryCard delivery={item} />}
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
  sortMenuContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sortMenuLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sortMenuButtonContainer: {
    borderRadius: 10,
    padding: 5,
    elevation: 2
  },
  deliveryCard: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  deliveryCardHeader: {
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

export default DeliveryHistory
