import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import Header from '../../customComponents/Header';

const Contracting = ({ navigation }) => {
  const { colors, fonts } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title={'Make Contracts'}/>
        <Text>
            Contracting
        </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Contracting;