import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import { useTheme, Card, Text, ProgressBar, Divider, Button, ActivityIndicator, Menu } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'
import { analyzeDeliveryStats } from '../../../utils/geminiUtils'
import useSnackbar from '../../hooks/useSnackbar'

/**
 * Admin Performance Statistics Screen Component
 * 
 * Displays comprehensive performance statistics for the entire system including
 * delivery metrics, success rates, earnings, and AI-powered insights for administrators.
 * 
 * @param {Object} navigation - React Navigation object
 * @returns {JSX.Element} The admin performance statistics screen
 */
const PerformanceStatisticsScreen = ({ navigation }) => {
  const { colors } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  
  // State management
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalEarnings: 0,
    averageDeliveryTime: 0,
    deliveriesByRegion: [],
    countsByStatus: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aiInsights, setAiInsights] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [dateFilter, setDateFilter] = useState('all')
  const [statusList, setStatusList] = useState([]) // dynamic statuses from DB

  /**
   * Get available date filter options
   * @returns {Array} Array of date filter options
   */
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

  /**
   * Get display label for date filter value
   * @param {string} value - Date filter value
   * @returns {string} Display label
   */
  const getDateFilterLabel = (value) => {
    return getDateFilterOptions().find(opt => opt.value === value)?.label || 'All Time'
  }

  /**
   * Calculate date range based on selected filter
   * @returns {Object|null} Date range object with start and end dates
   */
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
        const lastYearEnd = new Date(today.getFullYear(), 0, 0, 23, 59, 59, 999)
        return {
          start: lastYear.toISOString(),
          end: lastYearEnd.toISOString()
        }
      default:
        return null
    }
  }

  /**
   * Handle pull-to-refresh functionality
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatistics()
    setRefreshing(false)
  }, [])

  // Effect to fetch statistics when date filter changes
  useEffect(() => {
    fetchStatistics()
  }, [dateFilter])

   /**
    * Fetch and calculate performance statistics
    */
  const fetchStatistics = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('contracts')
        .select(`
          *,
          contract_status:contract_status_id (status_name)
        `)

      // Apply date filter (to created_at for overall status counts)
      const dateRange = getDateRange()
      if (dateRange) {
        console.log('Applying date filter (created_at):', dateFilter, dateRange)
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
      } else {
        console.log('No date filter applied, showing all time data')
      }

      const { data: contracts, error: contractsError } = await query
      if (contractsError) {
        console.error('Error fetching contracts:', contractsError)
        setLoading(false)
        return
      }

      // Fetch dynamic contract statuses
      const { data: statusData, error: statusError } = await supabase
        .from('contract_status')
        .select('id, status_name')

      if (statusError) {
        console.error('Error fetching contract statuses:', statusError)
      }
      const statuses = Array.isArray(statusData) ? statusData : []
      setStatusList(statuses)

      console.log('Fetched contracts:', contracts?.length || 0)

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

       // Build Price → Region mapping from pricing table
       const { data: pricingData, error: pricingError } = await supabase
         .from('pricing')
         .select('price, region_id')

      if (pricingError) {
        console.error('Error fetching pricing:', pricingError)
        setLoading(false)
        return
      }

       const priceToRegionMap = pricingData.reduce((acc, item) => {
         if (item?.price != null && item.region_id != null && regionNamesMap[item.region_id]) {
           acc[Number(item.price)] = regionNamesMap[item.region_id]
         }
         return acc
       }, {})

       const detectRegionFromPrice = (deliveryCharge) => {
         if (!deliveryCharge || Number(deliveryCharge) <= 0) return null
         const price = Number(deliveryCharge)
         if (priceToRegionMap[price]) return priceToRegionMap[price]
         // find closest within 10%
         let minDiff = Infinity
         let closestRegion = null
         for (const key of Object.keys(priceToRegionMap)) {
           const p = Number(key)
           const diff = Math.abs(price - p)
           if (diff < minDiff) {
             minDiff = diff
             closestRegion = priceToRegionMap[key]
           }
         }
         if (closestRegion && minDiff <= price * 0.1) return closestRegion
         return null
       }

      // Calculate counts by status (1-6)
      const countsByStatus = contracts.reduce((acc, c) => {
        const key = c.contract_status_id
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

       // Subset for delivery performance (delivered/failed only)
      const deliveries = contracts.filter(d => [5, 6].includes(d.contract_status_id))

       // Calculate basic statistics
       const totalDeliveries = contracts.length
      const successfulDeliveries = deliveries.filter(d => d.contract_status_id === 5).length
      const failedDeliveries = deliveries.filter(d => d.contract_status_id === 6).length
      const successRate = (successfulDeliveries + failedDeliveries) > 0 ? successfulDeliveries / (successfulDeliveries + failedDeliveries) : 0

      // Calculate average delivery time in hours (use all contracts that have both timestamps)
      const validDeliveryTimes = contracts
        .filter(c => c.pickup_at && c.delivered_at)
        .map(c => {
          const pickup = new Date(c.pickup_at)
          const delivered = new Date(c.delivered_at)
          return (delivered - pickup) / (1000 * 60 * 60) // Convert to hours
        })

      const averageDeliveryTime =
        validDeliveryTimes.length > 0
          ? Math.round((validDeliveryTimes.reduce((a, b) => a + b, 0) / validDeliveryTimes.length) * 10) / 10 // Round to 1 decimal place
          : 0

       // Calculate total earnings for delivered and failed only (status 5,6)
       const totalEarnings = contracts
         .filter(contract => contract.contract_status_id === 5 || contract.contract_status_id === 6)
         .reduce((sum, contract) => {
        const amount =
          (contract.delivery_charge || 0) +
          (contract.delivery_surcharge || 0) -
          (contract.delivery_discount || 0)
           return sum + amount
         }, 0)

       // Group by region using pricing price → region and delivery charge
       const regionCounts = contracts.reduce((acc, contract) => {
         const detected = detectRegionFromPrice(contract.delivery_charge)
         const region = detected || 'Unknown Region'
         acc[region] = (acc[region] || 0) + 1
         return acc
       }, {})

       const deliveriesByRegion = Object.values(regionNamesMap)
        .map(regionName => ({
          region: regionName,
          count: regionCounts[regionName] || 0,
        }))
         .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))

      setStats({
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        successRate,
        totalEarnings,
        averageDeliveryTime,
        deliveriesByRegion,
        countsByStatus,
      })
    } catch (error) {
      console.error('Error in fetchStatistics:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate AI-powered insights based on performance data
   */
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

  /**
   * Format delivery time for display
   * @param {number} timeInHours - Time in hours
   * @returns {string} Formatted time string
   */
  const formatDeliveryTime = (timeInHours) => {
    if (timeInHours === 0) return '0 hours'
    if (timeInHours < 1) {
      const minutes = Math.round(timeInHours * 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.floor(timeInHours)
    const minutes = Math.round((timeInHours - hours) * 60)
    
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const getStatusLabel = (statusId) => {
    const labels = {
      1: 'Available for Pickup',
      2: 'Cancelled',
      3: 'Accepted - Awaiting Pickup',
      4: 'In Transit',
      5: 'Delivered',
      6: 'Delivery Failed',
    }
    return labels[statusId] || `Status ${statusId}`
  }

  const navigateToStatus = (statusId) => {
    navigation.navigate('AdminBookingHistory', { status: String(statusId) })
  }

  // Map status to themed colors
  const getStatusColors = (status) => {
    const name = String(status?.status_name || '').toLowerCase()
    const id = status?.id
    if (id === 5 || name.includes('delivered')) return { color: colors.primary }
    if (id === 6 || name.includes('failed') || name.includes('cancel')) return { color: colors.error }
    if (name.includes('transit')) return { color: colors.primary }
    if (name.includes('accepted') || name.includes('await')) return { color: colors.onSurface }
    if (name.includes('available')) return { color: colors.onSurfaceVariant }
    return { color: colors.onSurface }
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
      
      {/* Date Filter Section */}
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
                  onPress={() => setShowDateMenu((prev) => !prev)}
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
               <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.primary }]}>Performance Overview</Text>
               <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
               <View style={styles.kpiRow}>
                 <View style={[styles.kpi, { borderColor: colors.outline }]}>
                   <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Total</Text>
                   <Text variant="titleLarge" style={{ color: colors.onSurface }}>{stats.totalDeliveries}</Text>
                 </View>
                 <View style={[styles.kpi, { borderColor: colors.outline }]}>
                   <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Success</Text>
                   <Text variant="titleLarge" style={{ color: colors.primary }}>{stats.successfulDeliveries}</Text>
                 </View>
                 <View style={[styles.kpi, { borderColor: colors.outline }]}>
                   <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Failed</Text>
                   <Text variant="titleLarge" style={{ color: colors.error }}>{stats.failedDeliveries}</Text>
                 </View>
               </View>
               <Text variant="bodyMedium" style={[styles.summaryText, { color: colors.onSurfaceVariant }]}>At-a-glance KPIs for the selected period.</Text>
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
          
          {/* Contracts By Status */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Contracts by Status
              </Text>
              <View style={styles.statusList}>
                {(statusList.length ? statusList : Object.keys(stats.countsByStatus).map(id => ({ id: Number(id), status_name: `Status ${id}` })) ).map((s) => {
                  const themeColors = getStatusColors(s)
                  return (
                    <View key={s.id} style={styles.statusRow}>
                      <View style={styles.statusLeft}>
                        <View style={[styles.statusDot, { backgroundColor: themeColors.color }]} />
                        <Text style={[styles.statusLabel, { color: themeColors.color }]}>
                          {s.status_name}
                        </Text>
                      </View>
                      <View style={styles.statusActions}>
                        <Text style={[styles.statusCount, { color: themeColors.color }]}>
                          {stats.countsByStatus[s.id] || 0}
                        </Text>
                      <Button
                        mode="outlined"
                        compact
                        icon="chevron-right"
                        onPress={() => navigateToStatus(s.id)}
                        style={styles.viewButton}
                        contentStyle={styles.statusButtonContent}
                        labelStyle={[styles.statusButtonLabel, { color: colors.primary }]}
                        textColor={colors.primary}
                      >
                        View
                      </Button>
                      </View>
                    </View>
                  )
                })}
              </View>
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

          {/* Average Delivery Time Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Average Delivery Time
              </Text>
              <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
                {formatDeliveryTime(stats.averageDeliveryTime)}
              </Text>
            </Card.Content>
          </Card>

           {/* Deliveries By Region Card */}
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: colors.primary }}>
                Deliveries by Region
              </Text>
               <View style={styles.regionList}>
                 {stats.deliveriesByRegion.map((region, index) => (
                   <View key={index} style={[styles.regionRow, { backgroundColor: index % 2 === 0 ? colors.elevation?.level1 || colors.surface : colors.surface }]}>
                     <Text style={[styles.regionName, { color: colors.onSurface }]} numberOfLines={1}>{region.region}</Text>
                     <View style={[styles.regionBadge, { backgroundColor: colors.primary }]}>
                       <Text style={[styles.regionBadgeText, { color: colors.onPrimary }]}>{region.count}</Text>
                     </View>
                   </View>
                 ))}
               </View>
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

// Styles
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
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 12,
  },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  statusList: {
    marginTop: 8,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    flex: 1,
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusCount: {
    fontWeight: '700',
    marginRight: 8,
  },
  viewButton: {
    borderRadius: 8,
  },
  statusButtonContent: {
    height: 36,
  },
  statusButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  regionList: {
    marginTop: 8,
    gap: 6,
  },
  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  regionName: {
    flex: 1,
    marginRight: 12,
    fontWeight: '600',
  },
  regionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  regionBadgeText: {
    fontWeight: '700',
  },
})

export default PerformanceStatisticsScreen 