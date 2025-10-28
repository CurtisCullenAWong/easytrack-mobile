# EasyTrack Mobile App

<div align="center">
  <img src="./assets/images/icon.png" alt="EasyTrack Logo" width="120" height="120">
  
  **A comprehensive luggage delivery and tracking platform for airlines and delivery partners**
  
  [![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-54.0.12-black.svg)](https://expo.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-2.49.5-green.svg)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-Private-red.svg)]()
</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

## Overview

EasyTrack is a comprehensive mobile application designed to streamline luggage delivery services between airlines and delivery partners. The platform provides real-time tracking, contract management, and performance analytics for three distinct user roles: Administrators, Airline Personnel, and Delivery Partners.

### Key Capabilities
- **Real-time Location Tracking**: Background location services for accurate delivery tracking
- **Multi-role Dashboard**: Customized interfaces for Admin, Airline, and Delivery users
- **Contract Management**: Complete booking lifecycle from creation to completion
- **Performance Analytics**: Detailed statistics and reporting for all stakeholders
- **Secure Authentication**: Role-based access control with Supabase authentication
- **Messaging System**: In-app communication between users
- **Document Management**: PDF generation and digital signatures
- **Push Notifications**: Real-time updates for important events

## Features

### Authentication & Security
- Secure user authentication with Supabase
- Role-based access control (Admin, Airline, Delivery)
- Profile verification system
- Password recovery and management
- Session persistence across app restarts

### Location Services
- Real-time GPS tracking for delivery personnel
- Background location updates
- Route optimization and mapping
- Geofencing capabilities
- Location-based notifications

### Dashboard & Analytics
- Role-specific home screens with relevant information
- Performance statistics and KPIs
- Transaction management and reporting
- Audit logs for system monitoring
- Data visualization and charts

### Contract Management
- Create and manage delivery contracts
- Digital signature collection
- Document attachment and viewing
- Status tracking throughout delivery lifecycle
- Pricing calculation and invoicing

### Communication
- In-app messaging system
- User profile viewing
- Notification management
- Real-time chat functionality

### Booking & History
- Comprehensive booking management
- Historical transaction viewing
- Search and filter capabilities
- Export functionality for records

## User Roles

### Administrator
- **User Management**: Create, edit, and manage user accounts
- **System Monitoring**: Access to audit logs and system analytics
- **Transaction Oversight**: Review and manage all transactions
- **Performance Tracking**: Monitor platform-wide performance metrics
- **Account Verification**: Approve user verifications and role assignments

### Airline Personnel
- **Booking Creation**: Create delivery requests for luggage
- **Luggage Tracking**: Monitor delivery status in real-time
- **History Management**: View past bookings and transactions
- **Performance Metrics**: Access to delivery performance data
- **Communication**: Direct messaging with delivery partners

### Delivery Partners
- **Contract Management**: Accept and manage delivery contracts
- **Real-time Tracking**: Provide location updates during delivery
- **Route Management**: Optimize delivery routes
- **Performance Analytics**: View personal delivery metrics
- **Digital Confirmation**: Collect digital signatures for deliveries

## Tech Stack

### Frontend
- **React Native** (0.81.4) - Cross-platform mobile development
- **Expo** (54.0.12) - Development platform and deployment
- **React Navigation** (7.x) - Navigation and routing
- **React Native Paper** (5.13.3) - Material Design components
- **React Native Maps** - Interactive mapping and geolocation

### Backend & Services
- **Supabase** (2.49.5) - Backend-as-a-Service (Database, Auth, Real-time)
- **PostgreSQL** - Primary database (via Supabase)
- **Google Maps API** - Mapping and geocoding services
- **Firebase** - Push notifications and cloud messaging

### Development Tools
- **TypeScript** (5.9.2) - Type safety and better development experience
- **EAS (Expo Application Services)** - Build and deployment pipeline
- **Expo Dev Client** - Custom development builds
- **React Native Reanimated** - Smooth animations and interactions

### Key Libraries
- **@google/genai** - AI integration for enhanced features
- **react-native-signature-canvas** - Digital signature collection
- **pdf-lib** - PDF generation and manipulation
- **expo-location** - Location services and background tracking
- **expo-notifications** - Push notification handling

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (18.x or higher)
- **npm** or **yarn** package manager
- **Expo CLI** (`npm install -g @expo/cli`)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Git** for version control

### Mobile Development Environment
- **Android SDK** (API level 31 or higher)
- **Java Development Kit** (JDK 11 or higher)
- Physical device or emulator for testing

### Accounts & API Keys
- **Expo Account** (for EAS builds and updates)
- **Supabase Project** (for backend services)
- **Google Cloud Platform** (for Maps API)
- **Firebase Project** (for push notifications)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CurtisCullenAWong/EasyTrack_React-native.git
   cd easytrack-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Expo CLI globally** (if not already installed)
   ```bash
   npm install -g @expo/cli
   ```

4. **Set up development build**
   ```bash
   npx expo install --fix
   ```

## Environment Setup

1. **Create environment file**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables**
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Google Maps API
   EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   ```

3. **Configure Google Services**
   - Place `google-services.json` in the project root
   - Ensure Firebase project is properly configured

4. **Set up EAS configuration**
   ```bash
   eas init
   eas update:configure
   eas build:configure
   ```

## Running the App

### Development Mode
```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

### Development Build
```bash
# Create development build
eas build --profile development --platform android

# Install and run development build
# Download and install the generated APK on your device
```

### Production Deployment
```bash
# Deploy to production channel
npm run deploy:prod

# Deploy admin production version
npm run deploy:admin_prod
```

## Project Structure

```
easytrack-mobile/
├── assets/                     # Static assets (images, fonts, icons)
│   ├── admin_home/            # Admin-specific images
│   ├── airline_home/          # Airline-specific images
│   ├── delivery_home/         # Delivery-specific images
│   ├── fonts/                 # Custom fonts
│   ├── images/                # App icons and general images
│   └── locations-json/        # Location data files
├── components/                 # React components
│   ├── customComponents/      # Reusable custom components
│   ├── hooks/                 # Custom React hooks
│   ├── navigator/             # Navigation configuration
│   ├── screens/               # Screen components
│   │   ├── admin/            # Administrator screens
│   │   ├── airline/          # Airline personnel screens
│   │   ├── delivery/         # Delivery partner screens
│   │   ├── messaging/        # Chat and messaging screens
│   │   ├── profiles/         # User profile screens
│   │   └── shared/           # Shared screens across roles
│   └── themes/               # Theme configuration
├── context/                   # React Context providers
├── docs/                      # Documentation files
├── lib/                      # External library configurations
├── utils/                    # Utility functions and helpers
├── app.config.js             # Expo app configuration
├── eas.json                  # EAS build configuration
└── package.json              # Dependencies and scripts
```

## Key Components

### Navigation Architecture
- **StackNavigator**: Main navigation container
- **Role-based Drawers**: Separate navigation for each user role
- **Nested Navigation**: Stack and drawer navigation combination

### Custom Components
- **Header**: Consistent app header with navigation
- **BottomModal**: Reusable modal component
- **UpdatePrompt**: Handles app updates notifications
- **LoginModalContent**: Authentication interface

### Custom Hooks
- **useAuth**: Authentication state management
- **useLocation**: Location services and tracking
- **usePermissions**: Handle app permissions
- **useVerificationStatus**: User verification state

### Themes
- **Light/Dark Mode**: Complete theme switching capability
- **Color Configuration**: Consistent color palette
- **Font Management**: Custom font integration

## 🔌 API Integration

### Supabase Integration
- **Authentication**: User login, signup, and session management
- **Database**: PostgreSQL database for all app data
- **Real-time**: Live updates for chat and tracking
- **Storage**: File uploads and document management

### External APIs
- **Google Maps**: Location services and mapping
- **Google Generative AI**: Enhanced feature capabilities
- **Firebase**: Push notifications and cloud messaging

### Data Models
- **Users & Profiles**: User authentication and profile data
- **Contracts**: Delivery contract management
- **Transactions**: Financial transaction tracking
- **Messages**: In-app communication system

## 🚀 Deployment

### EAS Build Profiles

#### Development
- **Profile**: `development`
- **Channel**: `development`
- **Purpose**: Development and testing

#### Preview
- **Profile**: `preview`
- **Channel**: `preview`
- **Purpose**: Internal testing and staging

#### Production
- **Profile**: `production`
- **Channel**: `production`
- **Purpose**: Live production app

#### Admin Production
- **Profile**: `admin_production`
- **Channel**: `admin_production`
- **Purpose**: Admin-only production version

### Deployment Commands
```bash
# Build for different environments
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile admin_production --platform android

# Publish updates
eas update --channel production --platform android --message "Production update"
eas update --channel admin_production --platform android --message "Admin update"
```

## Documentation

- [API Documentation](./docs/API.md) - Detailed API integration guide
- [Developer Setup](./docs/DEVELOPER_SETUP.md) - Complete development environment setup
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Component Documentation](./docs/COMPONENTS.md) - Component architecture and usage
- [User Guide](./docs/USER_GUIDE.md) - End-user documentation

## Contributing

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow React Native best practices
- Use TypeScript for type safety
- Maintain consistent code formatting
- Write comprehensive tests
- Update documentation for new features

## Support

### Feedback and Suggestions
We value your feedback! Please use our feedback form to share your thoughts and suggestions:
[EasyTrack Mobile App Feedback Form](https://forms.gle/R6YkHvb9MBURDyyk8)

### Issues and Bug Reports
- Create an issue in this repository
- Provide detailed reproduction steps
- Include device and app version information

### Contact Information
- **Project Maintainer**: Curtis Cullen A. Wong
- **Repository**: [EasyTrack_React-native](https://github.com/CurtisCullenAWong/EasyTrack_React-native)

## 📄 License

This project is private and proprietary. All rights reserved.

---

<div align="center">
  <p>Built using React Native and Expo</p>
  <p>© 2025 EasyTrack. All rights reserved.</p>
</div>
