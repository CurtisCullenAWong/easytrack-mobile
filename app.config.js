import 'dotenv/config';

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
      url: "https://u.expo.dev/2a9ca4db-e0b3-4054-9f87-61975dbed992",
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "easytrack",
    owner: "thewalkingdev_numoa",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F3F8F2",
    },
    android: {
      package: "com.thewalkingdev_numoa.EasyTrack",
      googleServicesFile: "./google-services.json",
      runtimeVersion: {
        policy: "appVersion",
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#F3F8F2",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: "#F3F8F2",
          image: "./assets/images/splash-icon.png",
          dark: {
            image: "./assets/images/splash-icon.png",
            backgroundColor: "#121712",
          },
          resizeMode: "contain",
          imageWidth: 200,
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location in the background to keep deliveries updated.",
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/splash-icon.png",
          color: "#0C5B47",
          sounds: [],
          mode: "production",
        },
      ],
    ],
    notification: {
      icon: "./assets/images/splash-icon.png",
      color: "#0C5B47",
      iosDisplayInForeground: true,
    },
    ios: {
      bundleIdentifier: "EasyTrack",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "Your location is used to show your position and update deliveries.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Background location allows EasyTrack to keep delivery progress updated even when the app isn't open.",
        UIBackgroundModes: ["location", "processing"],
      },
    },
    extra: {
      eas: {
        projectId: "2a9ca4db-e0b3-4054-9f87-61975dbed992"
      },
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    },
  },
})