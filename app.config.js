import 'dotenv/config';

export default {
  expo: {
    name: "Bizwak",
    slug: "bizwak",
    owner: "cirrus-erp-ltd",
    version: "1.1.0",
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
      versionCode: 23,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "READ_MEDIA_IMAGES",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
      eas: {
        projectId: "900f41f8-d69b-45c2-bae5-802b679d2893"
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
