import React from 'react'
import useLogout from '../../hooks/useLogout'
import useVerificationStatus from '../../hooks/useVerificationStatus'
import SideNavigator from '../shared/SideNavigator'

const AdminNavigator = ({ navigation }) => {
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  const { isVerified } = useVerificationStatus()
  const ADMIN_SECTIONS = [
    {
      title: 'My Account',
      key: 'account',
      icon: 'account',
      items: [
        { icon: 'home-outline', label: 'Home', screen: 'AdminHome' },
        { icon: 'card-account-details-outline', label: 'Profile', screen: 'Profile' },
        { icon: 'logout', label: 'Logout', color: 'red', actionKey: 'logout' },
      ],
    },
    {
      title: 'Transactions',
      key: 'transactions',
      icon: 'package',
      items: [
        { icon: 'account-group-outline', label: 'User Management', screen: 'UserManagement' },
        { icon: 'map-marker-path', label: 'Booking Management', screen: 'AdminBookingManagement' },
        { icon: 'bank-transfer', label: 'Transaction Management', screen: 'TransactionManagement' },
        { icon: 'map', label: 'Track Luggage', screen: 'TrackLuggage' },
  
      ],
    },
    {
      title: 'Results and Statistics',
      key: 'results',
      icon: 'chart-bar',
      items: [
        { icon: 'history', label: 'Booking History (Completed)', screen: 'AdminBookingHistory' },
        { icon: 'chart-line', label: 'Performance Statistics', screen: 'PerformanceStatistics' },
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
  return (
    <SideNavigator
      navigation={navigation}
      sections={ADMIN_SECTIONS}
      LogoutDialog={LogoutDialog}
      handleLogout={handleLogout}
      isVerified={isVerified}
    />
  )
}

export default AdminNavigator