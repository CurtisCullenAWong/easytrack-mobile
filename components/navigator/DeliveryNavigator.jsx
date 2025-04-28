import React, { useState, useContext, useEffect } from 'react'
import { Image, ScrollView, View, StyleSheet, BackHandler } from 'react-native'
import { Text, List, Surface, Dialog, Portal, Button, IconButton, Switch, Divider } from 'react-native-paper'
import { CommonActions } from '@react-navigation/native'
import { ThemeContext } from '../themes/themeContext'
import { useTheme } from 'react-native-paper'

const DelivieryNavigator = ({ navigation }) => {
  const { toggleTheme } = useContext(ThemeContext)
  const { colors, fonts } = useTheme()

  const [expandedSections, setExpandedSections] = useState({
    transactions: true,
    account: true,
    results: true,
    help: true,
  })
  const [isDialogVisible, setIsDialogVisible] = useState(false)
  const [isSwitchOn, setIsSwitchOn] = useState(false)

  const handleThemeSwitch = () => {
    toggleTheme()
    setIsSwitchOn(!isSwitchOn)
  }

  const handleLogout = () => setIsDialogVisible(true)
  const confirmLogout = () => {
    setIsDialogVisible(false)
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))
  }
  const cancelLogout = () => setIsDialogVisible(false)

  const toggleSection = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))

  const renderSection = (title, sectionKey, icon, items) => (
    <ExpandableSection
      title={title}
      expanded={expandedSections[sectionKey]}
      onToggle={() => toggleSection(sectionKey)}
      icon={icon}
      items={items}
      navigation={navigation}
      fonts={fonts}
    />
  )


  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout() 
      return true
    })
    return () => backHandler.remove()
  }, [])

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Surface style={[styles.surface, { backgroundColor: colors.background }]}>
        <Image source={require('../../assets/icon-w_o-name.png')} style={styles.logo} />
        <Text style={[styles.appName, { color: colors.primary, ...fonts.headlineLarge }]}>
          EasyTrack
        </Text>
      </Surface>
      <Divider style={styles.divider} />
      {renderSection('Transactions', 'transactions', 'package', [
        { icon: 'home-outline', label: 'Home', screen: 'DeliveryHome' },
        { icon: 'file-document-outline', label: 'Contracts (Pending)', screen: 'DeliveryContracts' },
      ])}

      {renderSection('Results and Statistics', 'results', 'chart-bar', [
        { icon: 'history', label: 'Delivery History (Completed)', screen: 'DeliveryHistory' },
        { icon: 'chart-line', label: 'Performance Statistics', screen: 'PerformanceStatistics' },
      ])}

      {renderSection('My Account', 'account', 'account', [
        { icon: 'card-account-details-outline', label: 'Profile', screen: 'Profile' },
        {
          icon: 'logout',
          label: 'Logout',
          color: 'red',
          action: handleLogout,
        },
      ])}

      {renderSection('Help and Support', 'help', 'help', [
        { icon: 'message-outline', label: 'Message Center', screen: 'MessageCenter' },
      ])}

      <View style={styles.themeToggleContainer}>
        <IconButton
          icon="theme-light-dark"
          size={24}
          iconColor={colors.primary}
          onPress={handleThemeSwitch}
          style={styles.themeIconButton}
        />
        <Text style={[styles.themeToggleText, { color: colors.onSurface, ...fonts.titleMedium }]}>
          Toggle Theme
        </Text>
        <Switch value={isSwitchOn} onValueChange={handleThemeSwitch} />
      </View>

      <Portal>
        <Dialog visible={isDialogVisible} onDismiss={cancelLogout} style={{ backgroundColor: colors.surface }}>
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Logout
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface, ...fonts.bodyMedium }}>
              This will log you out. Are you sure?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelLogout} labelStyle={{ color: colors.primary }}>
              Cancel
            </Button>
            <Button onPress={confirmLogout} labelStyle={{ color: colors.primary }}>
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const ExpandableSection = ({ title, expanded, onToggle, icon, items, navigation, fonts }) => {
  const { colors } = useTheme()

  return (
    <List.Accordion
      title={title}
      titleStyle={{ color: colors.onSurface, ...fonts.titleMedium }}
      left={(props) => <List.Icon {...props} icon={icon} />}
      expanded={expanded}
      onPress={onToggle}
    >
      {items.map(({ icon, label, screen, action, color }, idx) => (
        <List.Item
          key={idx}
          title={label}
          left={(props) => <List.Icon {...props} icon={icon} color={color || colors.primary} />}
          onPress={() => (action ? action() : navigation.navigate(screen))}
          titleStyle={{ color: color || colors.onSurface, ...fonts.bodyMedium }}
          style={styles.listItem}
        />
      ))}
    </List.Accordion>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  surface: {
    padding: 20,
    marginTop: 40,
    elevation: 4,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 150,
    resizeMode: 'contain',
  },
  appName: {
    marginTop: 10,
  },
  divider: {
    height: 2,
    alignSelf: 'center',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 20,
  },
  themeIconButton: {
    marginRight: 10,
  },
  themeToggleText: {
    flex: 1,
  },
  listItem: {
    paddingLeft: 30,
  },
})

export default DelivieryNavigator
