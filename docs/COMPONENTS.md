# Component Documentation

## Overview

This document provides comprehensive documentation for all components in the EasyTrack mobile application, including their architecture, usage patterns, and implementation details.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Navigation Components](#navigation-components)
- [Custom Components](#custom-components)
- [Screen Components](#screen-components)
- [Custom Hooks](#custom-hooks)
- [Theme System](#theme-system)
- [Utility Components](#utility-components)
- [Component Guidelines](#component-guidelines)

## Architecture Overview

### Component Hierarchy

```
App.jsx (Root)
├── ThemeContext.Provider
├── PaperProvider
├── NotificationProvider
├── SafeAreaProvider
└── StackNavigator
    ├── LoginScreen
    ├── AdminDrawer
    ├── DeliveryDrawer
    ├── AirlineDrawer
    └── Shared Screens
```

### Directory Structure

```
components/
├── customComponents/      # Reusable UI components
├── hooks/                # Custom React hooks
├── navigator/            # Navigation configuration
│   └── sidebar/          # Role-specific navigation drawers
├── screens/              # Screen components organized by role
│   ├── admin/           # Administrator screens
│   ├── airline/         # Airline personnel screens
│   ├── delivery/        # Delivery partner screens
│   ├── messaging/       # Communication screens
│   ├── profiles/        # User profile screens
│   └── shared/          # Shared screens across roles
└── themes/              # Theme configuration and styling
```

## Navigation Components

### StackNavigator

**Location**: `components/navigator/StackNavigator.jsx`

The root navigation component that orchestrates the entire app navigation structure.

#### Features
- **Nested Navigation**: Combines Stack and Drawer navigation
- **Role-based Routing**: Different drawer navigators for each user role
- **Shared Screens**: Common screens accessible across all roles
- **Authentication Flow**: Handles login and session management

#### Implementation

```jsx
const StackNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ gestureEnabled: false }}>
      {/* Authentication */}
      <Stack.Screen name="Login" component={LoginScreen} />
      
      {/* Role-based Drawers */}
      <Stack.Screen name="AdminDrawer" component={AdminDrawer} />
      <Stack.Screen name="DeliveryDrawer" component={DeliveryDrawer} />
      <Stack.Screen name="AirlineDrawer" component={AirlineDrawer} />
      
      {/* Shared Screens */}
      <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
    </Stack.Navigator>
  </NavigationContainer>
)
```

#### Navigation Flow
1. **Login Screen**: Initial authentication screen
2. **Profile Completion Check**: Validates required profile fields
3. **Role-based Drawer**: Routes to appropriate drawer based on user role
4. **Shared Screens**: Accessible from any role's drawer

### Role-based Drawer Navigators

#### AdminDrawer
- **Purpose**: Administrator interface with system management features
- **Screens**: User management, transaction oversight, audit logs
- **Navigation**: Comprehensive admin controls and monitoring tools

#### DeliveryDrawer  
- **Purpose**: Delivery partner interface with contract management
- **Screens**: Booking management, delivery confirmation, performance tracking
- **Navigation**: Delivery-focused workflow and tracking tools

#### AirlineDrawer
- **Purpose**: Airline personnel interface for luggage booking
- **Screens**: Booking creation, luggage tracking, history management
- **Navigation**: Airline-specific booking and tracking features

### Sidebar Navigation Components

#### AdminNavigator

**Location**: `components/navigator/sidebar/AdminNavigator.jsx`

Provides the sidebar navigation for administrators with expandable sections.

```jsx
const SECTIONS = [
  {
    title: 'My Account',
    key: 'account',
    icon: 'account',
    items: [
      { label: 'Profile', screen: 'Profile', icon: 'account-circle' },
      { label: 'Verification', screen: 'Verification', icon: 'shield-check' }
    ]
  },
  {
    title: 'System Management',
    key: 'management', 
    icon: 'cog',
    items: [
      { label: 'User Management', screen: 'UserManagement', icon: 'account-group' },
      { label: 'Transaction Management', screen: 'TransactionManagement', icon: 'bank-transfer' }
    ]
  }
]
```

#### Key Features
- **Expandable Sections**: Organized navigation with collapsible groups
- **Verification Status**: Shows user verification status with warnings
- **Theme Toggle**: Built-in light/dark theme switching
- **Loading States**: Visual feedback during navigation
- **Memoized Components**: Optimized performance with React.memo

#### DeliveryNavigator & AirlineNavigator

Similar structure to AdminNavigator but with role-specific sections and features:

- **DeliveryNavigator**: Contract management, delivery tracking, performance metrics
- **AirlineNavigator**: Booking management, luggage tracking, airline-specific features

### Messaging Navigator

**Location**: `components/navigator/StackNavigator.jsx` (MessagingNavigator)

Handles the in-app messaging system with nested stack navigation.

```jsx
const MessagingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MessagesHome" component={Messages} />
    <Stack.Screen name="NewMessage" component={NewMessage} />
    <Stack.Screen name="ViewMessage" component={ViewMessage} />
    <Stack.Screen name="ViewProfile" component={ViewProfile} />
  </Stack.Navigator>
)
```

## Custom Components

### Header Component

**Location**: `components/customComponents/Header.jsx`

A consistent app header used across all screens.

#### Features
- **Role-based Styling**: Adapts appearance based on user role
- **Profile Integration**: Displays user avatar and basic info
- **Navigation Integration**: Seamless drawer toggle functionality
- **Theme Awareness**: Responds to light/dark theme changes

#### Usage

```jsx
import Header from '../../customComponents/Header'

const Screen = ({ navigation }) => (
  <View>
    <Header navigation={navigation} title="Screen Title" />
    {/* Screen content */}
  </View>
)
```

#### Implementation Details

```jsx
const Header = ({ navigation, title }) => {
  const { colors, fonts } = useTheme()
  const [firstName, setFirstName] = useState('')
  const [profilePicture, setProfilePicture] = useState(null)
  const [userRole, setUserRole] = useState('')

  // Fetch user profile data
  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('first_name, pfp_id, role_id(role_name)')
      .eq('id', user.id)
      .single()
    
    setFirstName(data.first_name)
    setUserRole(data.role_id.role_name)
    // Handle profile picture logic
  }

  return (
    <Appbar.Header style={{ backgroundColor: colors.surface }}>
      <Appbar.Action 
        icon="menu" 
        onPress={() => navigation.openDrawer()} 
      />
      <Appbar.Content title={title} />
      <Avatar.Image source={profilePicture} size={32} />
    </Appbar.Header>
  )
}
```

### BottomModal Component

**Location**: `components/customComponents/BottomModal.jsx`

A reusable modal component that slides up from the bottom of the screen.

#### Features
- **Flexible Content**: Accepts any React children
- **Animation Support**: Smooth slide-up animation
- **Backdrop Handling**: Touch backdrop to close
- **Theme Integration**: Adapts to current theme

#### Usage

```jsx
import BottomModal from '../../customComponents/BottomModal'

const [modalVisible, setModalVisible] = useState(false)

<BottomModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  title="Modal Title"
>
  {/* Modal content */}
</BottomModal>
```

### ContractActionModalContent

**Location**: `components/customComponents/ContractActionModalContent.jsx`

Specialized modal content for contract-related actions in delivery management.

#### Features
- **Action-specific UI**: Different layouts for pickup, delivery, etc.
- **Form Integration**: Built-in form handling for contract updates
- **Validation**: Input validation and error handling
- **Status Management**: Contract status tracking and updates

### UpdatePrompt Component

**Location**: `components/customComponents/UpdatePrompt.jsx`

Handles over-the-air update notifications and prompts.

#### Features
- **Automatic Update Checking**: Monitors for available updates
- **User Prompts**: Friendly update notifications
- **Background Updates**: Downloads updates in background
- **Fallback Handling**: Graceful handling of update failures

### LoginModalContent

**Location**: `components/customComponents/LoginModalContent.jsx`

Provides the authentication interface within a modal context.

#### Features
- **Multiple Auth Methods**: Email/password and OTP login
- **Form Validation**: Real-time validation feedback
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during authentication

## Screen Components

### Shared Screens

#### Home Screen

**Location**: `components/screens/shared/Home.jsx`

The main dashboard screen with role-based content and features.

#### Features
- **Role-based Content**: Different layouts for Admin, Airline, Delivery
- **Quick Actions**: Role-specific action buttons
- **Announcements**: System-wide and role-specific announcements
- **Image Carousel**: Auto-rotating images based on user role
- **Performance Optimized**: Memoized components and efficient updates

#### Implementation Pattern

```jsx
const RoleBasedHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { isVerified } = useVerificationStatus()
  const [roleId, setRoleId] = useState(null)

  const roleConfig = useMemo(() => {
    if (roleId === 1) { // Admin
      return {
        title: 'Admin Dashboard',
        buttons: [
          { label: 'User Management', icon: 'account-group', screen: 'UserManagement' },
          { label: 'System Analytics', icon: 'chart-line', screen: 'Analytics' }
        ]
      }
    }
    // Other role configurations...
  }, [roleId])

  return (
    <ScrollView>
      <Header navigation={navigation} title={roleConfig.title} />
      {/* Role-specific content */}
    </ScrollView>
  )
}
```

#### LoginScreen

**Location**: `components/screens/shared/LoginScreen.jsx`

The authentication screen with comprehensive login options.

#### Features
- **Multiple Authentication Methods**: Email/password, OTP
- **Form Validation**: Real-time input validation
- **Error Handling**: User-friendly error messages
- **Session Management**: Automatic session restoration
- **Password Recovery**: Integrated password reset flow

#### TrackLuggage

**Location**: `components/screens/shared/TrackLuggage.jsx`

Real-time luggage tracking with interactive maps.

#### Features
- **Real-time Tracking**: Live location updates
- **Interactive Maps**: Google Maps integration with route display
- **Progress Indicators**: Visual contract status progression
- **Permission Handling**: Location permission management
- **Offline Support**: Cached data for offline viewing

#### Implementation Highlights

```jsx
const TrackLuggage = ({ navigation }) => {
  const [contractData, setContractData] = useState(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  
  useRequestPermissions({ 
    locationForeground: true,
    onPermissionDenied: (type) => {
      showSnackbar('Location access required for tracking')
    }
  })

  // Real-time tracking logic
  const fetchContractData = async (trackingNum) => {
    const { data } = await supabase
      .from('contracts')
      .select(`
        *,
        pickup_location,
        delivery_location,
        delivery_partner:assigned_partner_id (*)
      `)
      .eq('tracking_number', trackingNum)
      .single()
    
    setContractData(data)
  }

  return (
    <ScrollView>
      <Header navigation={navigation} title="Track Luggage" />
      <TextInput 
        label="Tracking Number"
        value={trackingNumber}
        onChangeText={setTrackingNumber}
      />
      {contractData && (
        <MapView>
          <Marker coordinate={pickupLocation} />
          <Marker coordinate={deliveryLocation} />
          <MapViewDirections 
            origin={pickupLocation}
            destination={deliveryLocation}
            apikey={GOOGLE_MAPS_API_KEY}
          />
        </MapView>
      )}
    </ScrollView>
  )
}
```

### Admin Screens

#### UserManagement

**Location**: `components/screens/admin/UserManagement.jsx`

Comprehensive user management interface for administrators.

#### Features
- **User CRUD Operations**: Create, read, update, delete users
- **Role Management**: Assign and modify user roles
- **Verification Control**: Approve/reject user verifications
- **Search and Filtering**: Advanced user search capabilities
- **Bulk Operations**: Batch user management actions

#### TransactionManagement

**Location**: `components/screens/admin/TransactionManagement.jsx`

Transaction oversight and management system.

#### Features
- **Segmented Interface**: Multiple transaction views (To Pay, Invoices, Rates)
- **Financial Tracking**: Revenue and payment monitoring
- **Invoice Generation**: Automated invoice creation
- **Rate Management**: Delivery rate configuration

### Delivery Screens

#### DeliveryBookingManagement

**Location**: `components/screens/delivery/DeliveryBookingManagement.jsx`

Contract management interface for delivery partners.

#### Features
- **Contract Views**: Available, in-progress, completed contracts
- **Map Integration**: Location-based contract filtering
- **Status Updates**: Real-time contract status management
- **Performance Metrics**: Delivery performance tracking

### Profile Screens

#### Profile

**Location**: `components/screens/profiles/Profile.jsx`

User profile display and management.

#### Features
- **Profile Display**: Comprehensive user information
- **Edit Capabilities**: Profile modification interface
- **Verification Status**: Account verification display
- **Security Settings**: Password change functionality

#### ProfileVerification

**Location**: `components/screens/profiles/subscreen/ProfileVerification.jsx`

Document upload and verification submission.

#### Features
- **Document Upload**: Government ID and vehicle document uploads
- **Image Validation**: File type and size validation
- **Verification Submission**: Complete verification package submission
- **Status Tracking**: Verification progress monitoring

## Custom Hooks

### useAuth

**Location**: `components/hooks/useAuth.jsx`

Comprehensive authentication state management.

#### Features
- **Session Management**: Login, logout, session persistence
- **Multi-auth Support**: Email/password and OTP authentication
- **Error Handling**: Comprehensive error management
- **Navigation Integration**: Automatic navigation based on auth state

#### Usage

```jsx
const {
  login,
  loginWithOtp,
  logout,
  checkSession,
  loading,
  SnackbarElement
} = useAuth(navigation, onClose)

// Login with email/password
await login(email, password)

// Login with OTP
await loginWithOtp(email)

// Check existing session
const hasValidSession = await checkSession()
```

### useVerificationStatus

**Location**: `components/hooks/useVerificationStatus.jsx`

Manages user verification status throughout the app.

#### Features
- **Status Monitoring**: Real-time verification status checking
- **Automatic Updates**: Updates when verification changes
- **Conditional Rendering**: Helper for verification-based UI

#### Usage

```jsx
const { isVerified, verificationStatus, loading } = useVerificationStatus()

// Conditional rendering based on verification
{isVerified ? (
  <VerifiedContent />
) : (
  <VerificationPrompt />
)}
```

### useSnackbar

**Location**: `components/hooks/useSnackbar.jsx`

Centralized snackbar notification system.

#### Features
- **Success/Error Messages**: Different styling for message types
- **Automatic Dismissal**: Configurable timeout duration
- **Portal Integration**: Renders above all other content
- **Theme Integration**: Adapts to current theme

#### Usage

```jsx
const { showSnackbar, SnackbarElement } = useSnackbar()

// Show success message
showSnackbar('Operation completed successfully!', true)

// Show error message
showSnackbar('An error occurred')

// Include in component render
return (
  <View>
    {/* Component content */}
    {SnackbarElement}
  </View>
)
```

### useLocation

**Location**: `components/hooks/useLocation.jsx`

Location services and background tracking management.

#### Features
- **Permission Management**: Location permission handling
- **Background Tracking**: Continuous location updates
- **Battery Optimization**: Efficient location sampling
- **Error Handling**: Location service error management

### usePermissions

**Location**: `components/hooks/usePermissions.jsx`

Comprehensive app permission management.

#### Features
- **Multiple Permission Types**: Location, notifications, camera
- **Permission Requests**: Automatic permission request flow
- **Fallback Handling**: Graceful degradation when permissions denied
- **User Guidance**: Educational permission explanations

#### Usage

```jsx
useRequestPermissions({ 
  locationForeground: true,
  locationBackground: true,
  notifications: true,
  onPermissionDenied: (type, canAskAgain) => {
    console.log(`${type} permission denied`)
  }
})
```

### useLogout

**Location**: `components/hooks/useLogout.jsx`

Logout functionality with confirmation dialogs.

#### Features
- **Confirmation Dialog**: User confirmation before logout
- **Session Cleanup**: Complete session and data cleanup
- **Navigation Reset**: Reset navigation stack to login
- **Loading States**: Visual feedback during logout process

## Theme System

### Theme Architecture

The app implements a comprehensive theming system supporting light and dark modes.

#### Theme Components

1. **ThemeContext**: React context for theme state management
2. **lightTheme**: Light mode color and font configuration
3. **darkTheme**: Dark mode color and font configuration
4. **colorConfig**: Centralized color definitions
5. **fontConfig**: Typography configuration

### ThemeContext

**Location**: `components/themes/themeContext.jsx`

```jsx
export const ThemeContext = createContext({
  toggleTheme: () => {},
  theme: {},
  setTheme: () => {}
})
```

### Theme Implementation

#### Light Theme

**Location**: `components/themes/lightTheme.jsx`

```jsx
const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colorConfigLight,
  },
  fonts: {
    ...DefaultTheme.fonts,
    ...fontConfig,
  },
}
```

#### Dark Theme

**Location**: `components/themes/darkTheme.jsx`

Similar structure to light theme but with dark color palette.

### Color Configuration

**Location**: `components/themes/colorConfig.jsx`

Centralized color definitions for consistent theming.

```jsx
export const colorConfigLight = {
  primary: '#0C5B47',
  secondary: '#F3F8F2',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  // ... other colors
}

export const colorConfigDark = {
  primary: '#4CAF50',
  secondary: '#2E3B2E',
  background: '#121712',
  surface: '#1E1E1E',
  // ... other colors
}
```

### Font Configuration

**Location**: `components/themes/fontConfig.jsx`

Typography settings for consistent text styling.

```jsx
const fontConfig = {
  displayLarge: {
    fontFamily: 'Onest-Bold',
    fontSize: 57,
    lineHeight: 64,
  },
  headlineLarge: {
    fontFamily: 'Onest-Bold',
    fontSize: 32,
    lineHeight: 40,
  },
  // ... other font sizes
}
```

### Theme Usage in Components

```jsx
const Component = () => {
  const { colors, fonts } = useTheme()
  const { toggleTheme } = useContext(ThemeContext)

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={[fonts.headlineMedium, { color: colors.onBackground }]}>
        Themed Text
      </Text>
      <Button onPress={toggleTheme}>
        Toggle Theme
      </Button>
    </View>
  )
}
```

## Utility Components

### Error Boundaries

Implementation of error boundaries for graceful error handling.

### Loading Components

Standardized loading indicators and skeleton screens.

### Form Components

Reusable form components with validation and theming.

## Component Guidelines

### Development Standards

#### Component Structure

```jsx
import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'

const ComponentName = ({ navigation, route, ...props }) => {
  const { colors, fonts } = useTheme()
  const [state, setState] = useState(initialState)

  useEffect(() => {
    // Initialization logic
  }, [])

  const handleAction = () => {
    // Action handling
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, fonts.bodyLarge, { color: colors.onBackground }]}>
        Component Content
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  text: {
    marginBottom: 8,
  },
})

export default ComponentName
```

### Best Practices

#### Performance Optimization
- Use `React.memo` for expensive components
- Implement `useMemo` and `useCallback` for heavy calculations
- Optimize FlatList rendering with proper keyExtractor

#### Code Organization
- Keep components focused and single-purpose
- Extract complex logic into custom hooks
- Use TypeScript for better type safety
- Implement proper error boundaries

#### Theme Integration
- Always use theme colors and fonts
- Support both light and dark modes
- Maintain consistent spacing and sizing
- Use theme-aware status bars

#### State Management
- Use local state for component-specific data
- Leverage Context for global state
- Implement proper loading and error states
- Clean up subscriptions and timers

#### Navigation
- Use proper navigation patterns
- Handle deep linking appropriately
- Implement proper back button handling
- Support gesture navigation

### Testing Guidelines

#### Unit Testing
- Test component rendering
- Test user interactions
- Mock external dependencies
- Test error conditions

#### Integration Testing
- Test navigation flows
- Test API integrations
- Test theme switching
- Test permission handling

### Accessibility

#### Accessibility Features
- Implement proper accessibility labels
- Support screen readers
- Ensure sufficient color contrast
- Support dynamic text sizing

This component documentation provides a comprehensive overview of the EasyTrack app's component architecture and implementation patterns. It serves as a reference for developers working on the project and ensures consistent development practices across the codebase.