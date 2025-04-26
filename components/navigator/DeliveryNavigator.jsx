import React, { useState } from 'react'
import { Image, ScrollView } from 'react-native'
import { useTheme, Text, List, Surface, Dialog, Portal, Button } from 'react-native-paper'
import { CommonActions } from '@react-navigation/native'

const DeliveryNavigator = ({ navigation }) => {
  const [expandedSections, setExpandedSections] = useState({
    transactions: true,
    account: true,
    results: true,
    help: true,
  })
  const [isDialogVisible, setIsDialogVisible] = useState(false)

  const { colors, spacing } = useTheme()

  const handleLogout = () => setIsDialogVisible(true)
  const confirmLogout = () => {
    setIsDialogVisible(false)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    )
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
      iconColor={colors.iconColor}
    />
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <Surface
        style={{
          padding: spacing?.lg ?? 20,
          marginTop: 40,
          elevation: 4,
          alignItems: 'center',
        }}
      >
        <Image
          source={require('../../assets/icon-w_o-name.png')}
          style={{
            width: 100,
            height: 100,
            resizeMode: 'contain',
          }}
        />
        <Text
          variant="titleLarge"
          style={{
            fontWeight: 'bold',
            marginTop: 10,
            fontSize: 30,
            color: colors.primary,
          }}
        >
          EasyTrack
        </Text>
      </Surface>

      {renderSection('Transactions', 'transactions', 'package', [
        { icon: 'home-outline', label: 'Home', screen: 'DeliveryHome' },
        { icon: 'file-document-outline', label: 'Contracts', screen: 'DeliveryContracts' },
      ])}

      {renderSection('Results and Statistics', 'results', 'chart-bar', [
        { icon: 'history', label: 'Delivery History and Reports', screen: 'DeliveryHistory' },
        // { icon: 'chart-line', label: 'Performance Statistics', screen: '' },
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

      <Portal>
        <Dialog visible={isDialogVisible} onDismiss={cancelLogout}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text>This will log you out. Are you sure?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelLogout}>Cancel</Button>
            <Button onPress={confirmLogout}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const ExpandableSection = ({ title, expanded, onToggle, icon, items, navigation, iconColor }) => (
  <List.Accordion
    title={title}
    titleStyle={{ fontWeight: 'bold', fontSize: 16, color: iconColor }}
    left={(props) => <List.Icon {...props} icon={icon} color={iconColor} />}
    expanded={expanded}
    onPress={onToggle}
  >
    {items.map(({ icon, label, screen, action, color }, idx) => (
      <List.Item
        key={idx}
        title={label}
        left={(props) => <List.Icon {...props} icon={icon} color={color || iconColor} />}
        onPress={() => (action ? action() : navigation.navigate(screen))}
        titleStyle={{ color: color || undefined, fontSize: 14 }}
        style={{ paddingLeft: 30 }}
      />
    ))}
  </List.Accordion>
)

export default DeliveryNavigator
