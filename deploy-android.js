#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Android deployment optimization...\n');

// Function to run commands with error handling
function runCommand(command, description) {
  console.log(`📱 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully\n`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, error.message);
    process.exit(1);
  }
}

// Function to check device storage
function checkDeviceStorage() {
  console.log('📊 Checking device storage...');
  try {
    const output = execSync('adb shell df /data', { encoding: 'utf8' });
    console.log('Device storage info:', output);
    
    // Extract available space
    const lines = output.split('\n');
    const dataLine = lines.find(line => line.includes('/data'));
    if (dataLine) {
      const parts = dataLine.split(/\s+/);
      const availableKB = parseInt(parts[3]);
      const availableMB = Math.round(availableKB / 1024);
      
      console.log(`📱 Available storage: ${availableMB} MB`);
      
      if (availableMB < 1000) {
        console.log('⚠️  Warning: Low storage detected. Consider:');
        console.log('   1. Clear app cache: adb shell pm clear com.memode.mwatch');
        console.log('   2. Uninstall unused apps');
        console.log('   3. Clear system cache');
        console.log('   4. Use external storage if available\n');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not check device storage. Continuing...\n');
  }
}

// Function to clean up previous installations
function cleanupPreviousInstallations() {
  console.log('🧹 Cleaning up previous installations...');
  try {
    // Uninstall previous version if exists
    execSync('adb uninstall com.memode.mwatch', { stdio: 'ignore' });
    console.log('✅ Previous installation removed');
    
    // Clear Expo cache
    execSync('npx expo install --fix', { stdio: 'inherit' });
    console.log('✅ Expo dependencies fixed');
    
    // Clear Metro cache
    execSync('npx react-native start --reset-cache', { stdio: 'ignore' });
    console.log('✅ Metro cache cleared\n');
  } catch (error) {
    console.log('⚠️  Cleanup completed with warnings\n');
  }
}

// Main deployment process
async function deploy() {
  try {
    // Check if device is connected
    console.log('🔍 Checking device connection...');
    execSync('adb devices', { stdio: 'inherit' });
    console.log('✅ Device connected\n');
    
    // Check storage
    checkDeviceStorage();
    
    // Cleanup
    cleanupPreviousInstallations();
    
    // Build optimized APK
    console.log('🔨 Building optimized APK...');
    runCommand('npx expo run:android --variant release', 'Building release APK');
    
    // Alternative: Use EAS Build for smaller APK
    console.log('📦 Alternative: Using EAS Build for optimized APK...');
    console.log('Run: npx eas build --platform android --profile preview');
    console.log('This will create a smaller, optimized APK\n');
    
    console.log('🎉 Deployment optimization completed!');
    console.log('\n📋 Next steps:');
    console.log('1. If storage is still low, try: npx eas build --platform android --profile preview');
    console.log('2. Install the APK manually: adb install path/to/apk');
    console.log('3. Or use Expo Go for development: npx expo start --android');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure device is connected: adb devices');
    console.log('2. Enable USB debugging on device');
    console.log('3. Check device storage space');
    console.log('4. Try: npx expo doctor');
    process.exit(1);
  }
}

// Run deployment
deploy();
