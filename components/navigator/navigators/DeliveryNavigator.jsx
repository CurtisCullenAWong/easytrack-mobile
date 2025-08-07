import React from 'react'
import useLogout from '../../hooks/useLogout'
import DELIVERY_SECTIONS from '../sections/deliverySections'
import SideNavigator from '../shared/SideNavigator'

const DeliveryNavigator = ({ navigation }) => {
  const { handleLogout, LogoutDialog } = useLogout(navigation)
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