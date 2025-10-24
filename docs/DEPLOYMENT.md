# Deployment Guide

## Overview

This guide covers the complete deployment process for EasyTrack using Expo Application Services (EAS). The app supports multiple deployment channels for different environments and user types.

## Table of Contents

- [Prerequisites](#prerequisites)
- [EAS Configuration](#eas-configuration)
- [Environment Management](#environment-management)
- [Build Profiles](#build-profiles)
- [Deployment Channels](#deployment-channels)
- [Build Process](#build-process)
- [Over-the-Air Updates](#over-the-air-updates)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- **Expo Account**: Sign up at [expo.dev](https://expo.dev)
- **Google Developer Account**: For Google Play Store deployment
- **Apple Developer Account**: For iOS App Store deployment (if targeting iOS)

### Development Environment
```bash
# Install required global tools
npm install -g @expo/cli
npm install -g eas-cli

# Verify installations
expo --version
eas --version
```

### Project Setup
```bash
# Login to Expo
expo login

# Initialize EAS in project
eas init

# Configure updates
eas update:configure

# Configure builds
eas build:configure
```

## EAS Configuration

### eas.json Configuration

The project uses a comprehensive EAS configuration supporting multiple environments:

```json
{
  "cli": {
    "version": ">= 16.7.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal", 
      "channel": "preview",
      "environment": "preview"
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "apk"
      },
      "channel": "production",
      "environment": "production"
    },
    "admin_production": {
      "autoIncrement": true,
      "android": {
        "buildType": "apk"
      },
      "channel": "admin_production",
      "environment": "preview"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### app.config.js Configuration

```javascript
export default ({ config }) => ({
  ...config,
  expo: {
    name: "EasyTrack",
    slug: "easytrack",
    version: "1.0.0",
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 2000,
      url: "https://u.expo.dev/195561a3-4309-43ae-8922-e227b9ea3bc0",
    },
    // ... other configuration
  },
})
```

## Environment Management

### Environment Variables Setup

Create environment-specific `.env` files:

#### .env.development
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_dev_maps_key
```

#### .env.preview
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_staging_maps_key
```

#### .env.production
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_prod_maps_key
```

### Loading Environment Variables

Before each build or update, load the appropriate environment:

```bash
# Load development environment
eas env:pull --environment development

# Load preview environment  
eas env:pull --environment preview

# Load production environment
eas env:pull --environment production
```

## Build Profiles

### Development Profile
- **Purpose**: Development and internal testing
- **Features**: 
  - Development client enabled
  - Hot reloading support
  - Debug capabilities
  - Internal distribution only

```bash
eas build --profile development --platform android
```

### Preview Profile
- **Purpose**: Staging and QA testing
- **Features**:
  - Production-like environment
  - Internal testing
  - Staging backend services

```bash
eas build --profile preview --platform android
```

### Production Profile
- **Purpose**: Live production application
- **Features**:
  - Automatic version incrementing
  - APK build type for Android
  - Production backend services
  - Optimized for release

```bash
eas build --profile production --platform android
```

### Admin Production Profile
- **Purpose**: Admin-only production version
- **Features**:
  - Separate distribution channel
  - Admin-specific features
  - Production backend with preview environment config

```bash
eas build --profile admin_production --platform android
```

## Deployment Channels

### Channel Strategy

The app uses multiple channels to support different deployment scenarios:

| Channel | Environment | Purpose | Target Users |
|---------|-------------|---------|--------------|
| `development` | Development | Dev testing | Developers |
| `preview` | Preview/Staging | QA testing | QA team, stakeholders |
| `production` | Production | Live app | End users |
| `admin_production` | Production | Admin app | Administrators only |

### Channel Configuration

Each channel receives specific updates and can be deployed independently:

```bash
# Development channel
eas update --channel development --platform android --message "Dev update"

# Preview channel
eas update --channel preview --platform android --message "Staging update"

# Production channel
eas update --channel production --platform android --message "Production update"

# Admin production channel
eas update --channel admin_production --platform android --message "Admin update"
```

## Build Process

### Complete Build Workflow

#### 1. Development Build
```bash
# Step 1: Pull development environment
eas env:pull --environment development
# Confirm: y

# Step 2: Build development client
eas build --profile development --platform android

# Step 3: Install on development devices
# Download and install the generated APK
```

#### 2. Preview Build
```bash
# Step 1: Pull preview environment
eas env:pull --environment preview
# Confirm: y

# Step 2: Build preview version
eas build --profile preview --platform android

# Step 3: Distribute to QA team
# Share APK link with testing team
```

#### 3. Production Build
```bash
# Step 1: Pull production environment
eas env:pull --environment production
# Confirm: y

# Step 2: Build production version
eas build --profile production --platform android

# Step 3: Deploy to users
# Distribute APK or upload to Play Store
```

#### 4. Admin Production Build
```bash
# Step 1: Pull preview environment (admin uses preview config)
eas env:pull --environment preview
# Confirm: y

# Step 2: Build admin production version
eas build --profile admin_production --platform android

# Step 3: Distribute to administrators
# Provide APK to admin users only
```

### Automated Scripts

The project includes npm scripts for common deployment tasks:

```json
{
  "scripts": {
    "deploy:prod": "eas env:pull --environment production --force && eas update --channel production --platform android --message \"Production update\"",
    "deploy:admin_prod": "eas env:pull --environment preview --force && eas update --channel admin_production --platform android --message \"Admin Production update\""
  }
}
```

Usage:
```bash
# Deploy production update
npm run deploy:prod

# Deploy admin production update
npm run deploy:admin_prod
```

## Over-the-Air Updates

### Update Configuration

OTA updates are configured in `app.config.js`:

```javascript
updates: {
  enabled: true,
  fallbackToCacheTimeout: 2000,
  url: "https://u.expo.dev/195561a3-4309-43ae-8922-e227b9ea3bc0",
}
```

### Publishing Updates

#### Development Updates
```bash
eas env:pull --environment development
eas update --channel development --platform android --message "Bug fixes and new features"
```

#### Preview Updates
```bash
eas env:pull --environment preview
eas update --channel preview --platform android --message "QA testing update"
```

#### Production Updates
```bash
eas env:pull --environment production
eas update --channel production --platform android --message "Performance improvements"
```

#### Admin Production Updates
```bash
eas env:pull --environment preview
eas update --channel admin_production --platform android --message "Admin feature updates"
```

### Update Best Practices

1. **Version Compatibility**: Ensure updates are compatible with existing app versions
2. **Testing**: Always test updates in preview before production
3. **Rollback Plan**: Keep track of update IDs for potential rollbacks
4. **Incremental Updates**: Make small, incremental changes rather than large updates
5. **User Communication**: Inform users about significant updates

### Update Monitoring

```bash
# View update history
eas update:list --branch production

# View specific update details
eas update:view [UPDATE_ID]

# Rollback to previous update
eas update:rollback --branch production
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured correctly
- [ ] All features tested in preview environment
- [ ] Performance testing completed
- [ ] Security review conducted
- [ ] Database migrations applied (if any)
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured

### Deployment Steps

#### 1. Final Testing
```bash
# Build and test preview version
eas env:pull --environment preview
eas build --profile preview --platform android

# Comprehensive testing
# - Functional testing
# - Performance testing  
# - Security testing
# - User acceptance testing
```

#### 2. Production Build
```bash
# Build production version
eas env:pull --environment production
eas build --profile production --platform android

# Wait for build completion
# Download and verify APK
```

#### 3. Deployment
```bash
# Option A: Direct APK distribution
# Share APK download link with users

# Option B: Google Play Store submission
eas submit --platform android --latest

# Option C: Over-the-air update (for existing users)
eas update --channel production --platform android --message "Major release v1.1.0"
```

#### 4. Admin Production Deployment
```bash
# Build admin-specific version
eas env:pull --environment preview
eas build --profile admin_production --platform android

# Distribute to administrators only
# Provide secure download link
```

### Post-deployment Activities

1. **Monitor Performance**: Watch for errors and performance issues
2. **User Feedback**: Collect and respond to user feedback
3. **Analytics**: Monitor usage patterns and feature adoption
4. **Support**: Be prepared to handle user questions and issues

## Troubleshooting

### Common Build Issues

#### Environment Variable Issues
```bash
# Problem: Missing environment variables
# Solution: Ensure environment is pulled before building
eas env:pull --environment production --force

# Problem: Wrong environment loaded
# Solution: Verify correct environment
eas env:list
```

#### Build Configuration Issues
```bash
# Problem: Build profile not found
# Solution: Check eas.json configuration
cat eas.json

# Problem: Android SDK issues
# Solution: Update Android build tools
eas build:configure
```

#### Update Issues
```bash
# Problem: Update not appearing
# Solution: Check runtime version compatibility
# Ensure app version matches update requirements

# Problem: Update fails to apply
# Solution: Check for JavaScript errors
# Review update logs in Expo dashboard
```

### Debug Commands

```bash
# Check project status
expo doctor

# View build logs
eas build:list
eas build:view [BUILD_ID]

# Check update status
eas update:list --branch production

# View project configuration
eas config

# Test local build
expo run:android
```

### Performance Optimization

#### Build Optimization
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

#### Update Optimization
- **Bundle Size**: Minimize update bundle size
- **Compression**: Enable asset compression
- **Caching**: Leverage browser caching for updates

### Security Considerations

1. **API Keys**: Never expose sensitive keys in client code
2. **Environment Separation**: Keep environments completely separate
3. **Access Control**: Limit who can trigger builds and updates
4. **Code Signing**: Ensure proper code signing for production builds
5. **SSL/TLS**: Use HTTPS for all external communications

### Monitoring and Logging

#### Build Monitoring
- Monitor build success/failure rates
- Track build times and performance
- Set up alerts for build failures

#### Update Monitoring
- Monitor update adoption rates
- Track update-related crashes
- Monitor rollback frequency

#### Production Monitoring
- Application performance monitoring
- Error tracking and reporting
- User behavior analytics

### Support and Maintenance

#### Regular Maintenance
- Update dependencies regularly
- Monitor security vulnerabilities
- Review and update deployment scripts
- Backup build configurations

#### Documentation Updates
- Keep deployment docs current
- Document configuration changes
- Maintain runbooks for common issues
- Update team knowledge base

## Conclusion

This deployment guide provides a comprehensive overview of deploying EasyTrack using EAS. Following these procedures ensures reliable, secure, and scalable deployments across all environments and user types.

For additional support:
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Expo Community Forums](https://forums.expo.dev/)