# API Documentation

## Overview

EasyTrack uses Supabase as its primary backend service, providing a comprehensive PostgreSQL database with real-time capabilities, authentication, and file storage. This document outlines the API integrations, data models, and authentication flow.

## Table of Contents

- [Backend Architecture](#backend-architecture)
- [Authentication System](#authentication-system)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [File Storage](#file-storage)
- [Real-time Features](#real-time-features)
- [External APIs](#external-apis)
- [Error Handling](#error-handling)

## Backend Architecture

### Supabase Configuration

The app connects to Supabase using the JavaScript client:

```javascript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL, 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Authentication System

### Authentication Flow

1. **Login Methods**
   - Email/Password authentication
   - OTP (One-Time Password) via email
   - Session persistence across app restarts

2. **Session Management**
   ```javascript
   // Check current session
   const { data: { session }, error } = await supabase.auth.getSession()
   
   // Get current user
   const { data: { user } } = await supabase.auth.getUser()
   ```

3. **Password Management**
   ```javascript
   // Update password
   const { error } = await supabase.auth.updateUser({ password: newPassword })
   
   // Password recovery
   const { error } = await supabase.auth.resetPasswordForEmail(email)
   ```

### Role-Based Access Control

The app implements three user roles:

- **Role ID 1**: Administrator
- **Role ID 2**: Delivery Partner  
- **Role ID 3**: Airline Personnel

```javascript
// Fetch user role
const { data: profile } = await supabase
  .from('profiles')
  .select('role_id, user_status_id')
  .eq('id', user.id)
  .single()
```

## Database Schema

### Core Tables

#### profiles
Primary user table containing all user information:

```sql
profiles {
  id: UUID (Primary Key, references auth.users)
  email: VARCHAR
  first_name: VARCHAR
  middle_initial: VARCHAR
  last_name: VARCHAR
  suffix: VARCHAR
  contact_number: VARCHAR
  birth_date: DATE
  emergency_contact_name: VARCHAR
  emergency_contact_number: VARCHAR
  role_id: INTEGER (Foreign Key)
  corporation_id: INTEGER (Foreign Key)
  user_status_id: INTEGER (Foreign Key)
  verify_status_id: INTEGER (Foreign Key)
  gov_id_type: INTEGER (Foreign Key)
  gov_id_number: VARCHAR
  gov_id_proof: VARCHAR (Storage URL)
  gov_id_proof_back: VARCHAR (Storage URL)
  vehicle_info: VARCHAR
  vehicle_plate_number: VARCHAR
  vehicle_or_cr: VARCHAR (Storage URL)
  pfp_id: VARCHAR (Storage URL)
  last_sign_in_at: TIMESTAMP
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

#### Role Reference Tables

```sql
profile_roles {
  id: INTEGER (Primary Key)
  role_name: VARCHAR
}

user_status {
  id: INTEGER (Primary Key)
  status_name: VARCHAR
}

verify_status {
  id: INTEGER (Primary Key)
  status_name: VARCHAR
}

gov_id_types {
  id: INTEGER (Primary Key)
  id_type_name: VARCHAR
}

profiles_corporation {
  id: INTEGER (Primary Key)
  corporation_name: VARCHAR
}
```

### Common Database Operations

#### Profile Management

```javascript
// Fetch complete profile with relationships
const { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    profile_status:user_status_id (status_name),
    profile_roles:role_id (role_name),
    profile_corporation:corporation_id (corporation_name),
    gov_id:gov_id_type (id_type_name),
    verify_status:verify_status_id (status_name)
  `)
  .eq('id', user.id)
  .single()

// Update profile
const { error } = await supabase
  .from('profiles')
  .update({
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id)

// Check profile completion
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
```

#### User Verification

```javascript
// Submit verification documents
const { error } = await supabase
  .from('profiles')
  .update({ 
    verify_status_id: 3, // Pending verification
    gov_id_type: govIdType,
    gov_id_number: govIdNumber,
    gov_id_proof: frontImageUrl,
    gov_id_proof_back: backImageUrl,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id)

// Check verification status
const { data: profile } = await supabase
  .from('profiles')
  .select('verify_status_id')
  .eq('id', user.id)
  .single()
```

#### User Management (Admin)

```javascript
// Fetch all users for management
const { data: users } = await supabase
  .from('profiles')
  .select(`
    *,
    role:role_id (role_name),
    corporation:corporation_id (corporation_name),
    user_status:user_status_id (status_name),
    verify_status:verify_status_id (status_name)
  `)
  .order('created_at', { ascending: false })

// Update user status
const { error } = await supabase
  .from('profiles')
  .update({ 
    user_status_id: newStatusId,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId)
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/v1/signup` | Create new user account |
| POST | `/auth/v1/token` | Login with email/password |
| POST | `/auth/v1/otp` | Send OTP to email |
| POST | `/auth/v1/verify` | Verify OTP |
| POST | `/auth/v1/recover` | Password recovery |
| PUT | `/auth/v1/user` | Update user (password) |
| POST | `/auth/v1/logout` | Sign out user |

### Database REST API

Supabase automatically generates REST endpoints for all tables:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/v1/profiles` | Fetch profiles |
| POST | `/rest/v1/profiles` | Create profile |
| PATCH | `/rest/v1/profiles` | Update profile |
| DELETE | `/rest/v1/profiles` | Delete profile |

#### Query Examples

```javascript
// Select with filters
const { data } = await supabase
  .from('profiles')
  .select('first_name, last_name, role_id')
  .eq('role_id', 2)
  .gte('created_at', '2024-01-01')

// Select with joins
const { data } = await supabase
  .from('profiles')
  .select(`
    first_name,
    last_name,
    role:role_id (role_name)
  `)

// Insert
const { data, error } = await supabase
  .from('profiles')
  .insert({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  })

// Update with conditions
const { error } = await supabase
  .from('profiles')
  .update({ last_sign_in_at: new Date().toISOString() })
  .eq('id', userId)
```

## File Storage

### Storage Buckets

The app uses three main storage buckets:

1. **profile-images**: User profile pictures
   - Path structure: `{role_folder}/{user_id}.png`
   - Folders: `admin/`, `delivery/`, `airlines/`

2. **gov-id**: Government ID documents
   - Path structure: `{role_folder}/{user_id}_gov_id_{front|back}.png`
   - Folders: `admin/`, `delivery/`, `airlines/`

3. **or-cr**: Vehicle documents (delivery partners only)
   - Path structure: `delivery/{user_id}_vehicle_or_cr.png`

### File Upload Implementation

```javascript
// Upload profile image
const uploadImage = async (imageUri) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .single()

  const folder = {
    1: 'admin',
    2: 'delivery', 
    3: 'airlines'
  }[profileData.role_id]

  const filePath = `${folder}/${user.id}.png`
  const base64 = await FileSystem.readAsStringAsync(imageUri, { 
    encoding: FileSystem.EncodingType.Base64 
  })

  const { error } = await supabase.storage
    .from('profile-images')
    .upload(filePath, decode(base64), { 
      contentType: 'image/png', 
      upsert: true 
    })
}

// Get signed URL for private files
const { data: signedUrl } = await supabase.storage
  .from('profile-images')
  .createSignedUrl(filePath, 3600)
```

## Real-time Features

### Real-time Subscriptions

```javascript
// Subscribe to profile changes
const subscription = supabase
  .channel('profile-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    console.log('Profile updated:', payload.new)
  })
  .subscribe()

// Cleanup subscription
subscription.unsubscribe()
```

### Messaging System

```javascript
// Fetch conversations
const { data: messages } = await supabase
  .from('messages')
  .select(`
    *,
    sender:sender_id (first_name, last_name, pfp_id),
    recipient:recipient_id (first_name, last_name, pfp_id)
  `)
  .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  .order('created_at', { ascending: false })

// Real-time message updates
const messagesSubscription = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages'
  }, handleMessageUpdate)
  .subscribe()
```

## External APIs

### Google Maps API

Used for location services and mapping:

```javascript
// Configuration in app.config.js
config: {
  googleMaps: {
    apiKey: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY,
  },
}
```

### Google Generative AI

Enhanced features using AI:

```javascript
import { GoogleGenerativeAI } from '@google/genai'

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GENAI_API_KEY)
```

### Firebase (Push Notifications)

Integration for push notifications:

```javascript
// Configuration
import { getMessaging } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  // ... other config
}
```

## Error Handling

### Common Error Patterns

```javascript
// Database operations
try {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }
  
  return data
} catch (error) {
  console.error('Database error:', error)
  showSnackbar('Failed to load profile: ' + error.message)
}

// Authentication errors
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      showSnackbar('Invalid email or password')
    } else {
      showSnackbar('Login failed: ' + error.message)
    }
    return
  }
} catch (error) {
  showSnackbar('An error occurred during login')
}
```

### Status Codes

Common Supabase status codes:

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **500**: Internal Server Error

### Row Level Security (RLS)

Supabase implements Row Level Security policies to protect data:

```sql
-- Example policy for profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## Performance Optimization

### Query Optimization

```javascript
// Use select() to limit columns
const { data } = await supabase
  .from('profiles')
  .select('id, first_name, last_name') // Only needed columns
  .eq('role_id', 2)

// Use single() for single row queries
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single() // Expects exactly one row

// Use pagination for large datasets
const { data } = await supabase
  .from('profiles')
  .select('*')
  .range(0, 49) // First 50 records
  .order('created_at', { ascending: false })
```

### Connection Management

```javascript
// Reuse single Supabase client instance
// Don't create multiple clients

// Use connection pooling (handled automatically by Supabase)
// Implement proper error handling and retries
```

## Testing

### Environment Setup

```javascript
// Test configuration
const supabaseTest = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_TEST_URL,
  process.env.EXPO_PUBLIC_SUPABASE_TEST_ANON_KEY
)
```

### Mock Data

```javascript
// Example test user
const testUser = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role_id: 2,
  user_status_id: 1
}
```

## Security Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **Row Level Security**: Enable RLS on all tables
3. **Input Validation**: Validate all user inputs
4. **File Upload Security**: Validate file types and sizes
5. **Authentication**: Always verify user authentication before operations
6. **Error Messages**: Don't expose sensitive information in error messages

## Monitoring and Logging

```javascript
// Error logging
console.error('Supabase error:', error)

// Performance monitoring
console.time('profile-fetch')
const profile = await fetchProfile()
console.timeEnd('profile-fetch')

// User activity tracking
await supabase
  .from('audit_logs')
  .insert({
    user_id: userId,
    action: 'profile_update',
    timestamp: new Date().toISOString()
  })
```