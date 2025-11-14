import 'dotenv/config';

export default {
  expo: {
    name: "Bizwak",
    slug: "bizwak",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.bizwak.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      eas: {
        projectId: "73835495-292c-4656-b7a5-8292fc5e24bb",
      },
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ]
  }
};
