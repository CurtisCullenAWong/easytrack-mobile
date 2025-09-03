import React, { useEffect, useState } from 'react'
import { ScrollView, View, Dimensions, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Surface, Card, useTheme, Divider } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import Header from '../../customComponents/Header'
import useVerificationStatus from '../../hooks/useVerificationStatus'

const { width } = Dimensions.get('window')

const AirlineHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [corporationName, setCorporationName] = useState('')
  const { isVerified } = useVerificationStatus()

  useEffect(() => {
    const fetchCorporationImages = async () => {
      setLoading(true)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('corporation_id')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Fetch corporation name
        if (profile?.corporation_id) {
          const { data: corporationData, error: corporationError } = await supabase
            .from('profiles_corporation')
            .select('corporation_name')
            .eq('id', profile.corporation_id)
            .single()

          if (!corporationError && corporationData) {
            setCorporationName(corporationData.corporation_name)
          }
        }

        let imgs = []
        if (profile?.corporation_id === 2) {
          imgs = [
            require('../../../assets/airline_home/airline (1).jpg'),
            require('../../../assets/airline_home/airline (2).jpg'),
            require('../../../assets/airline_home/airline (3).jpg'),
          ]
        } else if (profile?.corporation_id === 3) {
          imgs = [
            require('../../../assets/airline_home/cebupacific (1).jpg'),
            require('../../../assets/airline_home/cebupacific (2).jpg'),
            require('../../../assets/airline_home/cebupacific (3).jpg'),
          ]
        } else {
          // fallback images
          imgs = [
            require('../../../assets/airline_home/airline (1).jpg'),
            require('../../../assets/airline_home/airline (2).jpg'),
            require('../../../assets/airline_home/airline (3).jpg'),
          ]
        }
        setImages(imgs)
      } catch (err) {
        console.error('Error fetching corporation images:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCorporationImages()
  }, [])

  const renderItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level1 }]}>
      <Card.Cover source={item} style={styles.cardCover} />
    </Card>
  )

  const buttons = [
    { label: 'Book Delivery', icon: 'send', screen: 'BookingManagement' },
    { label: 'Booking History', icon: 'history', screen: 'BookingHistory' },
    { label: 'Luggage Tracking', icon: 'map-marker-path', screen: 'TrackLuggage' },
  ]

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title={'Home'} />
      <View style={styles.container}>
        {/* Welcome Section */}
        <Surface style={[styles.welcomeSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.welcomeTitle, { color: colors.onSurface, ...fonts.headlineMedium }]}>
            Welcome Aboard, {corporationName ? `${corporationName}` : ''}!
          </Text>
          <Text style={[styles.welcomeSubTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>You are an Airline Personnel</Text>
          <Divider style={styles.divider} />
          <Text style={[styles.welcomeParagraph, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]}>
            Manage luggage bookings, track delivery statuses, and ensure smooth handling of passenger belongings.
          </Text>
        </Surface>

        {/* Carousel Section */}
        <Surface style={[styles.carouselSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>Featured Images</Text>
          {loading ? (
            <Text style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>Loading images...</Text>
          ) : images.length ? (
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
              No images available.
            </Text>
          )}
        </Surface>

        {/* Actions Section */}
        {isVerified && (
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
        )}

        {/* Quote Section */}
        <Surface style={[styles.quoteSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.quoteText, { color: colors.onSurface, ...fonts.bodyMedium }]}>
            “Keep every delivery smooth and every passenger satisfied. You're the bridge between service and success.”
          </Text>
        </Surface>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 16, gap: 16 },
  welcomeSurface: { padding: 20, borderRadius: 12 },
  welcomeTitle: { textAlign: 'center', fontWeight: 'bold' },
  welcomeSubTitle: { textAlign: 'center', marginBottom: 8 },
  divider: { marginVertical: 12, height: 1, backgroundColor: 'rgba(0,0,0,0.12)' },
  welcomeParagraph: { textAlign: 'center', lineHeight: 24 },
  carouselSurface: { padding: 16, borderRadius: 12 },
  sectionTitle: { textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  flatList: { paddingVertical: 10 },
  card: { width: width * 0.85, marginRight: 16, borderRadius: 10 },
  cardCover: { height: 230 },
  noImages: { textAlign: 'center', marginVertical: 10 },
  actionsSurface: { padding: 16, borderRadius: 12 },
  buttonContainer: { gap: 12, alignItems: 'center' },
  button: { width: '90%', borderRadius: 8 },
  buttonContent: { height: 48 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold' },
  quoteSurface: { padding: 16, borderRadius: 12 },
  quoteText: { textAlign: 'center' },
})

export default AirlineHome