import React from 'react'
import { ScrollView, Dimensions, FlatList, View, StyleSheet } from 'react-native'
import { Text, Button, Surface, Card, useTheme, Divider } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const DeliveryHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  const images = [
    require('../../../assets/airport1.png'),
    require('../../../assets/airport2.png'),
    require('../../../assets/airport3.png'),
  ]

  const performanceImages = [
    require('../../../assets/delivery1.png'),
    require('../../../assets/delivery2.png'),
    require('../../../assets/delivery3.png'),
  ]

  const renderItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level1 }]}>
      <Card.Cover source={item} style={styles.cardCover} />
    </Card>
  )

  const buttons = [
    { label: 'Booking Management', icon: 'clipboard-edit-outline', screen: 'BookingManagement' },
    { label: 'History', icon: 'history', screen: 'BookingHistory' },
    { label: 'Performance Statistics', icon: 'chart-line', screen: 'UserPerformanceStatistics' },
  ]

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title={'Home'} />

      <View style={styles.container}>
        {/* Welcome Section */}
        <Surface style={[styles.welcomeSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.welcomeTitle, { color: colors.onSurface, ...fonts.headlineMedium }]}>Welcome Back!</Text>
          <Text style={[styles.welcomeSubTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>Delivery Partner Dashboard</Text>
          <Divider style={styles.divider} />
          <Text style={[styles.welcomeParagraph, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]}>
            Efficient and reliable delivery services to meet customer needs. Manage your contracts, track deliveries, and analyze performance.
          </Text>
        </Surface>

        {/* Main Carousel Section */}
        <Surface style={[styles.carouselSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>Current Routes</Text>
          {images.length ? (
            <FlatList
              data={images}
              renderItem={renderItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatList}
              snapToInterval={width * 0.85 + 16}
              decelerationRate="fast"
              snapToAlignment="start"
            />
          ) : (
            <Text style={[styles.noImages, { color: colors.error, ...fonts.bodyLarge }]}>
              No routes available.
            </Text>
          )}
        </Surface>

        {/* Actions Section */}
        <Surface style={[styles.actionsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>Quick Actions</Text>
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
        </Surface>

        {/* Performance Carousel Section */}
        <Surface style={[styles.carouselSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>Performance Insights</Text>
          {performanceImages.length ? (
            <FlatList
              data={performanceImages}
              renderItem={renderItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatList}
              snapToInterval={width * 0.85 + 16}
              decelerationRate="fast"
              snapToAlignment="start"
            />
          ) : (
            <Text style={[styles.noImages, { color: colors.error, ...fonts.bodyLarge }]}>
              No performance data available.
            </Text>
          )}
        </Surface>

        {/* Quote Section */}
        <Surface style={[styles.quoteSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.quoteText, { color: colors.onSurface, ...fonts.bodyMedium }]}>
            “Analyze your delivery performance, track contracts, and improve your efficiency with real-time data analytics.”
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
    gap: 16,
  },
  welcomeSurface: {
    padding: 20,
    borderRadius: 12,
  },
  welcomeTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  welcomeSubTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  welcomeParagraph: {
    textAlign: 'center',
    lineHeight: 24,
  },
  carouselSurface: {
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
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
  actionsSurface: {
    padding: 16,
    borderRadius: 12,
  },
  buttonContainer: {
    gap: 12,
    alignItems: 'center',
  },
  button: {
    width: '90%',
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quoteSurface: {
    padding: 16,
    borderRadius: 12,
  },
  quoteText: {
    textAlign: 'center',
  },
})

export default DeliveryHome