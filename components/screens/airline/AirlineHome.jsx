import React, { useEffect, useState } from 'react'
import { ScrollView, View, Dimensions, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Surface, Card, useTheme, Divider } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const AirlineHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [corporationName, setCorporationName] = useState('')

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
            { uri: 'https://images.squarespace-cdn.com/content/v1/5a5dbe4632601eb31977f947/b32685fe-5c30-4913-92c5-804c36d2af28/IMG_0553+copy.jpg' },
            { uri: 'https://images.squarespace-cdn.com/content/v1/5a5dbe4632601eb31977f947/ea9dcc62-3bb7-49ba-b46d-c63095257499/TAAA321Neo.jpg' },
            { uri: 'https://images.squarespace-cdn.com/content/v1/5a5dbe4632601eb31977f947/1634724464683-TT8HW2IODV87O7L3KD05/226A4C84-BE86-4F88-8A98-5D97FCF2AD3D.jpeg' },
          ]
        } else if (profile?.corporation_id === 3) {
          imgs = [
            { uri: 'https://cdn.media.amplience.net/i/cebupacificair/A%20NEO%20future%20awaits%20for%20everyJuan?w=1980&sm=c&scaleFit=poi&poi={$this.metadata.pointOfInterest.x},{$this.metadata.pointOfInterest.y},{$this.metadata.pointOfInterest.w},{$this.metadata.pointOfInterest.h}' },
            { uri: 'https://aircraft.airbus.com/sites/g/files/jlcbta126/files/styles/w640h480/public/2024-10/Cebu%20Pacific%20A321neo.jpg?h=5983f417&itok=Wo4Y_1ET' },
            { uri: 'https://www.jgsummit.com.ph/images/2021/12/15/0f999ad31e634dc5a90ad0d350cbe86ddfc4eca3.jpg' },
          ]
        } else {
          // fallback images
          imgs = [
            require('../../../assets/airport1.png'),
            require('../../../assets/airport2.png'),
            require('../../../assets/airport3.png'),
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