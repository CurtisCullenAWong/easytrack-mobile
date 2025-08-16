import { useState, useContext, useEffect } from 'react'
import { Image, ScrollView, StyleSheet, BackHandler, TouchableOpacity } from 'react-native'
import { Text, List, Surface, Divider, useTheme, IconButton, ActivityIndicator } from 'react-native-paper'
import { ThemeContext } from '../../themes/themeContext'

const SideNavigator = ({ navigation, sections, LogoutDialog, handleLogout, isVerified = true }) => {
  const { toggleTheme } = useContext(ThemeContext)
  const { colors, fonts } = useTheme()

  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(sections.map(s => [s.key, true]))
  )

  // Development-only: Warn if a section's screen does not exist in navigation
  useEffect(() => {
    if (__DEV__ && navigation && navigation.getState) {
      const registeredScreens = new Set(
        navigation.getState()?.routeNames || []
      )
      sections.forEach(section => {
        section.items.forEach(item => {
          if (item.screen && !registeredScreens.has(item.screen)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[SideNavigator] Screen "${item.screen}" in section "${section.title}" is not registered in the Drawer.Navigator. Navigation will fail.`
            )
          }
        })
      })
    }
  }, [navigation, sections])

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (handleLogout) handleLogout()
      return true
    })
    return () => sub.remove()
  }, [handleLogout])

  const handleThemeButton = () => {
    toggleTheme()
  }

  const toggleSection = (section) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}> 
      <Surface style={[styles.surface, { backgroundColor: colors.background }]}> 
        <Image
          source={require('../../../assets/icon-w_o-name.png')}
          style={styles.logo}
        />
        <Text style={[styles.appName, { color: colors.primary, ...fonts.headlineLarge }]}> 
          EasyTrack
        </Text>
      </Surface>
      {!isVerified && (
        <Surface style={[styles.warningSurface, { backgroundColor: colors.errorContainer }]} elevation={1}>
          <Text style={[styles.warningText, { color: colors.onErrorContainer, ...fonts.bodyMedium }]}>
            NOTICE: Your account is not verified yet. Some features are limited. Please complete your profile verification to access all features. ⚠️ 
          </Text>
        </Surface>
      )}

      <Divider style={styles.divider} />

      {sections.map(section => {
        // Filter items based on verification status
        const filteredItems = section.items.filter(item => {
          // Always allow Profile, Logout, and Terms and Conditions
          if (item.screen === 'Profile' || item.actionKey === 'logout' || item.screen === 'TermsAndConditions') {
            return true
          }
          // For all other items, require verification
          return isVerified
        })

        // Only show sections that have visible items
        if (filteredItems.length === 0) {
          return null
        }

        return (
          <ExpandableSection
            key={section.key}
            title={section.title}
            expanded={expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            icon={section.icon}
            items={filteredItems.map(item =>
              item.actionKey === 'logout' && handleLogout
                ? { ...item, action: handleLogout }
                : item
            )}
            navigation={navigation}
            fonts={fonts}
          />
        )
      })}
      <Divider style={styles.divider} />
      <TouchableOpacity style={styles.themeToggleContainer} onPress={handleThemeButton}>
        <IconButton
          style={{ backgroundColor: colors.background,}}
          mode="contained-tonal"
          icon={'theme-light-dark'}
          iconColor={colors.primary}
        />
        <Text style={[{ color: colors.onBackground }, fonts.labelMedium]}>
            Switch Theme
        </Text>
      </TouchableOpacity>
      {LogoutDialog}
    </ScrollView>
  )
}

const ExpandableSection = ({ title, expanded, onToggle, icon, items, navigation, fonts }) => {
  const { colors } = useTheme()
  // Debounce navigation to prevent double-tap issues
  const [navLock, setNavLock] = useState(false)
  const [loadingIdx, setLoadingIdx] = useState(null)
  const handleItemPress = (action, screen, idx) => {
    if (navLock) return
    setNavLock(true)
    setLoadingIdx(idx)
    if (action) {
      action()
    } else if (screen && navigation && navigation.navigate) {
      navigation.navigate(screen)
    }
    setTimeout(() => {
      setNavLock(false)
      setLoadingIdx(null)
    }, 500) // 500ms lockout
  }
  return (
    <List.Accordion
      title={title}
      titleStyle={[{ color: colors.onSurface }, fonts.labelLarge]}
      left={props => <List.Icon {...props} icon={icon} />}
      expanded={expanded}
      onPress={onToggle}
    >
      {items.map(({ icon, label, screen, action, color }, idx) => (
        <List.Item
          key={idx}
          title={label}
          titleStyle={[{ color: colors.onSurface }, fonts.labelMedium]}
          left={props => <List.Icon {...props} icon={icon} color={color || colors.primary} />}
          right={props => loadingIdx === idx ? <ActivityIndicator size={18} color={colors.primary} /> : null}
          onPress={() => handleItemPress(action, screen, idx)}
          style={styles.listItem}
        />
      ))}
    </List.Accordion>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  surface: { padding: 20, marginTop: 40, elevation: 4, alignItems: 'center' },
  logo: { width: 200, height: 150, resizeMode: 'contain' },
  appName: { marginTop: 10 },
  divider: { height: 0.8, },
  warningSurface: { 
    margin: 16, 
    padding: 16, 
    borderRadius: 8,
    marginBottom: 8
  },
  warningText: { 
    textAlign: 'center',
    lineHeight: 20
  },
  themeToggleContainer: { alignItems: 'center', marginVertical: 20, width: '100%', flexDirection:'row', paddingLeft: 32 },
  listItem: { paddingLeft: 30 },
})

export default SideNavigator
