import React from 'react'
import useLogout from '../../hooks/useLogout'
import AIRLINE_SECTIONS from '../sections/airlineSections'
import SideNavigator from '../shared/SideNavigator'

const AirlineNavigator = ({ navigation }) => {
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  return (
    <SideNavigator
      navigation={navigation}
      sections={AIRLINE_SECTIONS}
      LogoutDialog={LogoutDialog}
      handleLogout={handleLogout}
    />
  )
}

export default AirlineNavigator