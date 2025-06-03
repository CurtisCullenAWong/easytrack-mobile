import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { useTheme, Card, Text, ProgressBar, Divider, Button } from 'react-native-paper'
import Header from '../../../components/customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'

const PerformanceStatisticsScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalRevenue: 0,
    averageDeliveryTime: 0,
    deliveriesByRegion: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
  }, [])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      
      // Fetch all completed deliveries (status 5 or 6)
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('contract')
        .select(`
          *,
          contract_status:contract_status_id (status_name)
        `)
        .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed

      if (deliveriesError) throw deliveriesError

      // Fetch region names from pricing_region table
      const { data: regionData, error: regionError } = await supabase
        .from('pricing_region')
        .select('id, region')
      
      if (regionError) throw regionError

      const regionNamesMap = regionData.reduce((acc, item) => {
        acc[item.id] = item.region;
        return acc;
      }, {});

      // Fetch city to region mapping from pricing table
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing')
        .select('city, region_id')

      if (pricingError) throw pricingError

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

      // Calculate total revenue
      const totalRevenue = deliveries.reduce((sum, delivery) => {
        const baseAmount = (delivery.delivery_charge || 0) + (delivery.surcharge || 0)
        const discountedAmount = baseAmount * (1 - ((delivery.discount || 0) / 100))
        return sum + discountedAmount
      }, 0)

      // Group deliveries by region based on drop_off_location matching city in pricing data
      const regionCounts = deliveries.reduce((acc, delivery) => {
        const dropOffLocation = delivery.drop_off_location ? delivery.drop_off_location.toLowerCase() : '';
        let region = 'Unknown Region';

        // Find the matching city in the dropOffLocation and get its region
        for (const city in cityToRegionMap) {
          if (dropOffLocation.includes(city)) {
            region = cityToRegionMap[city];
            break; // Assume the first match is sufficient
          }
        }
        
        acc[region] = (acc[region] || 0) + 1
        return acc
      }, {})

      // Ensure all defined regions from pricing_region are included, even if count is 0
      const deliveriesByRegion = Object.values(regionNamesMap).map(regionName => ({
        region: regionName,
        count: regionCounts[regionName] || 0,
      })).sort((a, b) => a.region.localeCompare(b.region)); // Optional: sort regions alphabetically

      setStats({
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        totalRevenue,
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
          colors={[colors.primary]} // Customize the refresh indicator color
          tintColor={colors.primary} // Customize the refresh indicator color for iOS
        />
      }>
      <Header navigation={navigation} title="Statistics" />

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
          {/* Delivery Summary Card */}
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.primary }]}>
                Delivery Summary
              </Text>
              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                Here's an overview of your delivery performance for the current period. The following statistics provide detailed insights into your performance.
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
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.error }]}>
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

          {/* Revenue Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>
                Total Revenue
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.primary }]}>
                ₱{stats.totalRevenue.toLocaleString()}
              </Text>
            </Card.Content>
          </Card>

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

          {/* Target Achievement and Call to Action */}
          {/* <Card style={[styles.targetCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Target Achieved
              </Text>
              <ProgressBar
                progress={stats.successRate}
                color={colors.secondary}
                style={styles.progressBar}
              />
              <Text variant="bodyLarge" style={[styles.targetText, { color: colors.onSurface }]}>
                {stats.successRate >= 0.95 
                  ? "Excellent work! You've exceeded the target success rate."
                  : "You're making good progress! Keep up the great work to achieve your target."}
              </Text>
              <Button mode="contained" onPress={() => console.log('Set New Targets')}>
                Set New Targets
              </Button>
            </Card.Content>
          </Card> */}
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
  statCardsContainer: {
    gap: 12,
  },
  statCard: {
    borderRadius: 12,
    elevation: 2,
    marginVertical: 16,
    marginHorizontal: 16,

  },
  targetCard: {
    marginTop: 16,
    borderRadius: 12,
    elevation: 3,
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
  targetText: {
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})

export default PerformanceStatisticsScreen
