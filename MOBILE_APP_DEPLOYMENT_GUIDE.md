# React Native Mobile App Deployment Guide
## Building and Distributing APK for Android (Non-Play Store)

This guide covers building a production-ready Android APK and distributing it without publishing to the Google Play Store.

---

## 📋 Prerequisites

1. **React Native Project Setup**
   - Ensure your React Native app is in a separate directory/repository
   - App should be configured to use your production API: `https://bizwak.co.ke`
   - All API integrations tested and working

2. **Required Tools**
   - Node.js (v16+)
   - Java JDK 11 or higher
   - Android Studio (with Android SDK)
   - React Native CLI: `npm install -g react-native-cli`

3. **Backend API Configuration** ✅
   - Your Flask backend already has JWT authentication configured (confirmed)
   - CORS has been updated to allow all `/api/*` endpoints for mobile access
   - API base URL: `https://bizwak.co.ke`
   - JWT tokens should be sent in `Authorization: Bearer <token>` header

4. **Mobile App API Configuration**
   - Verify your mobile app's API base URL points to: `https://bizwak.co.ke`
   - Ensure JWT tokens are properly stored and sent with API requests
   - Test all API endpoints from the mobile app before building release APK

---

## 🔧 Backend CORS Configuration (Optional but Recommended)

**Important**: React Native apps don't actually require CORS! React Native uses native networking libraries (OkHttp on Android, NSURLSession on iOS), which don't enforce CORS policies. CORS is a browser security feature.

**So if your mobile app worked locally during testing, it will work in production without CORS changes.**

However, CORS is still useful for:
- Web-based testing tools (Postman, browser-based API testing)
- WebView components within your React Native app
- Future web clients that might consume your APIs
- Debugging and development tools

Your Flask backend has been configured to allow CORS for API endpoints and auth routes:

```python
CORS(flask_app, resources={
    r"/api/*": {
        "origins": "*", 
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
        "allow_headers": ["Content-Type", "Authorization"]
    },
    r"/auth/*": {
        "origins": "*", 
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

This covers:
- All `/api/*` endpoints (login, clients, loans, payments, etc.)
- All `/auth/*` endpoints (registration, password reset, verification, etc.)

**Note**: Your backend already has JWT authentication configured via the `request_loader` function, which is perfect for mobile app authentication.

---

## 🔐 Step 1: Generate a Signing Keystore

You need a keystore to sign your APK for production distribution.

### Create the Keystore

```bash
cd /path/to/your/react-native-project/android

keytool -genkeypair -v -storetype PKCS12 -keystore bizwak-release-key.keystore -alias bizwak-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important Details to Note:**
- **Keystore Password**: Store this securely (you'll need it for future updates)
- **Key Alias**: `bizwak-key-alias` (or your preferred alias)
- **Key Password**: Store this securely
- **Validity**: 10000 days (~27 years) - recommended for production apps
- **Keystore File**: `bizwak-release-key.keystore` - **BACK THIS UP SECURELY!**

⚠️ **CRITICAL**: If you lose this keystore, you cannot update your app! Store it in a secure location (password manager, encrypted backup, etc.)

---

## ⚙️ Step 2: Configure Gradle for Signing

### 2.1 Create `keystore.properties` file

Create a file at `android/keystore.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=bizwak-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=bizwak-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password-here
MYAPP_RELEASE_KEY_PASSWORD=your-key-password-here
```

⚠️ **Important**: Add `keystore.properties` to `.gitignore` to avoid committing credentials!

### 2.2 Update `android/build.gradle`

Add this code before the `android` block:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

### 2.3 Update `android/app/build.gradle`

Find the `android` block and update the `signingConfigs` and `buildTypes`:

```gradle
android {
    ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['MYAPP_RELEASE_STORE_FILE'])
                storePassword keystoreProperties['MYAPP_RELEASE_STORE_PASSWORD']
                keyAlias keystoreProperties['MYAPP_RELEASE_KEY_ALIAS']
                keyPassword keystoreProperties['MYAPP_RELEASE_KEY_PASSWORD']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            shrinkResources true
        }
    }
    
    ...
}
```

---

## 📦 Step 3: Update App Configuration

### 3.1 Update API Base URL for Production

In your React Native app, ensure your API configuration points to production:

```javascript
// config/api.js or similar
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'  // Development
  : 'https://bizwak.co.ke';  // Production

export default API_BASE_URL;
```

### 3.2 Update `android/app/build.gradle`

Set your app version and version code:

```gradle
android {
    defaultConfig {
        applicationId "com.bizwak.app"  // Your app package name
        versionCode 1                    // Increment for each release
        versionName "1.0.0"              // Your app version
        ...
    }
}
```

### 3.3 Update App Name and Icon

- **App Name**: Edit `android/app/src/main/res/values/strings.xml`
- **App Icon**: Replace icons in `android/app/src/main/res/mipmap-*/`

---

## 🔨 Step 4: Build the Release APK

### 4.1 Clean Previous Builds

```bash
cd android
./gradlew clean
cd ..
```

### 4.2 Build the Release APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 4.3 (Optional) Build App Bundle (AAB)

For better optimization (though not needed for direct distribution):

```bash
cd android
./gradlew bundleRelease
```

This creates: `android/app/build/outputs/bundle/release/app-release.aab`

---

## ✅ Step 5: Test the APK

Before distributing:

1. **Install on a Test Device**:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

2. **Test All Features**:
   - Login/Authentication
   - API calls to `https://bizwak.co.ke`
   - All critical app functionality
   - Offline handling

