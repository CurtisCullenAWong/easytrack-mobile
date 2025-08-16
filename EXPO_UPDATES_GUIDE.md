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
eas update --branch development --message "Development update"
```

### Preview Channel
```bash
eas update --branch preview --message "Preview update"
```

### Production Channel
```bash
eas update --branch production --message "Production update"
```

## Update Components

### useAppUpdate Hook
Located in `components/hooks/useAppUpdate.jsx`

**Features:**
- Automatic update checking
- User prompts for update installation
- Progress indicators
- Error handling

**Usage:**
```javascript
const { 
  isUpdating, 
  updateStatus, 
  handleAppUpdate, 
  checkForUpdates,
  getUpdateInfo,
  UpdateModal 
} = useAppUpdate()

// Check for updates
await handleAppUpdate(true) // true = show prompt

// Check without prompt
await handleAppUpdate(false)

// Get update info
const info = getUpdateInfo()
```

### Update Utilities
Located in `utils/updateUtils.jsx`

**Available Functions:**
- `isUpdateAvailable()`: Check if updates are available
- `installUpdateSilently()`: Install update without user prompt
- `showUpdatePrompt()`: Show update dialog to user
- `handleUpdateError()`: Handle update errors gracefully
- `getUpdateStatus()`: Get current update status
- `needsRestart()`: Check if app needs restart
- `restartApp()`: Force restart the app

## Error Handling

The update system includes comprehensive error handling for:
- Network errors
- Storage issues
- Timeout errors
- General update failures

## Best Practices

1. **Test Updates**: Always test updates in development/preview channels before production
2. **Version Management**: Use semantic versioning for your app
3. **Rollback Plan**: Keep previous versions available for rollback if needed
4. **User Communication**: Inform users about updates and their benefits
5. **Monitoring**: Monitor update success rates and user feedback

## Troubleshooting

### Common Issues

1. **Updates not working in development**
   - Updates are disabled in development mode (`__DEV__`)
   - This is normal behavior

2. **Update fails to install**
   - Check network connectivity
   - Ensure sufficient storage space
   - Verify update channel configuration

3. **App crashes after update**
   - Check for breaking changes in your code
   - Test updates thoroughly before publishing
   - Consider implementing a rollback mechanism

### Debug Information

To get debug information about updates:
```javascript
import * as Updates from 'expo-updates'

console.log('Update Status:', {
  isEnabled: Updates.isEnabled,
  updateId: Updates.updateId,
  channel: Updates.channel,
  runtimeVersion: Updates.runtimeVersion
})
```

## Security Considerations

1. **Code Signing**: Updates are automatically code-signed by Expo
2. **Channel Isolation**: Different channels are isolated from each other
3. **Version Control**: Updates respect runtime version constraints
4. **Rollback Protection**: Previous versions are preserved for rollback

## Support

For issues with Expo Updates:
1. Check the [Expo Updates documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
2. Review the [EAS Build documentation](https://docs.expo.dev/build/introduction/)
3. Contact Expo support if needed
