import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

// Shared Screens
import LoginScreen from '../screens/shared/LoginScreen'
import ContractDetails from '../screens/shared/ContractDetails'
import CheckLocation from '../screens/shared/CheckLocation'
import UserPerformanceStatistics from '../screens/shared/UserPerformanceStatistics'
import BookingHistory from '../screens/shared/BookingHistory'
import TermsAndConditions from '../screens/shared/TermsAndConditions'

// Profile Screens
import Profile from '../screens/profiles/Profile'
import EditProfileSubScreen from '../screens/profiles/subscreen/EditProfileSubScreen'
import Verification from '../screens/profiles/subscreen/ProfileVerification'
import SetNewPasswordScreen from '../screens/shared/SetNewPasswordScreen'
import ProfileCompletionCheck from '../screens/shared/ProfileCompletionCheck'
import UpdateProfileScreen from '../screens/shared/UpdateProfileScreen'

// Admin Screens
import AdminHome from '../screens/admin/AdminHome'
import UserManagement from '../screens/admin/UserManagement'
import TransactionManagement from '../screens/admin/TransactionManagement'
import TransactionSummary from '../screens/admin/subscreen/transaction_management_subscreen/TransactionSummary'
import ViewInvoice from '../screens/admin/subscreen/transaction_management_subscreen/ViewInvoice'
import ContractDetailsAdmin from '../screens/admin/subscreen/ContractDetailsAdmin'
import AdminBookingManagement from '../screens/admin/AdminBookingManagement'
import AdminBookingHistory from '../screens/admin/AdminBookingHistory'
import AddAccount from '../screens/admin/subscreen/AddAccount'
import ViewAccountScreen from '../screens/admin/subscreen/ViewAccountScreen'
import PerformanceStatistics from '../screens/admin/PerformanceStatistics'
import SelectLocation from '../screens/airline/subscreen/SelectLocation'

// Airline Screens
import AirlineHome from '../screens/airline/AirlineHome'
import AirlineBookingManagement from '../screens/airline/AirlineBookingManagement'
import TrackLuggage from '../screens/shared/TrackLuggage'

// Delivery Screens
import DeliveryHome from '../screens/delivery/DeliveryHome'
import DeliveryBookingManagement from '../screens/delivery/DeliveryBookingManagement'
import DeliveryConfirmation from '../screens/delivery/subscreen/DeliveryConfirmation'

// Messaging Screens
import Messages from '../screens/messaging/Messages'
import NewMessage from '../screens/messaging/NewMessage'
import ViewMessage from '../screens/messaging/ViewMessage'
import ViewProfile from '../screens/messaging/ViewProfile'

// Import Navigators
import AdminNavigator from './sidebar/AdminNavigator'
import DeliveryNavigator from './sidebar/DeliveryNavigator'
import AirlineNavigator from './sidebar/AirlineNavigator'

const Stack = createNativeStackNavigator()
const Drawer = createDrawerNavigator()

/** Messaging Stack */
const MessagingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MessagesHome" component={Messages} />
    <Stack.Screen name="NewMessage" component={NewMessage} />
    <Stack.Screen name="ViewMessage" component={ViewMessage} />
    <Stack.Screen name="ViewProfile" component={ViewProfile} />
  </Stack.Navigator>
)

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
    <Drawer.Screen name="ViewInvoice" component={ViewInvoice} />
    <Drawer.Screen name="ContractDetailsAdmin" component={ContractDetailsAdmin} />
    <Drawer.Screen name="BookingManagement" component={AdminBookingManagement} />
    <Drawer.Screen name="SelectLocation" component={SelectLocation} />
    <Drawer.Screen name="AdminBookingHistory" component={AdminBookingHistory} />
    <Drawer.Screen name="TrackLuggage" component={TrackLuggage} />
    <Drawer.Screen name="AddAccount" component={AddAccount} />
    <Drawer.Screen name="ViewAccount" component={ViewAccountScreen} />

    {/* SHARED */}
    <Drawer.Screen name="CheckLocation" component={CheckLocation} />
    <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
    <Drawer.Screen name="BookingHistory" component={BookingHistory} />
    <Drawer.Screen name="Profile" component={Profile} />
    <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
    <Drawer.Screen name="UpdateProfile" component={UpdateProfileScreen} />
    <Drawer.Screen name="ProfileCompletionCheck" component={ProfileCompletionCheck} />
    <Drawer.Screen name="Verification" component={Verification} />
    <Drawer.Screen name="Messages" component={MessagingNavigator} />
    <Drawer.Screen name="TermsAndConditions" component={TermsAndConditions} />
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
    <Drawer.Screen name="SelectLocation" component={SelectLocation} />

    {/* SHARED */}
    <Drawer.Screen name="CheckLocation" component={CheckLocation} />
    <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
    <Drawer.Screen name="BookingHistory" component={BookingHistory} />
    <Drawer.Screen name="Profile" component={Profile} />
    <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
    <Drawer.Screen name="UpdateProfile" component={UpdateProfileScreen} />
    <Drawer.Screen name="ProfileCompletionCheck" component={ProfileCompletionCheck} />
    <Drawer.Screen name="Verification" component={Verification} />
    <Drawer.Screen name="TrackLuggage" component={TrackLuggage} />
    <Drawer.Screen name="UserPerformanceStatistics" component={UserPerformanceStatistics} />
    <Drawer.Screen name="Messages" component={MessagingNavigator} />
    <Drawer.Screen name="TermsAndConditions" component={TermsAndConditions} />
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
    <Drawer.Screen name="DeliveryConfirmation" component={DeliveryConfirmation} />

    {/* SHARED */}
    <Drawer.Screen name="CheckLocation" component={CheckLocation} />
    <Drawer.Screen name="PerformanceStatistics" component={PerformanceStatistics} />
    <Drawer.Screen name="BookingHistory" component={BookingHistory} />
    <Drawer.Screen name="Profile" component={Profile} />
    <Drawer.Screen name="EditProfile" component={EditProfileSubScreen} />
    <Drawer.Screen name="UpdateProfile" component={UpdateProfileScreen} />
    <Drawer.Screen name="ProfileCompletionCheck" component={ProfileCompletionCheck} />
    <Drawer.Screen name="Verification" component={Verification} />
    <Drawer.Screen name="UserPerformanceStatistics" component={UserPerformanceStatistics} />
    <Drawer.Screen name="Messages" component={MessagingNavigator} />
    <Drawer.Screen name="TermsAndConditions" component={TermsAndConditions} />
  </Drawer.Navigator>
)

const StackNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ gestureEnabled: false }}>
      {/* Login */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

      {/* Drawers */}
      <Stack.Screen name="AdminDrawer" component={AdminDrawer} options={{ headerShown: false }} />
      <Stack.Screen name="DeliveryDrawer" component={DeliveryDrawer} options={{ headerShown: false }} />
      <Stack.Screen name="AirlineDrawer" component={AirlineDrawer} options={{ headerShown: false }} />

      {/* Shared */}
      <Stack.Screen name="Verification" component={Verification} options={{ headerShown: false }} />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileCompletionCheck" component={ProfileCompletionCheck} options={{ headerShown: false }} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  </NavigationContainer>
)

export default StackNavigator
