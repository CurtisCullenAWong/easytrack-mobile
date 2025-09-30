# Expo Updates Setup Guide for EasyTrack

This guide explains how to use and manage over-the-air (OTA) updates for the EasyTrack React Native app.

## Overview

The app is configured to use Expo Updates for seamless over-the-air updates without requiring users to download new versions from app stores.

## Configuration Files

### 1. app.json
- **updates.enabled**: Set to `true` to enable OTA updates
- **updates.url**: Points to your Expo project's update server
- **updates.fallbackToCacheTimeout**: Set to `0` for immediate fallback to cached version
- **runtimeVersion.policy**: Set to `"appVersion"` to use the app version for runtime versioning

### 2. eas.json
- **channels**: Configured for different environments (development, preview, production)
- **autoIncrement**: Enabled for production builds to automatically increment version numbers

## Update Channels

- **development**: For development builds
- **preview**: For internal testing builds
- **production**: For production builds

## How Updates Work

1. **Check for Updates**: The app automatically checks for updates on startup
2. **Download**: If an update is available, it's downloaded in the background
3. **Install**: User is prompted to install the update immediately or later
4. **Reload**: The app reloads with the new version

## Building and Publishing Updates

## For Configuring Builds

```bash
eas init (expo project)
eas update:configure
eas build:configure
eas credentials
npx expo-doctor
eas env:pull
cd "C:\Users\curtc\AppData\Local\Android\Sdk\platform-tools>"
adb logcat *:S ReactNative:V ReactNativeJS:V > eas-crash-log.txt
adb logcat -c
adb logcat *:S ReactNative:V ReactNativeJS:V
```

### For Development
```bash
# Build development client
eas build --profile development --platform android
eas build --profile development --platform ios
```

### For Preview/Testing
```bash
# Build preview version
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### For Production
```bash
# Build production version
eas build --profile production --platform android
eas build --profile production --platform ios
```

## Publishing Updates

### Development Channel
```bash
eas update --channel development --platform android --message "Development update"
```

### Preview Channel
```bash
eas update --channel preview --platform android --message "Preview update"
```

### Production Channel
```bash
eas update --channel production --platform android --message "Production update"
```

## Support

For issues with Expo Updates:
1. Check the [Expo Updates documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
2. Review the [EAS Build documentation](https://docs.expo.dev/build/introduction/)
3. Contact Expo support if needed
