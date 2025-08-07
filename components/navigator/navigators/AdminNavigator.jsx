import React from 'react'
import useLogout from '../../hooks/useLogout'
import ADMIN_SECTIONS from '../sections/adminSections'
import SideNavigator from '../shared/SideNavigator'

const AdminNavigator = ({ navigation }) => {
  const { handleLogout, LogoutDialog } = useLogout(navigation)
  return (
    <SideNavigator
      navigation={navigation}
      sections={ADMIN_SECTIONS}
      LogoutDialog={LogoutDialog}
      handleLogout={handleLogout}
    />
  )
}

export default AdminNavigator