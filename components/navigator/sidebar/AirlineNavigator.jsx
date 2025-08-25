import { useState, useContext, useEffect, memo } from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  InteractionManager,
} from 'react-native'
import {
  Text,
  List,
  Surface,
  Divider,
  useTheme,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper'
import { ThemeContext } from '../../themes/themeContext'
import useLogout from '../../hooks/useLogout'
import useVerificationStatus from '../../hooks/useVerificationStatus'

// Memoize the List.Item component to prevent unnecessary re-renders
const MemoizedListItem = memo(
  ({ icon, label, screen, action, color, colors, fonts, handlePress, idx, loadingIdx }) => {
    return (
      <List.Item
        title={label}
        titleStyle={[{ color: colors.onSurface }, fonts.labelMedium]}
        left={props => <List.Icon {...props} icon={icon} color={color || colors.primary} />}
        right={() => loadingIdx === idx ? <ActivityIndicator size={18} color={colors.primary} /> : null}
        onPress={() => handlePress(action, screen, idx)}
        style={styles.listItem}
      />
    )
  }
)

const ExpandableSection = ({ title, expanded, onToggle, icon, items, navigation, fonts }) => {
  const { colors } = useTheme()
  const [navLock, setNavLock] = useState(false)
  const [loadingIdx, setLoadingIdx] = useState(null)

  const handlePress = (action, screen, idx) => {
    if (navLock) return
    setNavLock(true)
    setLoadingIdx(idx)

    // Use InteractionManager to ensure navigation happens after any active animations
    InteractionManager.runAfterInteractions(() => {
      if (action) {
        action()
      } else if (screen) {
        navigation.navigate(screen)
      }
      // Delay state reset to give time for navigation transition
      setTimeout(() => {
        setNavLock(false)
        setLoadingIdx(null)
      }, 300)
    })
  }

  return (
    <List.Accordion
      title={title}
      titleStyle={[{ color: colors.onSurface }, fonts.labelLarge]}
      left={props => <List.Icon {...props} icon={icon} />}
      expanded={expanded}
      onPress={onToggle}
    >
      {items.map((item, idx) => (
        <MemoizedListItem
          key={item.label} // Use a unique and stable key like the label
          {...item}
          idx={idx}
          colors={colors}
          fonts={fonts}
          handlePress={handlePress}
          loadingIdx={loadingIdx}
        />
      ))}
    </List.Accordion>
  )
}

const AirlineNavigator = ({ navigation }) => {
  const { toggleTheme } = useContext(ThemeContext)
  const { colors, fonts } = useTheme()
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  const { isVerified } = useVerificationStatus()
  const [themeLoading, setThemeLoading] = useState(false)

  const SECTIONS = [
      {
        title: 'My Account',
        key: 'account',
        icon: 'account',
        items: [
          { icon: 'home-outline', label: 'Home', screen: 'AirlineHome' },
          { icon: 'card-account-details-outline', label: 'Profile', screen: 'Profile' },
          { icon: 'logout', label: 'Logout', color: 'red', actionKey: 'logout' },
        ],
      },
      {
        title: 'Transactions',
        key: 'transactions',
        icon: 'package',
        items: [
          { icon: 'clipboard-edit-outline', label: 'Booking Management', screen: 'BookingManagement' },
          { icon: 'map', label: 'Track Luggage', screen: 'TrackLuggage' },
        ],
      },
      {
        title: 'Results and Statistics',
        key: 'results',
        icon: 'chart-bar',
        items: [
          { icon: 'history', label: 'Booking History', screen: 'BookingHistory' },
          { icon: 'chart-line', label: 'Performance Statistics', screen: 'UserPerformanceStatistics' },
        ],
      },
      {
        title: 'Help and Support',
        key: 'help',
        icon: 'help',
        items: [
          { icon: 'message-outline', label: 'Messages', screen: 'Messages' },
          { icon: 'file-document-outline', label: 'Terms and Conditions', screen: 'TermsAndConditions' },
        ],
      },
  ]

  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(SECTIONS.map(s => [s.key, true]))
  )

  useEffect(() => {
    if (__DEV__ && navigation && navigation.getState) {
      const registeredScreens = new Set(navigation.getState()?.routeNames || [])
      SECTIONS.forEach(section => {
        section.items.forEach(item => {
          if (item.screen && !registeredScreens.has(item.screen)) {
            console.warn(`[AirlineNavigator] Screen "${item.screen}" missing.`)
          }
        })
      })
    }
  }, [navigation])

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (handleLogout) handleLogout()
      return true
    })
    return () => sub.remove()
  }, [handleLogout])

  const toggleSection = key =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const handleThemeToggle = () => {
    setThemeLoading(true)
    // Use InteractionManager to ensure the theme change happens smoothly after any UI updates
    InteractionManager.runAfterInteractions(() => {
      toggleTheme()
      setThemeLoading(false)
    })
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Surface style={[styles.surface, { backgroundColor: colors.background }]}>
        <Image source={require('../../../assets/icon-w_o-name.png')} style={styles.logo} />
        <Text style={[styles.appName, { color: colors.primary, ...fonts.headlineLarge }]}>
          EasyTrack
        </Text>
      </Surface>

      {!isVerified && (
        <Surface style={[styles.warningSurface, { backgroundColor: colors.errorContainer }]} elevation={1}>
          <Text style={[styles.warningText, { color: colors.onErrorContainer, ...fonts.bodyMedium }]}>
            NOTICE: Your account is not verified yet. Some features are limited. Please complete your profile verification. ⚠️
          </Text>
        </Surface>
      )}

      <Divider style={styles.divider} />

      {SECTIONS.map(section => {
        const filtered = section.items.filter(item => {
          if (
            item.screen === 'Profile' ||
            item.screen === 'TermsAndConditions' ||
            item.actionKey === 'logout'
          ) {
            return true
          }
          return isVerified
        })
        if (filtered.length === 0) return null

        return (
          <ExpandableSection
            key={section.key}
            title={section.title}
            expanded={expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            icon={section.icon}
            items={filtered.map(item =>
              item.actionKey === 'logout' ? { ...item, action: handleLogout } : item
            )}
            navigation={navigation}
            fonts={fonts}
          />
        )
      })}

      <Divider style={styles.divider} />

      <TouchableOpacity
        style={styles.themeToggleContainer}
        onPress={handleThemeToggle}
        disabled={themeLoading}
      >
        {themeLoading ? (
          <ActivityIndicator size={24} color={colors.primary} style={{ marginRight: 8 }} />
        ) : (
          <IconButton
            style={{ backgroundColor: colors.background }}
            mode="contained-tonal"
            icon="theme-light-dark"
            iconColor={colors.primary}
          />
        )}
        <Text style={[{ color: colors.onBackground }, fonts.labelMedium]}>Switch Theme</Text>
      </TouchableOpacity>

      {LogoutDialog}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  surface: { padding: 20, marginTop: 40, elevation: 4, alignItems: 'center' },
  logo: { width: 200, height: 150, resizeMode: 'contain' },
  appName: { marginTop: 10 },
  divider: { height: 0.8 },
  warningSurface: { margin: 16, padding: 16, borderRadius: 8, marginBottom: 8 },
  warningText: { textAlign: 'center', lineHeight: 20 },
  themeToggleContainer: { alignItems: 'center', marginVertical: 20, flexDirection: 'row', paddingLeft: 32 },
  listItem: { paddingLeft: 30 },
})

export default AirlineNavigator