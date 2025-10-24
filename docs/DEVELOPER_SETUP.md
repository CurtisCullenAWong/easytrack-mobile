# Developer Setup Guide

## Overview

This guide provides step-by-step instructions for setting up a complete development environment for EasyTrack. It covers everything from initial system setup to running the app in development mode.

## Table of Contents

- [System Requirements](#system-requirements)
- [Development Tools Installation](#development-tools-installation)
- [Project Setup](#project-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Debugging](#debugging)
- [Testing](#testing)
- [Common Issues](#common-issues)

## System Requirements

### Operating System Support
- **Windows 10/11** (Primary development OS)
- **macOS 10.15+** (For iOS development)
- **Ubuntu 18.04+** (Alternative Linux support)

### Hardware Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB free space minimum
- **CPU**: Multi-core processor recommended
- **Network**: Stable internet connection for cloud services

## Development Tools Installation

### 1. Node.js and Package Manager

```bash
# Install Node.js (LTS version recommended)
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Optional: Install Yarn (alternative package manager)
npm install -g yarn
yarn --version
```

### 2. Git Version Control

```bash
# Windows: Download from https://git-scm.com/
# macOS: Install via Homebrew
brew install git

# Ubuntu/Linux
sudo apt update
sudo apt install git

# Verify installation
git --version

# Configure Git (first time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Expo CLI and EAS CLI

```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Install EAS CLI for builds and deployments
npm install -g eas-cli

# Verify installations
expo --version
eas --version

# Login to Expo (create account at expo.dev if needed)
expo login
```

### 4. Android Development Environment

#### Android Studio Installation

1. **Download Android Studio**
   - Visit: https://developer.android.com/studio
   - Download and install for your operating system

2. **SDK Configuration**
   ```bash
   # Set environment variables (Windows)
   set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   set PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools

   # Set environment variables (macOS/Linux)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

3. **Install Required SDK Components**
   - Open Android Studio
   - Go to SDK Manager
   - Install:
     - Android SDK Platform 31 (API Level 31)
     - Android SDK Build-Tools 31.0.0
     - Google Play Services
     - Android Emulator

#### Android Emulator Setup

1. **Create Virtual Device**
   - Open Android Studio
   - Tools → AVD Manager
   - Create Virtual Device
   - Choose device (Pixel 5 recommended)
   - Select system image (API Level 31)
   - Configure advanced settings if needed

2. **Physical Device Setup**
   ```bash
   # Enable USB debugging on Android device
   # Settings → Developer Options → USB Debugging

   # Verify device connection
   adb devices
   ```

### 5. iOS Development Environment (macOS only)

```bash
# Install Xcode from Mac App Store
# Install Xcode command line tools
xcode-select --install

# Install CocoaPods for iOS dependencies
sudo gem install cocoapods

# Install iOS Simulator
# Xcode → Preferences → Components → iOS Simulator
```

### 6. Code Editor Setup

#### Visual Studio Code (Recommended)

```bash
# Download from: https://code.visualstudio.com/

# Recommended Extensions:
# - ES7+ React/Redux/React-Native snippets
# - Expo Tools
# - GitLens
# - Prettier - Code formatter
# - ESLint
# - Auto Rename Tag
# - Bracket Pair Colorizer
# - Material Icon Theme
```

#### VS Code Configuration

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/CurtisCullenAWong/EasyTrack_React-native.git

# Navigate to project directory
cd easytrack-mobile

# Check repository status
git status
git branch -a
```

### 2. Install Dependencies

```bash
# Install project dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# Verify installation
npm list --depth=0
```

### 3. Dependency Management

#### Key Dependencies Overview

```json
{
  "dependencies": {
    "expo": "54.0.12",
    "react": "19.1.0",
    "react-native": "0.81.4",
    "@supabase/supabase-js": "^2.49.5-next.1",
    "react-navigation": "^7.x",
    "react-native-paper": "^5.13.3",
    "expo-location": "~19.0.7",
    "expo-notifications": "~0.32.12"
  }
}
```

#### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Clean install (if issues occur)
rm -rf node_modules
rm package-lock.json
npm install
```

## Environment Configuration

### 1. Environment Variables Setup

```bash
# Create environment files
touch .env.development
touch .env.preview  
touch .env.production

# Never commit .env files to version control
echo ".env*" >> .gitignore
```

### 2. Development Environment File

Create `.env.development`:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_development_anon_key

# Google Maps API
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_development_maps_key

# Firebase Configuration (optional)
EXPO_PUBLIC_FIREBASE_API_KEY=your_dev_firebase_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_dev_project_id

# Debug flags
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_LOG_LEVEL=debug
```

### 3. Configuration Validation

```bash
# Validate environment setup
expo doctor

# Check configuration
npx expo config --type public
```

## Database Setup

### 1. Supabase Project Setup

1. **Create Supabase Account**
   - Visit: https://supabase.com
   - Sign up for free account
   - Create new project

2. **Database Configuration**
   ```sql
   -- Example table creation (run in Supabase SQL editor)
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
     email VARCHAR NOT NULL,
     first_name VARCHAR,
     last_name VARCHAR,
     role_id INTEGER,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);
   ```

3. **API Keys Configuration**
   - Copy project URL and anon key
   - Add to environment files
   - Configure authentication settings

### 2. Local Database (Optional)

```bash
# Install Supabase CLI for local development
npm install -g supabase

# Initialize local Supabase
supabase init

# Start local development
supabase start

# Link to remote project
supabase link --project-ref your-project-ref
```

## Running the Application

### 1. Start Development Server

```bash
# Start Expo development server
npm start
# or
expo start

# Start with specific options
expo start --clear           # Clear cache
expo start --offline         # Offline mode
expo start --lan            # LAN connection
```

### 2. Running on Devices

#### Android

```bash
# Run on Android emulator
npm run android
# or
expo start --android

# Run on physical device
# 1. Install Expo Go app on Android device
# 2. Scan QR code from development server
# 3. Or use direct connection: expo start --tunnel
```

#### iOS (macOS only)

```bash
# Run on iOS simulator
npm run ios
# or
expo start --ios

# Run on physical device
# 1. Install Expo Go app on iOS device
# 2. Scan QR code from development server
# 3. Ensure both devices are on same network
```

#### Web Browser

```bash
# Run in web browser
npm run web
# or
expo start --web
```

### 3. Development Build

For features requiring custom native code:

```bash
# Create development build
eas build --profile development --platform android

# Install development build on device
# Download APK and install manually

# Start development server for dev build
expo start --dev-client
```

## Development Workflow

### 1. Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### 2. Code Style and Linting

```bash
# Install ESLint and Prettier
npm install --save-dev eslint prettier eslint-config-prettier

# Create .eslintrc.js
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};

# Create .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}

# Run linting
npm run lint
npm run lint:fix
```

### 3. Component Development

#### Project Structure
```
components/
├── customComponents/      # Reusable UI components
├── hooks/                # Custom React hooks
├── navigator/            # Navigation configuration
├── screens/              # Screen components
├── themes/               # Theme configuration
└── utils/                # Utility functions
```

#### Component Template

```jsx
import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, useTheme } from 'react-native-paper'

const ComponentName = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const [state, setState] = useState(null)

  useEffect(() => {
    // Component initialization
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.onBackground }]}>
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
    fontSize: 16,
    marginBottom: 8,
  },
})

