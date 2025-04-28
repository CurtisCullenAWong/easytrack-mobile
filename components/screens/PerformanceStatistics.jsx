import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme, Card, Text, ProgressBar, Divider, Button } from 'react-native-paper';
import Header from '../../components/customComponents/Header';

const PerformanceStatisticsScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme();

  const stats = {
    totalDeliveries: 120,
    successfulDeliveries: 115,
    failedDeliveries: 5,
    successRate: 0.958,
    totalRevenue: 5000, // Example metric
    averageDeliveryTime: 45, // Example metric (in minutes)
    deliveriesByRegion: [
      { region: 'North', count: 30 },
      { region: 'South', count: 40 },
      { region: 'East', count: 25 },
      { region: 'West', count: 25 },
    ],
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Statistics" />

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
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Total Revenue
          </Text>
          <Text variant="displaySmall" style={[styles.valueText, { color: colors.onSurface }]}>
            ${stats.totalRevenue}
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
      <Card style={[styles.targetCard, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Target Achieved
          </Text>
          <ProgressBar
            progress={stats.successRate} // Example for how close they are to target
            color={colors.secondary}
            style={styles.progressBar}
          />
          <Text variant="bodyLarge" style={[styles.targetText, { color: colors.onSurface }]}>
            You're almost there! Keep up the great work to achieve your target.
          </Text>
          <Button mode="contained" onPress={() => console.log('Set New Targets')}>
            Set New Targets
          </Button>
        </Card.Content>
      </Card>

    </ScrollView>
  );
};

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
});

export default PerformanceStatisticsScreen;