3. **Verify App Signature**:
   ```bash
   jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 📤 Step 6: Distribution Options

### Option 1: Direct Download (Simplest)

1. **Host APK on Your Website**:
   - Upload `app-release.apk` to your server
   - Create a download page at `https://bizwak.co.ke/download-app`
   - Provide download link with instructions

2. **User Instructions**:
   - Users need to enable "Install from Unknown Sources" in Android settings
   - Download and install the APK directly

**Pros**: Simple, free, immediate
**Cons**: Users must enable unknown sources, no automatic updates

### Option 2: Firebase App Distribution (Recommended)

1. **Setup Firebase**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```

2. **Install Firebase App Distribution**:
   ```bash
   npm install --save-dev @react-native-firebase/app
   ```

3. **Distribute APK**:
   ```bash
   firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
     --app YOUR_FIREBASE_APP_ID \
     --groups "testers" \
     --release-notes "Version 1.0.0 - Initial release"
   ```

**Pros**: Professional, version management, tester management, crash reporting
**Cons**: Requires Firebase account (free tier available)

### Option 3: Internal Testing Track (Play Store Private)

1. Upload to Google Play Console
2. Use "Internal Testing" or "Closed Testing"
3. Add testers by email
4. App remains private (not publicly searchable)

**Pros**: Official distribution, automatic updates, no unknown sources needed
**Cons**: Requires Google Play Developer account ($25 one-time fee)

### Option 4: Self-Hosted Distribution Server

Create a simple download page on your website with:
- APK download link
- Version information
- Installation instructions
- Update notifications

---

## 🚀 Step 7: Creating a Download Page (Option 1 Example)

Create a simple HTML page on your server:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Download Bizwak Mobile App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h1>Download Bizwak Mobile App</h1>
    <p>Version 1.0.0</p>
    <a href="/apk/app-release.apk" download>Download APK</a>
    
    <h2>Installation Instructions</h2>
    <ol>
        <li>Download the APK file</li>
        <li>On your Android device, go to Settings > Security</li>
        <li>Enable "Install from Unknown Sources"</li>
        <li>Open the downloaded APK file</li>
        <li>Tap "Install"</li>
    </ol>
</body>
</html>
```

---

## 🔄 Step 8: Updating the App

When you need to release an update:

1. **Increment Version**:
   - Update `versionCode` (increment by 1)
   - Update `versionName` (e.g., "1.0.1")

2. **Rebuild APK**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

3. **Test the Update**:
   - Install on test device
   - Verify update works correctly

4. **Distribute**:
   - Upload new APK to your distribution method
   - Notify users of the update

---

## 📝 Step 9: Security Best Practices

1. **Enable ProGuard/R8**:
   - Already configured in `build.gradle` (minifyEnabled)
   - Obfuscates code to protect against reverse engineering

2. **API Security**:
   - Use HTTPS only (already configured: `https://bizwak.co.ke`)
   - Implement certificate pinning if needed
   - Store API keys securely (use React Native's Keychain/Keystore)

3. **App Security**:
   - Don't hardcode secrets in the app
   - Use environment variables for sensitive config
   - Implement proper authentication token storage

---

## 🐛 Troubleshooting

### Build Fails with "Execution failed for task ':app:processReleaseResources'"

**Solution**: Clean and rebuild:
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### APK is too Large

**Solutions**:
- Enable ProGuard (already configured)
- Use Android App Bundle instead of APK
- Remove unused dependencies
- Optimize images and assets

### App Crashes on Startup

**Check**:
- API base URL is correct
- CORS settings on backend
- Network permissions in `AndroidManifest.xml`
- Check logcat: `adb logcat`

### Signature Verification Fails

**Solution**: Ensure keystore.properties is correctly configured and keystore file exists.

---

## 📚 Additional Resources

- [React Native Android Build Documentation](https://reactnative.dev/docs/signed-apk-android)
- [Android App Signing Guide](https://developer.android.com/studio/publish/app-signing)
- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)
- [ProGuard Rules](https://reactnative.dev/docs/signed-apk-android#enabling-proguard-to-reduce-the-size-of-the-apk)

---

## ✅ Checklist for Deployment

- [ ] Keystore generated and backed up securely
- [ ] `keystore.properties` configured (and added to `.gitignore`)
- [ ] `build.gradle` updated with signing config
- [ ] API base URL points to `https://bizwak.co.ke`
- [ ] App version and version code updated
- [ ] App name and icon configured
- [ ] Release APK built successfully
- [ ] APK tested on physical device
- [ ] All API endpoints tested
- [ ] Distribution method chosen and setup
- [ ] Download page/instructions created (if using direct download)
- [ ] Users notified about app availability

---

## 🎯 Quick Reference Commands

```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore bizwak-release-key.keystore -alias bizwak-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Clean build
cd android && ./gradlew clean && cd ..

# Build release APK
cd android && ./gradlew assembleRelease

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# Verify APK signature
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk

# Check APK size
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

---

**Note**: This guide assumes your React Native project is in a separate directory. If you need help with any specific step or encounter issues, refer to the troubleshooting section or React Native documentation.

