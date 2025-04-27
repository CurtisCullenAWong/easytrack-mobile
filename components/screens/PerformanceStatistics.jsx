import React from 'react'
import { View } from 'react-native'
import { useTheme, Card, Text, ProgressBar } from 'react-native-paper'
import Header from '../../components/customComponents/Header'
const PerformanceStatisticsScreen = ({navigation}) => {
  const { colors } = useTheme()
  const stats = {
    totalDeliveries: 120,
    successfulDeliveries: 115,
    failedDeliveries: 5,
    successRate: 0.958,
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} />

      <Card style={{ marginVertical: 8, backgroundColor: colors.surface }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Total Deliveries
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.onSurface, marginTop: 4 }}>
            {stats.totalDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginVertical: 8, backgroundColor: colors.surface }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Successful Deliveries
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.onSurface, marginTop: 4 }}>
            {stats.successfulDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginVertical: 8, backgroundColor: colors.surface }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Failed Deliveries
          </Text>
          <Text variant="headlineMedium" style={{ color: colors.onSurface, marginTop: 4 }}>
            {stats.failedDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginVertical: 8, backgroundColor: colors.surface }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Success Rate
          </Text>
          <ProgressBar 
            progress={stats.successRate} 
            color={colors.primary} 
            style={{ marginTop: 8, height: 10, borderRadius: 5 }} 
          />
          <Text variant="bodyMedium" style={{ marginTop: 8, color: colors.onSurface }}>
            {(stats.successRate * 100).toFixed(1)}%
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

export default PerformanceStatisticsScreen
