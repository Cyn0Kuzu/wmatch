# Android Deployment Guide - Storage Issues Fix

## Problem
The error "not enough space" occurs when deploying to Android devices with limited storage.

## Solutions Applied

### 1. Build Optimizations
- **Reduced architectures**: Only ARM (armeabi-v7a, arm64-v8a) instead of all architectures
- **Disabled unnecessary features**: GIF and WebP support disabled
- **Enabled resource shrinking**: Automatic removal of unused resources
- **Split APKs**: Architecture-specific APKs instead of universal APK
- **ProGuard enabled**: Code minification and obfuscation

### 2. Asset Optimization
- **Limited asset bundle**: Only includes assets folder instead of all files
- **Minimal permissions**: Empty permissions array to reduce APK size

### 3. Deployment Scripts
- **Automated cleanup**: Removes previous installations
- **Storage checking**: Monitors device storage before deployment
- **Cache clearing**: Clears Metro and Expo caches

## Usage

### Quick Deploy
```bash
npm run deploy-android
```

### Manual Steps
1. **Check device storage**:
   ```bash
   adb shell df /data
   ```

2. **Clean previous installation**:
   ```bash
   adb uninstall com.memode.mwatch
   npm run clean
   ```

3. **Build optimized APK**:
   ```bash
   npm run build-android
   ```

4. **Alternative: EAS Build (smaller APK)**:
   ```bash
   npm run build-android-eas
   ```

### Device Storage Solutions

#### Immediate Fixes:
1. **Clear app cache**:
   ```bash
   adb shell pm clear com.memode.mwatch
   ```

2. **Uninstall unused apps** on device

3. **Clear system cache**:
   ```bash
   adb shell pm trim-caches 1000M
   ```

#### Long-term Solutions:
1. **Use external storage** if available
2. **Enable app-specific storage** in Android settings
3. **Use EAS Build** for smaller APKs
4. **Consider app bundles** instead of APKs

## Troubleshooting

### If deployment still fails:

1. **Check device connection**:
   ```bash
   adb devices
   ```

2. **Enable USB debugging** on device

3. **Check Expo configuration**:
   ```bash
   npx expo doctor
   ```

4. **Use Expo Go for development**:
   ```bash
   npx expo start --android
   ```

### Alternative Deployment Methods:

1. **EAS Build (Recommended)**:
   ```bash
   npx eas build --platform android --profile preview
   ```

2. **Expo Go (Development)**:
   ```bash
   npx expo start --android
   ```

3. **Manual APK installation**:
   ```bash
   adb install path/to/optimized.apk
   ```

## Configuration Changes Made

### android/gradle.properties
- Reduced architectures to ARM only
- Disabled GIF and WebP support
- Enabled resource shrinking

### android/app/build.gradle
- Enabled ProGuard minification
- Added split APKs configuration
- Enabled resource shrinking

### app.json
- Limited asset bundle patterns
- Added minimal permissions
- Optimized Android configuration

## Expected Results
- **APK size reduction**: 30-50% smaller
- **Faster deployment**: Reduced build time
- **Better compatibility**: Works on devices with limited storage
- **Improved performance**: Optimized code and resources