export default ComponentName
```

## Debugging

### 1. React Native Debugging Tools

#### Metro Bundler
```bash
# Clear Metro cache
npx react-native start --reset-cache
# or
expo start --clear

# View Metro logs
# Check terminal output for bundling errors
```

#### React Developer Tools
```bash
# Install React DevTools
npm install -g react-devtools

# Start React DevTools
react-devtools

# Connect from app: Shake device → Debug → Debug with Chrome
```

#### Flipper (Advanced debugging)
```bash
# Install Flipper desktop app
# Download from: https://fbflipper.com/

# Features:
# - Network inspection
# - Layout inspector
# - Logs and crash reports
# - Performance monitoring
```

### 2. Device Debugging

#### Android Debugging
```bash
# View device logs
adb logcat

# Clear logs
adb logcat -c

# Filter React Native logs
adb logcat *:S ReactNative:V ReactNativeJS:V

# Monitor specific app
adb logcat | grep "com.thewalkingdevnumoa.EasyTrack"
```

#### iOS Debugging (macOS only)
```bash
# View iOS simulator logs
xcrun simctl spawn booted log stream --predicate 'eventMessage contains "React"'

# Xcode debugging
# Open Xcode → Window → Devices and Simulators → View Device Logs
```

### 3. Supabase Debugging

```javascript
// Enable Supabase debugging
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key, {
  auth: {
    debug: __DEV__, // Enable debug in development
  },
})

// Monitor network requests
console.log('Supabase request:', { url, method, data })
```

### 4. Common Debugging Scenarios

#### Network Issues
```javascript
// Check network connectivity
import NetInfo from '@react-native-community/netinfo'

