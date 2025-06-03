import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { useTheme, Card, Text, ProgressBar, Divider, Button, ActivityIndicator } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import { analyzeDeliveryStats } from '../../../utils/geminiUtils'

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
  const [aiInsights, setAiInsights] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        setLoading(false)
        navigation.navigate('Login')
        return
      }

      if (!user) {
        setLoading(false)
        navigation.navigate('Login')
        return
      }
      
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
      
      const isDelivery = userRole?.role_id === 2 // Assuming 2 is the role_id for delivery personnel
      setUser(user)
      setIsDeliveryUser(isDelivery)
      
      // Only fetch statistics after we have both user and role data
      await fetchStatistics(user, isDelivery)
    } catch (error) {
      console.error('Error in fetchUser:', error)
      setLoading(false)
      navigation.navigate('Login')
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
  }, [])

  const fetchStatistics = async (userData, isDelivery) => {
    if (!userData) {
      console.log('No user data provided, skipping statistics fetch')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Get the start of the current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      console.log('Fetching deliveries for user:', userData.id)
      console.log('Start of month:', startOfMonth)
      console.log('Is delivery user:', isDelivery)
      
      // Fetch completed deliveries for the current month
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('contract')
        .select(`
          *,
          contract_status:contract_status_id (status_name)
        `)
        .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed
        .gte('created_at', startOfMonth) // Only fetch contracts from current month
        .or(`delivery_id.eq.${userData.id},airline_id.eq.${userData.id}`) // Fetch contracts where user is either delivery or airline
      
      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError)
        setLoading(false)
        return
      }

      console.log('Fetched deliveries:', deliveries?.length || 0)

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

      if (isDelivery) {
        totalEarnings = deliveries.reduce((sum, delivery) => {
          if (delivery.delivery_id === userData.id) {
            const baseAmount = (delivery.delivery_charge || 0) + (delivery.surcharge || 0)
            const discountedAmount = baseAmount * (1 - ((delivery.discount || 0) / 100))
            return sum + discountedAmount
          }
          return sum
        }, 0)
      } else {
        totalExpenses = deliveries.reduce((sum, delivery) => {
          if (delivery.airline_id === userData.id) {
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

  const generateInsights = async () => {
    try {
      setAnalyzing(true)
      const insights = await analyzeDeliveryStats({
        totalDeliveries: stats.totalDeliveries,
        successfulDeliveries: stats.successfulDeliveries,
        failedDeliveries: stats.failedDeliveries,
        successRate: stats.successRate,
        totalRevenue: isDeliveryUser ? stats.totalEarnings : stats.totalExpenses,
        averageDeliveryTime: stats.averageDeliveryTime,
        deliveriesByRegion: stats.deliveriesByRegion,
      })
      
      // Format the insights text
      const formattedInsights = insights
        .replace(/\*/g, '•') // Replace asterisks with bullet points
        .split('\n') // Split into lines
        .map(line => line.trim()) // Trim each line
        .filter(line => line) // Remove empty lines
        .join('\n'); // Join back with newlines

      setAiInsights(formattedInsights)
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setAnalyzing(false)
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

          {/* AI Insights Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                AI-Powered Insights
              </Text>
              <Text variant="bodySmall" style={[styles.insightsDescription, { color: colors.onSurfaceVariant }]}>
                Get AI-powered analysis of your delivery performance and actionable recommendations.
              </Text>
              
              {!aiInsights && !analyzing && (
                <Button 
                  mode="contained" 
                  onPress={generateInsights}
                  style={styles.insightsButton}
                >
                  Generate Insights
                </Button>
              )}

              {analyzing ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={{ color: colors.onSurface, marginTop: 8 }}>
                    Analyzing performance data...
                  </Text>
                </View>
              ) : aiInsights ? (
                <View style={styles.insightsContainer}>
                  <Text variant="bodyMedium" style={[styles.insightsText, { color: colors.onSurface }]}>
                    {aiInsights.split('\n').map((line, index) => {
                      // Check if line starts with a number followed by a dot
                      if (/^\d+\./.test(line)) {
                        return (
                          <Text key={index} style={{ fontWeight: 'bold' }}>
                            {line}{'\n'}
                          </Text>
                        );
                      }
                      // Check if line starts with a bullet point
                      if (line.trim().startsWith('•')) {
                        return (
                          <Text key={index}>
                            {'\n'}{line}{'\n'}
                          </Text>
                        );
                      }
                      return <Text key={index}>{line}{'\n'}</Text>;
                    })}
                  </Text>
                  <Button 
                    mode="outlined" 
                    onPress={generateInsights}
                    style={styles.refreshButton}
                  >
                    Refresh Insights
                  </Button>
                </View>
              ) : null}
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
  analyzingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  insightsDescription: {
    marginTop: 4,
    marginBottom: 16,
  },
  insightsButton: {
    marginTop: 8,
  },
  insightsContainer: {
    marginTop: 16,
  },
  insightsText: {
    lineHeight: 24,
    marginBottom: 16,
  },
  refreshButton: {
    marginTop: 8,
  },
})

export default UserPerformanceStatisticsScreen 