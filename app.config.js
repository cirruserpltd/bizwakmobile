import 'dotenv/config';

export default {
  expo: {
    name: "bizwak",
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
    extra: {
      API_BASE_URL: process.env.API_BASE_URL,
    },
  },
};