NetInfo.fetch().then(state => {
  console.log('Connection type', state.type)
  console.log('Is connected?', state.isConnected)
})
```

#### Performance Issues
```javascript
// Performance monitoring
console.time('operation-name')
// ... your code
console.timeEnd('operation-name')

// Memory usage (development only)
if (__DEV__) {
  console.log('Memory usage:', performance.memory)
}
```

## Testing

### 1. Testing Framework Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Install additional testing utilities
npm install --save-dev react-test-renderer detox
```

### 2. Unit Testing

Create `__tests__` directories and test files:

```javascript
// components/__tests__/Header.test.js
import React from 'react'
import { render } from '@testing-library/react-native'
import Header from '../customComponents/Header'

describe('Header Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Header title="Test Title" navigation={{}} />
    )
    
    expect(getByText('Test Title')).toBeTruthy()
  })
})
```

### 3. Integration Testing

```javascript
// __tests__/integration/auth.test.js
import { supabase } from '../../lib/supabase'

describe('Authentication Integration', () => {
  it('should handle login flow', async () => {
    const email = 'test@example.com'
    const password = 'testpassword'
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
  })
})
```

### 4. E2E Testing with Detox

```bash
# Install Detox
npm install --save-dev detox

# Initialize Detox configuration
npx detox init

# Run E2E tests
npx detox test
```

## Common Issues

### 1. Installation Issues

#### Node Modules Issues
```bash
# Problem: Module resolution errors
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install

# Problem: Permission errors (macOS/Linux)
# Solution: Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Metro Bundler Issues
```bash
# Problem: Metro bundler won't start
# Solution: Reset Metro cache
npx react-native start --reset-cache
expo start --clear

# Problem: Port already in use
# Solution: Kill existing process
npx kill-port 19000
npx kill-port 19001
```

### 2. Device Connection Issues

#### Android Issues
```bash
# Problem: Device not detected
# Solution: Check ADB connection
adb devices
adb kill-server
adb start-server

# Problem: USB debugging not working
# Solution: 
# 1. Enable Developer Options
# 2. Enable USB Debugging
# 3. Trust computer when prompted
```

#### iOS Issues
```bash
# Problem: iOS Simulator not opening
# Solution: Reset simulator
xcrun simctl erase all

# Problem: Certificates issues
# Solution: Refresh certificates in Xcode
```

### 3. Environment Issues

#### Supabase Connection Issues
```javascript
// Problem: API calls failing
// Solution: Verify environment variables
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)

// Check network connectivity
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count')
    console.log('Connection test:', { data, error })
  } catch (e) {
    console.error('Connection failed:', e)
  }
}
```

#### Google Maps Issues
```bash
# Problem: Maps not loading
# Solution: Verify API key and enable required APIs
# 1. Check Google Cloud Console
# 2. Enable Maps SDK for Android
# 3. Verify API key restrictions
```

### 4. Build Issues

```bash
# Problem: Gradle build fails
# Solution: Clean Android build
cd android
./gradlew clean
cd ..

# Problem: iOS build fails
# Solution: Clean iOS build
cd ios
xcodebuild clean
rm -rf build/
cd ..
```

### 5. Performance Issues

```javascript
// Problem: App running slowly
// Solutions:
// 1. Enable Hermes (if not already enabled)
// 2. Optimize images and assets
// 3. Use FlatList for large lists
// 4. Implement proper state management

// Problem: Memory leaks
// Solutions:
// 1. Clean up subscriptions in useEffect
// 2. Remove event listeners
// 3. Cancel API requests on unmount
```

## Getting Help

### Documentation Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)

### Community Support
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

### Project-Specific Support
- **Repository Issues**: Create issue on GitHub repository
- **Team Communication**: Use designated team communication channels
- **Code Reviews**: Submit pull requests for code review

## Best Practices

### 1. Development Practices
- Use TypeScript for better type safety
- Follow consistent naming conventions
- Write comprehensive comments
- Keep components small and focused
- Use proper state management

### 2. Performance Practices
- Optimize images and assets
- Use lazy loading for screens
- Implement proper caching strategies
- Monitor app performance metrics

### 3. Security Practices
- Never commit sensitive data
- Use environment variables for API keys
- Implement proper authentication checks
- Follow secure coding practices

### 4. Maintenance Practices
- Keep dependencies updated
- Regular testing and QA
- Monitor app performance
- Document changes and decisions

This developer setup guide provides everything needed to get started with EasyTrack development. Follow the steps carefully and refer to the troubleshooting section if you encounter any issues.