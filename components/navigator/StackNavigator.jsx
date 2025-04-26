import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

// Import Screens
import LoginScreen from '../screens/LoginScreen'
import Profile from '../screens/Profile'
import MessageCenter from '../screens/MessageCenter'
import DeliveryHistory from '../screens/DeliveryHistory'

// Admin Screens
import AdminHome from '../screens/admin/AdminHome'
import UserManagement from '../screens/admin/UserManagement'
import AddNewAccountScreen from '../screens/admin/UserManagement/AddNewAccountScreen'
import EditAccountScreen from '../screens/admin/UserManagement/EditAccountScreen'
import AdminTrackLuggage from '../screens/admin/AdminTrackLuggage'
import AdminContracts from '../screens/admin/AdminContracts'

// Delivery Screens
import DeliveryHome from '../screens/delivery/DeliveryHome'
import DeliveryContracts from '../screens/delivery/DeliveryContracts'

import CheckLocation from '../screens/delivery/CheckLocation'
import Analytics from '../screens/delivery/Analytics'

// Airline Screens
import AirlineHome from '../screens/airline/AirlineHome'
import TrackLuggage from '../screens/airline/AirlineTrackLuggage'
import AirlineContracts from '../screens/airline/AirlineContracts'
import Contracting from '../screens/airline/Contracting'

// Import Navigators
import AdminNavigator from './AdminNavigator'
import DeliveryNavigator from './DeliveryNavigator'
import AirlineNavigator from './AirlineNavigator'

const Stack = createNativeStackNavigator()
const Drawer = createDrawerNavigator()

/** Admin Drawer Navigator */
const AdminDrawer = () => (
  <Drawer.Navigator
      drawerContent={(props) => <AdminNavigator {...props} />}
      screenOptions={{ headerShown: false }}
  >
      <Drawer.Screen name="AdminHome" component={AdminHome} />
      <Drawer.Screen name="UserManagement" component={UserManagement} />
      <Drawer.Screen name="AdminTrackLuggage" component={AdminTrackLuggage} />
      <Drawer.Screen name="AdminContracts" component={AdminContracts} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="DeliveryHistory" component={DeliveryHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="MessageCenter" component={MessageCenter} />
  </Drawer.Navigator>
)

/** Delivery Drawer Navigator */

const DeliveryDrawer = () => (
  <Drawer.Navigator
      drawerContent={(props) => <DeliveryNavigator {...props} />}
      screenOptions={{ headerShown: false }}
  >
      <Drawer.Screen name="DeliveryHome" component={DeliveryHome} />
      <Drawer.Screen name="DeliveryContracts" component={DeliveryContracts} />
      <Drawer.Screen name="CheckLocation" component={CheckLocation} />
      <Drawer.Screen name="Analytics" component={Analytics} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="DeliveryHistory" component={DeliveryHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="MessageCenter" component={MessageCenter} />
  </Drawer.Navigator>
)

/** Airline Drawer Navigator */

const AirlineDrawer = () => (
  <Drawer.Navigator
      drawerContent={(props) => <AirlineNavigator {...props} />}
      screenOptions={{ headerShown: false }}
  >
      <Drawer.Screen name="AirlineHome" component={AirlineHome} />
      <Drawer.Screen name="TrackLuggage" component={TrackLuggage} />
      <Drawer.Screen name="AirlineContracts" component={AirlineContracts} />
      <Drawer.Screen name="Contracting" component={Contracting} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="DeliveryHistory" component={DeliveryHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="MessageCenter" component={MessageCenter} />
  </Drawer.Navigator>
)



const StackNavigator = () => (
  <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
      
      {/* Login Screen */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      {/* Admin Drawer (no headers shown inside) */}
      <Stack.Screen
        name="AdminDrawer"
        component={AdminDrawer}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddNewAccount"
        component={AddNewAccountScreen}
        options={{ headerShown: true, title: 'Add New Account' }}
      />
      <Stack.Screen
        name="EditAccount"
        component={EditAccountScreen}
        options={{ headerShown: true, title: 'Edit Account' }}
      />
      {/* Delivery Drawer (no headers shown inside) */}
      <Stack.Screen
        name="DeliveryDrawer"
        component={DeliveryDrawer}
        options={{ headerShown: false }}
      />

      {/* Airline Drawer (no headers shown inside) */}
      <Stack.Screen
        name="AirlineDrawer"
        component={AirlineDrawer}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>

  </NavigationContainer>
)

export default StackNavigator
