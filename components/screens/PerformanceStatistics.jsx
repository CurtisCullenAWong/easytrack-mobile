import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme, Card, Text, ProgressBar } from 'react-native-paper';
import Header from '../../components/customComponents/Header';

const PerformanceStatisticsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const stats = {
    totalDeliveries: 120,
    successfulDeliveries: 115,
    failedDeliveries: 5,
    successRate: 0.958,
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} />

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Total Deliveries
          </Text>
          <Text variant="headlineMedium" style={[styles.valueText, { color: colors.onSurface }]}>
            {stats.totalDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Successful Deliveries
          </Text>
          <Text variant="headlineMedium" style={[styles.valueText, { color: colors.onSurface }]}>
            {stats.successfulDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Failed Deliveries
          </Text>
          <Text variant="headlineMedium" style={[styles.valueText, { color: colors.onSurface }]}>
            {stats.failedDeliveries}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: colors.primary }}>
            Success Rate
          </Text>
          <ProgressBar
            progress={stats.successRate}
            color={colors.primary}
            style={styles.progressBar}
          />
          <Text variant="bodyMedium" style={[styles.successRateText, { color: colors.onSurface }]}>
            {(stats.successRate * 100).toFixed(1)}%
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  valueText: {
    marginTop: 4,
  },
  progressBar: {
    marginTop: 8,
    height: 10,
    borderRadius: 5,
  },
  successRateText: {
    marginTop: 8,
  },
});

export default PerformanceStatisticsScreen;
