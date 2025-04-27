import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTheme, Card, Text, Divider } from 'react-native-paper';
import Header from '../../components/customComponents/Header';

const transactions = [
  { id: '1', date: '2025-04-26', description: 'Luggage Delivery - Cebu', amount: '₱450.00' },
  { id: '2', date: '2025-04-25', description: 'Luggage Delivery - Davao', amount: '₱620.00' },
  { id: '3', date: '2025-04-24', description: 'Luggage Delivery - Manila', amount: '₱500.00' },
];

const TransactionHistory = ({ navigation }) => {
  const { colors } = useTheme();

  const renderItem = ({ item }) => (
    <Card style={{ marginVertical: 5, backgroundColor: colors.surface }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>
          {item.description}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.onSurface }}>
          {item.date}
        </Text>
        <Text variant="bodyLarge" style={{ color: colors.primary, marginTop: 4 }}>
          {item.amount}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="" />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

export default TransactionHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
