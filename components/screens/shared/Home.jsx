import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View, Dimensions, FlatList, StyleSheet, Linking } from 'react-native'
import { Text, Button, Surface, Card, useTheme, Divider, Icon } from 'react-native-paper'
import Header from '../../customComponents/Header'
import useVerificationStatus from '../../hooks/useVerificationStatus'
import { supabase } from '../../../lib/supabase'

const { width } = Dimensions.get('window')

const RoleBasedHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { isVerified } = useVerificationStatus()

  const [roleId, setRoleId] = useState(null)
  const [corporationName, setCorporationName] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  // Announcements visibility toggles
  const showGlobalAnnouncement = true
  const showAdminAnnouncement = false
  const showDeliveryAnnouncement = false
  const showAirlineAnnouncement = false

  // Announcements content
const globalAnnouncement =
`We would like to hear from you!
Please refer to the link below for providing feedback and suggestions.`
const adminAnnouncement =
``
const deliveryAnnouncement =
``
const airlineAnnouncement =
``

  // Fetch role_id (and corporation for airline)
  useEffect(() => {
    const fetchRoleAndContext = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role_id, corporation_id')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        const role = typeof profile?.role_id === 'object' ? profile?.role_id?.id : profile?.role_id
        setRoleId(role ?? null)

        // Airline extra context (role_id = 3)
        if (role === 3 && profile?.corporation_id) {
          const { data: corporationData, error: corporationError } = await supabase
            .from('profiles_corporation')
            .select('corporation_name')
            .eq('id', profile.corporation_id)
            .single()
          if (!corporationError && corporationData) {
            setCorporationName(corporationData.corporation_name)
          }
        }

        // Images per role
        let imgs = []
        if (role === 1) {
          imgs = [
            require('../../../assets/admin_home/admin1.jpg'),
            require('../../../assets/admin_home/admin2.jpg'),
            require('../../../assets/admin_home/admin3.jpg'),
          ]
        } else if (role === 2) {
          imgs = [
            require('../../../assets/delivery_home/delivery1.jpg'),
            require('../../../assets/delivery_home/delivery2.jpg'),
            require('../../../assets/delivery_home/delivery3.jpg'),
          ]
        } else if (role === 3) {
          // Select airline set by corporation
          if (profile?.corporation_id === 3) {
            imgs = [
              require('../../../assets/airline_home/cebupacific (1).jpg'),
              require('../../../assets/airline_home/cebupacific (2).jpg'),
              require('../../../assets/airline_home/cebupacific (3).jpg'),
            ]
          } else {
            imgs = [
              require('../../../assets/airline_home/airline (1).jpg'),
              require('../../../assets/airline_home/airline (2).jpg'),
              require('../../../assets/airline_home/airline (3).jpg'),
            ]
          }
        }
        setImages(imgs)
      } catch (err) {
        console.error('Error loading role-based context:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRoleAndContext()
  }, [])

  const flatListRef = useRef(null)
  const currentIndex = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (flatListRef.current && images.length) {
        currentIndex.current = (currentIndex.current + 1) % images.length
        flatListRef.current.scrollToIndex({ index: currentIndex.current, animated: true })
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [images])

  const roleConfig = useMemo(() => {
    if (roleId === 1) {
      return {
        title: 'Home',
        welcomeTitle: 'Welcome Admin!',
        welcomeSubtitle: 'System Administrator',
        welcomeBody:
          'Monitor system activities, manage user roles, and maintain platform efficiency. Access analytics, logs, and control permissions in real-time.',
        carouselTitle: null,
        emptyText: 'No images available.',
        buttons: [
          { label: 'User Management', icon: 'account-group', screen: 'UserManagement' },
          { label: 'Booking Management', icon: 'map-marker-path', screen: 'BookingManagement' },
          { label: 'Transaction Management', icon: 'bank-transfer', screen: 'TransactionManagement' },
          { label: 'Performance Statistics', icon: 'chart-line', screen: 'PerformanceStatistics' },
        ],
        quote:
          '"Stay in control of your platform. Empower users, track system activity, and ensure smooth operations."',
      }
    }
    if (roleId === 2) {
      return {
        title: 'Home',
        welcomeTitle: 'Welcome Back!',
        welcomeSubtitle: 'Delivery Partner',
        welcomeBody:
          'Efficient and reliable delivery services to meet customer needs. Manage your contracts, track deliveries, and analyze performance.',
        carouselTitle: 'Current Routes',
        emptyText: 'No routes available.',
        buttons: [
          { label: 'Booking Management', icon: 'clipboard-edit-outline', screen: 'BookingManagement' },
          { label: 'History', icon: 'history', screen: 'BookingHistory' },
          { label: 'Performance Statistics', icon: 'chart-line', screen: 'UserPerformanceStatistics' },
        ],
        quote:
          'Good to see you again! Let’s get started with today’s deliveries — your stops and tasks are all lined up and ready.',
      }
    }
    if (roleId === 3) {
      return {
        title: 'Home',
        welcomeTitle: `Welcome Aboard${corporationName ? `, ${corporationName}` : ''}!`,
        welcomeSubtitle: 'You are an Airline Personnel',
        welcomeBody:
          'Manage luggage bookings, track delivery statuses, and ensure smooth handling of passenger belongings.',
        carouselTitle: 'Featured Images',
        emptyText: 'No images available.',
        buttons: [
          { label: 'Book Delivery', icon: 'send', screen: 'BookingManagement' },
          { label: 'Booking History', icon: 'history', screen: 'BookingHistory' },
          { label: 'Luggage Tracking', icon: 'map-marker-path', screen: 'TrackLuggage' },
        ],
        quote:
          '“Keep every delivery smooth and every passenger satisfied. You\'re the bridge between service and success.”',
      }
    }
    return {
      title: 'Home',
      welcomeTitle: 'Welcome!',
      welcomeSubtitle: '',
      welcomeBody: 'Loading your experience...'
    }
  }, [roleId, corporationName])

  const renderItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level1 }]}>
      <Card.Cover source={item} style={styles.cardCover} />
    </Card>
  )

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title={roleConfig.title} />
      <View style={styles.container}>
        {/* Announcements Section */}
        {(showGlobalAnnouncement || (roleId === 1 && showAdminAnnouncement) || (roleId === 2 && showDeliveryAnnouncement) || (roleId === 3 && showAirlineAnnouncement)) && (
          <Surface style={[styles.announcementSurface, { backgroundColor: colors.surface }]} elevation={1}>
            {showGlobalAnnouncement && (
              <Surface style={[styles.singleAnnouncement, { backgroundColor: colors.primary + '12' }]} elevation={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon source="information" size={24} color={colors.primary} />
                  <Text style={[styles.announcementTitle, { color: colors.primary }]}>For all users</Text>
                </View>
                <Text style={[styles.announcementText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  {globalAnnouncement}
                  {'\n'}
                  <Text
                    style={[styles.announcementText, { color: 'blue', ...fonts.bodyMedium, textDecorationLine: 'underline' }]}
                    onPress={() => Linking.openURL('https://docs.google.com/forms/d/1DkNcJ5avdyWlRriAEBrlCkSbyEJqyvhrD5-wRLjCNh4/edit')}
                  >
                    EasyTrack Mobile App Feedback Form
                  </Text>
                </Text>
              </Surface>
            )}
            {roleId === 1 && showAdminAnnouncement && (
              <Surface style={[styles.singleAnnouncement, { backgroundColor: colors.primary + '12' }]} elevation={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon source="information" size={24} color={colors.primary} />
                  <Text style={[styles.announcementTitle, { color: colors.primary }]}>Admin</Text>
                </View>
                <Text style={[styles.announcementText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  {adminAnnouncement}
                </Text>
              </Surface>
            )}
            {roleId === 2 && showDeliveryAnnouncement && (
              <Surface style={[styles.singleAnnouncement, { backgroundColor: colors.primary + '12' }]} elevation={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon source="information" size={24} color={colors.primary} />
                  <Text style={[styles.announcementTitle, { color: colors.primary }]}>Delivery</Text>
                </View>
                <Text style={[styles.announcementText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  {deliveryAnnouncement}
                </Text>
              </Surface>
            )}
            {roleId === 3 && showAirlineAnnouncement && (
              <Surface style={[styles.singleAnnouncement, { backgroundColor: colors.primary + '12' }]} elevation={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon source="information" size={24} color={colors.primary} />
                  <Text style={[styles.announcementTitle, { color: colors.primary }]}>Airline</Text>
                </View>
                <Text style={[styles.announcementText, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                  {airlineAnnouncement}
                </Text>
              </Surface>
            )}
          </Surface>
        )}
        <Surface style={[styles.welcomeSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.welcomeTitle, { color: colors.onSurface, ...fonts.headlineMedium }]}>
            {roleConfig.welcomeTitle}
          </Text>
          {roleConfig.welcomeSubtitle ? (
            <Text style={[styles.welcomeSubTitle, { color: colors.onSurface, ...fonts.titleMedium }]}>
              {roleConfig.welcomeSubtitle}
            </Text>
          ) : null}
          <Divider style={styles.divider} />
          <Text style={[styles.welcomeParagraph, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]}>
            {roleConfig.welcomeBody}
          </Text>
        </Surface>

        <Surface style={[styles.carouselSurface, { backgroundColor: colors.surface }]} elevation={1}>
          {roleConfig.carouselTitle ? (
            <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>
              {roleConfig.carouselTitle}
            </Text>
          ) : null}
          {loading ? (
            <Text style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>Loading images...</Text>
          ) : images.length ? (
            <FlatList
              ref={flatListRef}
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
            <Text style={[styles.noImages, { color: colors.error, ...fonts.bodyLarge }]}>{roleConfig.emptyText}</Text>
          )}
        </Surface>

        {isVerified && roleConfig.buttons ? (
          <Surface style={[styles.actionsSurface, { backgroundColor: colors.surface }]} elevation={1}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]}>Quick Actions</Text>
            <View style={styles.buttonContainer}>
              {roleConfig.buttons.map(({ label, icon, screen }) => (
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
        ) : null}

        {roleConfig.quote ? (
          <Surface style={[styles.quoteSurface, { backgroundColor: colors.surface }]} elevation={1}>
            <Text style={[styles.quoteText, { color: colors.onSurface, ...fonts.bodyMedium }]}>{roleConfig.quote}</Text>
          </Surface>
        ) : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 16, gap: 16 },
  announcementSurface: { padding: 16, borderRadius: 12, gap: 12 },
  singleAnnouncement: { padding: 12, borderRadius: 10 },
  announcementTitle: { fontWeight: '600', marginBottom: 6 },
  announcementText: { lineHeight: 20 },
  welcomeSurface: { padding: 20, borderRadius: 12 },
  welcomeTitle: { textAlign: 'center', fontWeight: 'bold' },
  welcomeSubTitle: { textAlign: 'center', marginBottom: 8 },
  divider: { marginVertical: 12, height: 1, backgroundColor: 'rgba(0, 0, 0, 0.12)' },
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

export default RoleBasedHome


