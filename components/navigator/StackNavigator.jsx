import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

// Import Screens
import LoginScreen from '../screens/LoginScreen'
import Profile from '../screens/Profile'
import MessageCenter from '../screens/MessageCenter'
import BookingHistory from '../screens/BookingHistory'
import PerformanceStatistics from '../screens/PerformanceStatistics'
import TransactionHistory from '../screens/TransactionHistory'
import SignUpSubScreen from '../SignUpSubsceen'
// Admin Screens
import AdminHome from '../screens/admin/AdminHome'
import UserManagement from '../screens/admin/UserManagement'
import AdminTrackLuggage from '../screens/admin/AdminTrackLuggage'

// Airline Screens
import AirlineHome from '../screens/airline/AirlineHome'
import TrackLuggage from '../screens/airline/AirlineTrackLuggage'
import AirlineBookingManagement from '../screens/airline/BookingManagement'

// Delivery Screens
import DeliveryHome from '../screens/delivery/DeliveryHome'
import CheckLocation from '../screens/CheckLocation'
import DeliveryBookingManagement from '../screens/delivery/BookingManagement'

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

      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistory} />
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
      <Drawer.Screen name="AirlineTrackLuggage" component={TrackLuggage} />
      <Drawer.Screen name="BookingManagement" component={AirlineBookingManagement} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistory} />
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
      <Drawer.Screen name="CheckLocation" component={CheckLocation} />
      <Drawer.Screen name="BookingManagement" component={DeliveryBookingManagement} />

      {/* SHARED SCREENS */}
      <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
      <Drawer.Screen name="BookingHistory" component={BookingHistory} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistory} />
      <Drawer.Screen name="Profile" component={Profile} />
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
      <Stack.Screen
        name="Sign Up"
        component={SignUpSubScreen}
        options={{ headerShown: true }}
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

      {/* SUBSCREENS */}
      {/* <Stack.Screen
        name="AddNewAccount"
        component={}
        options={{ headerShown: true, title: 'Add New Account' }}
      /> */}
    </Stack.Navigator>

  </NavigationContainer>
)

export default StackNavigator
