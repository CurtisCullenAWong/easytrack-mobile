import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { useTheme, Card, Text, ProgressBar, Divider, Button, ActivityIndicator, Menu } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'
import { analyzeDeliveryStats } from '../../../utils/geminiUtils'
import useSnackbar from '../../hooks/useSnackbar'

const PerformanceStatisticsScreen = ({ navigation }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalEarnings: 0,
    averageDeliveryTime: 0,
    deliveriesByRegion: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aiInsights, setAiInsights] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [dateFilter, setDateFilter] = useState('all')

  const getDateFilterOptions = () => {
    return [
      { label: 'All Time', value: 'all' },
      { label: 'Today', value: 'today' },
      { label: 'Yesterday', value: 'yesterday' },
      { label: 'This Month', value: 'this_month' },
      { label: 'Last Month', value: 'last_month' },
      { label: 'This Year', value: 'this_year' },
      { label: 'Last Year', value: 'last_year' }
    ]
  }

  const getDateFilterLabel = (value) => {
    return getDateFilterOptions().find(opt => opt.value === value)?.label || 'All Time'
  }

  const getDateRange = () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0) // Start of yesterday
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    thisMonth.setHours(0, 0, 0, 0) // Start of this month
    
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    lastMonth.setHours(0, 0, 0, 0) // Start of last month
    
    const thisYear = new Date(today.getFullYear(), 0, 1)
    thisYear.setHours(0, 0, 0, 0) // Start of this year
    
    const lastYear = new Date(today.getFullYear() - 1, 0, 1)
    lastYear.setHours(0, 0, 0, 0) // Start of last year

    switch (dateFilter) {
      case 'today':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString(),
          end: today.toISOString()
        }
      case 'yesterday':
        return {
          start: yesterday.toISOString(),
          end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString()
        }
      case 'this_month':
        return {
          start: thisMonth.toISOString(),
          end: today.toISOString()
        }
      case 'last_month':
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
        return {
          start: lastMonth.toISOString(),
          end: lastMonthEnd.toISOString()
        }
      case 'this_year':
        return {
          start: thisYear.toISOString(),
          end: today.toISOString()
        }
      case 'last_year':
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        return {
          start: lastYear.toISOString(),
          end: lastYearEnd.toISOString()
        }
      default:
        return null
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchStatistics()
  }, [dateFilter])

  const fetchStatistics = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('contracts')
        .select(`
          *,
          contract_status:contract_status_id (status_name)
        `)

      // Apply date filter if selected
      const dateRange = getDateRange()
      if (dateRange) {
        console.log('Applying date filter:', dateFilter, dateRange)
        query = query.or(`and(contract_status_id.eq.5,delivered_at.gte.${dateRange.start},delivered_at.lte.${dateRange.end}),and(contract_status_id.eq.6,cancelled_at.gte.${dateRange.start},cancelled_at.lte.${dateRange.end})`)
      } else {
        // If no date filter, just filter by status
        console.log('No date filter applied, showing all time data')
        query = query.in('contract_status_id', [5, 6]) // 5 = delivered, 6 = failed
      }

      const { data: deliveries, error: deliveriesError } = await query
      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError)
        setLoading(false)
        return
      }

      console.log('Fetched deliveries:', deliveries?.length || 0)

      // Fetch region names
      const { data: regionData, error: regionError } = await supabase
        .from('pricing_region')
        .select('id, region')

      if (regionError) {
        console.error('Error fetching regions:', regionError)
        setLoading(false)
        return
      }

      const regionNamesMap = regionData.reduce((acc, item) => {
        acc[item.id] = item.region
        return acc
      }, {})

      // City → Region mapping
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing')
        .select('city, region_id')

      if (pricingError) {
        console.error('Error fetching pricing:', pricingError)
        setLoading(false)
        return
      }

      const cityToRegionMap = pricingData.reduce((acc, item) => {
        if (item.city && item.region_id !== null && regionNamesMap[item.region_id]) {
          acc[item.city.toLowerCase()] = regionNamesMap[item.region_id]
        }
        return acc
      }, {})

      // Calculate statistics
      const totalDeliveries = deliveries.length
      const successfulDeliveries = deliveries.filter(d => d.contract_status_id === 5).length
      const failedDeliveries = deliveries.filter(d => d.contract_status_id === 6).length
      const successRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0

      const validDeliveryTimes = deliveries
        .filter(d => d.pickup_at && d.delivered_at)
        .map(d => {
          const pickup = new Date(d.pickup_at)
          const delivered = new Date(d.delivered_at)
          return (delivered - pickup) / (1000 * 60)
        })

      const averageDeliveryTime =
        validDeliveryTimes.length > 0
          ? Math.round(validDeliveryTimes.reduce((a, b) => a + b, 0) / validDeliveryTimes.length)
          : 0

      // Calculate total earnings
      const totalEarnings = deliveries.reduce((sum, delivery) => {
        const amount =
          (delivery.delivery_charge || 0) +
          (delivery.delivery_surcharge || 0) -
          (delivery.delivery_discount || 0)
        return sum + amount
      }, 0)

      // Group by region
      const regionCounts = deliveries.reduce((acc, delivery) => {
        const dropOffLocation = delivery.drop_off_location
          ? delivery.drop_off_location.toLowerCase()
          : ''
        let region = 'Unknown Region'

        for (const city in cityToRegionMap) {
          if (dropOffLocation.includes(city)) {
            region = cityToRegionMap[city]
            break
          }
        }

        acc[region] = (acc[region] || 0) + 1
        return acc
      }, {})

      const deliveriesByRegion = Object.values(regionNamesMap)
        .map(regionName => ({
          region: regionName,
          count: regionCounts[regionName] || 0,
        }))
        .sort((a, b) => a.region.localeCompare(b.region))

      setStats({
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        totalEarnings,
        averageDeliveryTime,
        deliveriesByRegion,
      })
    } catch (error) {
      console.error('Error in fetchStatistics:', error)
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
        totalRevenue: stats.totalEarnings,
        averageDeliveryTime: stats.averageDeliveryTime,
        deliveriesByRegion: stats.deliveriesByRegion,
      })
      
      if (!insights) {
        throw new Error('No insights were generated')
      }

      // Format the insights text
      const formattedInsights = insights
        .replace(/\*/g, '•') // Replace asterisks with bullet points
        .split('\n') // Split into lines
        .map(line => line.trim()) // Trim each line
        .filter(line => line) // Remove empty lines
        .join('\n'); // Join back with newlines

      setAiInsights(formattedInsights)
    } catch (error) {
      let errorMessage = 'Failed to generate insights'
      
      if (error.message?.includes('overloaded')) {
        errorMessage = 'The AI service is currently busy. Please try again in a few moments.'
      } else if (error.message?.includes('No insights')) {
        errorMessage = 'Unable to generate insights at this time. Please try again.'
      }
      
      showSnackbar(errorMessage, false)
      setAiInsights(null)
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
      <Header navigation={navigation} title="Performance Statistics" />
      {SnackbarElement}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.onSurface }]}>Filter by Date:</Text>
          <View style={styles.menuAnchor}>
            <Menu
              visible={showDateMenu}
              onDismiss={() => setShowDateMenu(false)}
              anchor={
                <Button
                  mode="contained"
                  icon="calendar"
                  onPress={() => setShowDateMenu(true)}
                  style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                >
                  {getDateFilterLabel(dateFilter)}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
            >
              {getDateFilterOptions().map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setDateFilter(option.value)
                    setShowDateMenu(false)
                  }}
                  title={option.label}
                  titleStyle={{
                    color: dateFilter === option.value
                      ? colors.primary
                      : colors.onSurface,
                  }}
                  leadingIcon={dateFilter === option.value ? 'check' : undefined}
                />
              ))}
            </Menu>
          </View>
        </View>
      </View>

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
          {/* Summary Card */}
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.primary }]}>
                Performance Summary
              </Text>
              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                Overview of delivery performance and statistics for the selected time period.
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
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.primary }]}>
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

          {/* Total Earnings Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Total Earnings
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                ₱{stats.totalEarnings.toLocaleString()}
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

          {/* AI Insights Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                AI-Powered Insights
              </Text>
              <Text variant="bodySmall" style={[styles.insightsDescription, { color: colors.onSurfaceVariant }]}>
                Get AI-powered analysis of your delivery performance and actionable recommendations.
                Powered by Gemini
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
                  <Text variant="bodyMedium" style={[styles.insightsText, { color: colors.onSurface }]} selectable>
                    {aiInsights.split('\n').map((line, index) => {
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
  filterContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterLabel: {
    marginRight: 8,
  },
  menuAnchor: {
    flex: 1,
    position: 'relative',
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
  },
  button: {
    marginVertical: 10,
    height: 48,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default PerformanceStatisticsScreen 