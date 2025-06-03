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
      { icon: 'currency-php', label: 'Delivery Rates', screen: 'DeliveryRates' },
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
      { icon: 'message-outline', label: 'Message Center', screen: 'MessageCenter' },
    ],
  },
]

export default ADMIN_SECTIONS