import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { useTheme, Card, Text, ProgressBar, Divider } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'

const UserPerformanceStatisticsScreen = ({ navigation }) => {
  const { colors } = useTheme()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalEarnings: 0,
    totalExpenses: 0,
    averageDeliveryTime: 0,
    deliveriesByRegion: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDeliveryUser, setIsDeliveryUser] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        navigation.navigate('Login')
        return
      }
      setUser(user)
      
      // Check if user is a delivery personnel
      const { data: userRole, error: roleError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (roleError) {
        console.error('Error fetching user role:', roleError)
        setLoading(false)
        return
      }
      
      setIsDeliveryUser(userRole?.role_id === 2) // Assuming 2 is the role_id for delivery personnel
      await fetchStatistics()
    } catch (error) {
      console.error('Error fetching user:', error)
      setLoading(false)
      navigation.navigate('Login')
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
  }, [])

  const fetchStatistics = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      
      // Get the start of the current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      // Fetch completed deliveries for the current month
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('contract')
        .select(`
          *,
          contract_status:contract_status_id (status_name)
        `)
        .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed
        .gte('created_at', startOfMonth) // Only fetch contracts from current month
        .eq(isDeliveryUser ? 'delivery_id' : 'airline_id', user.id) // Filter by user's role
      
      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError)
        setLoading(false)
        return
      }

      // Fetch region names from pricing_region table
      const { data: regionData, error: regionError } = await supabase
        .from('pricing_region')
        .select('id, region')
      
      if (regionError) {
        console.error('Error fetching regions:', regionError)
        setLoading(false)
        return
      }

      const regionNamesMap = regionData.reduce((acc, item) => {
        acc[item.id] = item.region;
        return acc;
      }, {});

      // Fetch city to region mapping from pricing table
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing')
        .select('city, region_id')

      if (pricingError) {
        console.error('Error fetching pricing data:', pricingError)
        setLoading(false)
        return
      }

      const cityToRegionMap = pricingData.reduce((acc, item) => {
        if (item.city && item.region_id !== null && regionNamesMap[item.region_id]) {
          acc[item.city.toLowerCase()] = regionNamesMap[item.region_id];
        }
        return acc;
      }, {});

      // Calculate statistics
      const totalDeliveries = deliveries.length
      const successfulDeliveries = deliveries.filter(d => d.contract_status_id === 5).length
      const failedDeliveries = deliveries.filter(d => d.contract_status_id === 6).length
      const successRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0

      // Calculate average delivery time
      const validDeliveryTimes = deliveries
        .filter(d => d.pickup_at && d.delivered_at)
        .map(d => {
          const pickup = new Date(d.pickup_at)
          const delivered = new Date(d.delivered_at)
          return (delivered - pickup) / (1000 * 60) // Convert to minutes
        })

      const averageDeliveryTime = validDeliveryTimes.length > 0
        ? Math.round(validDeliveryTimes.reduce((a, b) => a + b, 0) / validDeliveryTimes.length)
        : 0

      // Calculate total earnings (for delivery personnel) or expenses (for non-delivery users)
      let totalEarnings = 0
      let totalExpenses = 0

      if (isDeliveryUser) {
        totalEarnings = deliveries.reduce((sum, delivery) => {
          if (delivery.delivery_id === user.id) {
            const baseAmount = (delivery.delivery_charge || 0) + (delivery.surcharge || 0)
            const discountedAmount = baseAmount * (1 - ((delivery.discount || 0) / 100))
            return sum + discountedAmount
          }
          return sum
        }, 0)
      } else {
        totalExpenses = deliveries.reduce((sum, delivery) => {
          if (delivery.airline_id === user.id) {
            const baseAmount = (delivery.delivery_charge || 0) + (delivery.surcharge || 0)
            const discountedAmount = baseAmount * (1 - ((delivery.discount || 0) / 100))
            return sum + discountedAmount
          }
          return sum
        }, 0)
      }

      // Group deliveries by region
      const regionCounts = deliveries.reduce((acc, delivery) => {
        const dropOffLocation = delivery.drop_off_location ? delivery.drop_off_location.toLowerCase() : '';
        let region = 'Unknown Region';

        for (const city in cityToRegionMap) {
          if (dropOffLocation.includes(city)) {
            region = cityToRegionMap[city];
            break;
          }
        }
        
        acc[region] = (acc[region] || 0) + 1
        return acc
      }, {})

      const deliveriesByRegion = Object.values(regionNamesMap).map(regionName => ({
        region: regionName,
        count: regionCounts[regionName] || 0,
      })).sort((a, b) => a.region.localeCompare(b.region));

      setStats({
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        totalEarnings,
        totalExpenses,
        averageDeliveryTime,
        deliveriesByRegion,
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }>
      <Header navigation={navigation} title="My Statistics" />

      {loading ? (
        <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.primary }]}>
              Loading Statistics...
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Personal Summary Card */}
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.primary }]}>
                My Performance Summary
              </Text>
              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                Here's an overview of your personal delivery performance. Track your progress and {isDeliveryUser ? 'earnings' : 'expenses'}.
              </Text>
            </Card.Content>
          </Card>

          {/* Total Deliveries Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Total Deliveries
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                {stats.totalDeliveries}
              </Text>
            </Card.Content>
          </Card>

          {/* Successful Deliveries Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Successful Deliveries
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                {stats.successfulDeliveries}
              </Text>
            </Card.Content>
          </Card>

          {/* Failed Deliveries Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Failed Deliveries
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.primary }]}>
                {stats.failedDeliveries}
              </Text>
            </Card.Content>
          </Card>

          {/* Success Rate Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Success Rate
              </Text>
              <ProgressBar
                progress={stats.successRate}
                color={colors.primary}
                style={styles.progressBar}
              />
              <Text variant="bodyLarge" style={[styles.successRateText, { color: colors.onSurface }]}>
                {(stats.successRate * 100).toFixed(1)}%
              </Text>
            </Card.Content>
          </Card>

          {/* Expenses Card (only for non-delivery users) */}
          {!isDeliveryUser && stats.totalExpenses > 0 && (
            <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ color: colors.primary }}>
                  Total Expenses
                </Text>
                <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                  ₱{stats.totalExpenses.toLocaleString()}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Average Delivery Time Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Average Delivery Time
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                {stats.averageDeliveryTime} minutes
              </Text>
            </Card.Content>
          </Card>

          {/* Deliveries By Region Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Deliveries by Region
              </Text>
              {stats.deliveriesByRegion.map((region, index) => (
                <Text key={index} variant="bodyMedium" style={[styles.valueText, { color: colors.onSurface }]}>
                  {region.region}: {region.count} deliveries
                </Text>
              ))}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  summaryText: {
    marginTop: 8,
  },
  divider: {
    height: 1,
  },
  statCard: {
    borderRadius: 12,
    elevation: 2,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  valueText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  progressBar: {
    marginTop: 12,
    height: 10,
    borderRadius: 5,
  },
  successRateText: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
})

export default UserPerformanceStatisticsScreen 