import React from 'react'
import useLogout from '../../hooks/useLogout'
import SideNavigator from '../shared/SideNavigator'

const DeliveryNavigator = ({ navigation }) => {
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  const DELIVERY_SECTIONS = [
    {
      title: 'My Account',
      key: 'account',
      icon: 'account',
      items: [
        { icon: 'home-outline', label: 'Home', screen: 'DeliveryHome' },
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
      ],
    },
    {
      title: 'Results and Statistics',
      key: 'results',
      icon: 'chart-bar',
      items: [
        { icon: 'history', label: 'Booking History (Completed)', screen: 'BookingHistory' },
        { icon: 'chart-line', label: 'Performance Statistics', screen: 'UserPerformanceStatistics' },
      ],
    },
    {
      title: 'Help and Support',
      key: 'help',
      icon: 'help',
      items: [
        { icon: 'message-outline', label: 'Message Center', screen: 'MessageCenter' },
        { icon: 'file-document-outline', label: 'Terms and Conditions', screen: 'TermsAndConditions' },
      ],
    },
  ]
  return (
    <SideNavigator
      navigation={navigation}
      sections={DELIVERY_SECTIONS}
      LogoutDialog={LogoutDialog}
      handleLogout={handleLogout}
    />
  )
}

export default DeliveryNavigator