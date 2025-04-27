import React from 'react'
import { ScrollView, View, Dimensions, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Surface, Card, Title, Paragraph, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const AdminHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const images = [
    require('../../../assets/airport1.png'),
    require('../../../assets/airport2.png'),
    require('../../../assets/airport3.png'),
  ]

  const renderItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level1 }]}>
      <Card.Cover source={item} style={styles.cardCover} />
    </Card>
  )

  const buttons = [
    { label: 'User Management', icon: 'account-group', screen: 'UserManagement' },
    { label: 'Contracts', icon: 'file-document', screen: 'AdminContracts' },
    { label: 'History', icon: 'history', screen: 'DeliveryHistory' },
    { label: 'Statistics', icon: 'chart-bar', screen: 'PerformanceStatistics' },
  ]

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} />
      <View style={styles.container}>
        <Title style={[styles.title, { color: colors.onBackground, ...fonts.titleLarge }]}>Welcome Admin!</Title>
        <Text style={[styles.subTitle, { color: colors.onBackground, ...fonts.titleMedium }]}>Hi, System Administrator</Text>

        {images.length ? (
          <FlatList
            data={images}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flatList}
          />
        ) : (
          <Text style={[styles.noImages, { color: colors.error, ...fonts.bodyLarge }]}>
            No images available.
          </Text>
        )}

        <Paragraph style={[styles.paragraph, { color: colors.onBackground, ...fonts.bodyLarge }]}>
          Monitor system activities, manage user roles, and maintain platform efficiency. Access analytics, logs, and control permissions in real-time.
        </Paragraph>

        <View style={styles.buttonContainer}>
          {buttons.map(({ label, icon, screen }) => (
            <Button
              key={label}
              icon={icon}
              mode="contained"
              style={[styles.button, { backgroundColor: colors.primary }]}
              contentStyle={styles.buttonContent}
              onPress={() => navigation.navigate(screen)}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
            >
              {label}
            </Button>
          ))}
        </View>

        <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.surfaceText, { color: colors.onSurface, ...fonts.bodyMedium }]}>
            “Stay in control of your platform. Empower users, track system activity, and ensure smooth operations.”
          </Text>
        </Surface>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginTop: 10,
  },
  subTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  flatList: {
    paddingVertical: 10,
  },
  card: {
    width: width * 0.85,
    marginRight: 16,
    borderRadius: 10,
  },
  cardCover: {
    height: 230,
  },
  noImages: {
    textAlign: 'center',
    marginVertical: 10,
  },
  paragraph: {
    textAlign: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  button: {
    marginVertical: 6,
    width: '90%',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
  },
  surface: {
    padding: 16,
    marginVertical: 20,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  surfaceText: {
    textAlign: 'center',
  },
})

export default AdminHome
