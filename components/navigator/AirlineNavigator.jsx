import { useState, useContext, useEffect } from 'react'
import { Image, ScrollView, StyleSheet, BackHandler, TouchableOpacity } from 'react-native'
import { Text, List, Surface, Divider, useTheme, IconButton } from 'react-native-paper'
import { ThemeContext } from '../themes/themeContext'
import useLogout from '../hooks/useLogout'
import AIRLINE_SECTIONS from './sections/airlineSections'

const SECTIONS = AIRLINE_SECTIONS


const AirlineNavigator = ({ navigation }) => {
  const { toggleTheme } = useContext(ThemeContext)
  const { colors, fonts } = useTheme()
  const { handleLogout, LogoutDialog } = useLogout(navigation)

  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(SECTIONS.map(s => [s.key, true]))
  )

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout()
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
          source={require('../../assets/icon-w_o-name.png')}
          style={styles.logo}
        />
        <Text style={[styles.appName, { color: colors.primary, ...fonts.headlineLarge }]}>
          EasyTrack
        </Text>
      </Surface>
      <Divider style={styles.divider} />

      {SECTIONS.map(section => (
        <ExpandableSection
          key={section.key}
          title={section.title}
          expanded={expandedSections[section.key]}
          onToggle={() => toggleSection(section.key)}
          icon={section.icon}
          items={section.items.map(item =>
            item.actionKey === 'logout'
              ? { ...item, action: handleLogout }
              : item
          )}
          navigation={navigation}
          fonts={fonts}
        />
      ))}
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
          onPress={() => (action ? action() : navigation.navigate(screen))}
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
  themeToggleContainer: { alignItems: 'center', marginVertical: 20, width: '100%', flexDirection:'row', paddingLeft: 32 },
  listItem: { paddingLeft: 30 },
})

export default AirlineNavigator