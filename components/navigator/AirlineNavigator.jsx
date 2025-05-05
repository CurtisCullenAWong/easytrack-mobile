import React, { useState, useContext, useEffect } from 'react'
import { Image, ScrollView, View, StyleSheet, BackHandler } from 'react-native'
import { Text, List, Surface, Button, Divider, useTheme } from 'react-native-paper'
import { ThemeContext } from '../themes/themeContext'
import useLogout from '../hooks/useLogout'

const AdminNavigator = ({ navigation }) => {
  const { toggleTheme } = useContext(ThemeContext)
  const { colors, fonts } = useTheme()

  const [expandedSections, setExpandedSections] = useState({
    transactions: true,
    account: true,
    results: true,
    help: true,
  })
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout()
      return true
    })
    return () => sub.remove()

  }, [handleLogout])

  const handleThemePress = async () => {
    toggleTheme()
  }

  const toggleSection = (section) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))

  const renderSection = (title, key, icon, items) => (
    <ExpandableSection
      title={title}
      expanded={expandedSections[key]}
      onToggle={() => toggleSection(key)}
      icon={icon}
      items={items}
      navigation={navigation}
      fonts={fonts}
    />
  )

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

      {renderSection('My Account', 'account', 'account', [
        { icon: 'home-outline', label: 'Home', screen: 'AirlineHome' },
        { icon: 'card-account-details-outline', label: 'Profile', screen: 'Profile' },
        { icon: 'logout', label: 'Logout', color: 'red', action: handleLogout },
      ])}
      {renderSection('Transactions', 'transactions', 'package', [
        { icon: 'clipboard-edit-outline', label: 'Booking Management', screen: 'BookingManagement' },
        { icon: 'map-marker-path', label: 'Luggage Tracking (In Transit)', screen: 'AirlineTrackLuggage' },
      ])}

      {renderSection('Results and Statistics', 'results', 'chart-bar', [
        { icon: 'credit-card-clock-outline', label: 'Transaction History', screen: 'TransactionHistory' },
        { icon: 'history', label: 'Booking History (Completed)', screen: 'BookingHistory' },
        { icon: 'chart-line', label: 'Performance Statistics', screen: 'PerformanceStatistics' },
      ])}

      {renderSection('Help and Support', 'help', 'help', [
        { icon: 'message-outline', label: 'Message Center', screen: 'MessageCenter' },
      ])}

      <View style={styles.themeToggleContainer}>
        <Button mode="outlined" onPress={handleThemePress} labelStyle={fonts.titleMedium} icon={"theme-light-dark"}>
          Switch Theme
        </Button>
      </View>

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
  divider: { height: 2, alignSelf: 'center' },
  themeToggleContainer: { alignItems: 'center', marginVertical: 20, paddingHorizontal: 16 },
  listItem: { paddingLeft: 30 },
})

export default AdminNavigator