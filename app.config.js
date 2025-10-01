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
      url: "https://u.expo.dev/179dfb22-939f-4b91-b3fc-71881d4ad20f",
    },
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "easytrack",
    owner: "thewalkingdevnumoa",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F3F8F2",
    },
    android: {
      package: "com.thewalkingdevnumoa.EasyTrack",
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
          apiKey: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY,
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
        projectId: "179dfb22-939f-4b91-b3fc-71881d4ad20f"
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    },
  },
})