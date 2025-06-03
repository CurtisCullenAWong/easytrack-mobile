import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

// Shared Screens
import LoginScreen from '../screens/shared/LoginScreen'
import ContractDetails from '../screens/shared/ContractDetails'
import CheckLocation from '../screens/delivery/subscreen/CheckLocation'
import UserPerformanceStatistics from '../screens/shared/UserPerformanceStatistics'
import MessageCenter from '../screens/MessageCenter'
import BookingHistory from '../screens/shared/BookingHistory'

// Profile Screens
import Profile from '../screens/profiles/Profile'
import EditProfileSubScreen from '../screens/profiles/subscreen/EditProfileSubScreen'
import Verification from '../screens/profiles/subscreen/ProfileVerification'
import SetNewPasswordScreen from '../screens/shared/SetNewPasswordScreen'

// Admin Screens
import AdminHome from '../screens/admin/AdminHome'
import UserManagement from '../screens/admin/UserManagement'
import TransactionManagement from '../screens/admin/TransactionManagement'
import ContractDetailsAdmin from '../screens/admin/subscreen/ContractDetailsAdmin'
import AdminBookingManagement from '../screens/admin/AdminBookingManagement'
import AdminTrackLuggage from '../screens/admin/AdminTrackLuggage'
import TransactionSummary from '../screens/admin/subscreen/TransactionSummary'
import AdminBookingHistory from '../screens/admin/AdminBookingHistory'
import AddAccount from '../screens/admin/subscreen/AddAccount'
import ViewAccountScreen from '../screens/admin/subscreen/ViewAccountScreen'
import DeliveryRates from '../screens/admin/DeliveryRates'
import PerformanceStatistics from '../screens/admin/PerformanceStatistics'
import LocationSelection from '../screens/airline/subscreen/LocationSelection'

// Airline Screens
import AirlineHome from '../screens/airline/AirlineHome'
import AirlineBookingManagement from '../screens/airline/AirlineBookingManagement'
import AirlineTrackLuggage from '../screens/airline/AirlineTrackLuggage'
import TransactionHistory from '../screens/airline/TransactionHistory'

// Delivery Screens
import DeliveryHome from '../screens/delivery/DeliveryHome'
import DeliveryBookingManagement from '../screens/delivery/DeliveryBookingManagement'
import DeliveryConfirmation from '../screens/delivery/subscreen/DeliveryConfirmation'

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
      <Drawer.Screen name="TransactionManagement" component={TransactionManagement} />
      <Drawer.Screen name="TransactionSummary" component={TransactionSummary} />
      <Drawer.Screen name="ContractDetailsAdmin" component={ContractDetailsAdmin} />
      <Drawer.Screen name="AdminBookingManagement" component={AdminBookingManagement} />
      <Drawer.Screen name="AdminBookingHistory" component={AdminBookingHistory} />
      <Drawer.Screen name="DeliveryRates" component={DeliveryRates} />
      <Drawer.Screen name="AdminTrackLuggage" component={AdminTrackLuggage} />

      <Drawer.Screen
        name="AddAccount"
        component={AddAccount}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="ViewAccount"
        component={ViewAccountScreen}
        options={{ headerShown: false }}
      />
      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      {/* <Drawer.Screen name="TransactionHistory" component={TransactionHistory} /> */}
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
      <Drawer.Screen name="Verification" component={Verification} />
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
      <Drawer.Screen name="BookingManagement" component={AirlineBookingManagement} />
      <Drawer.Screen name="ContractDetails" component={ContractDetails} />
      <Drawer.Screen name="CheckLocation" component={CheckLocation} />
      <Drawer.Screen name="LocationSelection" component={LocationSelection} />
      
      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
      <Drawer.Screen name="Verification" component={Verification} />
      <Drawer.Screen name="AirlineTrackLuggage" component={AirlineTrackLuggage} />
      <Drawer.Screen name="UserPerformanceStatistics" component={UserPerformanceStatistics} />
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
      <Drawer.Screen name="BookingManagement" component={DeliveryBookingManagement} />
      <Drawer.Screen name="ContractDetails" component={ContractDetails} />
      <Drawer.Screen name="CheckLocation" component={CheckLocation} />
      <Drawer.Screen name="DeliveryConfirmation" component={DeliveryConfirmation} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
      <Drawer.Screen name="Verification" component={Verification} />
      <Drawer.Screen name="UserPerformanceStatistics" component={UserPerformanceStatistics} />
      <Drawer.Screen name="MessageCenter" component={MessageCenter} />
  </Drawer.Navigator>
)



const StackNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      
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

      <Stack.Screen
        name="Verification"
        component={Verification}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="SetNewPassword"
        component={SetNewPasswordScreen}
        options={{ headerShown: false }}
      />

    </Stack.Navigator>

  </NavigationContainer>
)

export default StackNavigator
