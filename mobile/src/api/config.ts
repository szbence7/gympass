import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API Base URL Configuration
 * 
 * For REAL DEVICES: Set environment variable in your shell before starting Expo:
 *   export EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
 *   (Replace with your computer's LAN IP address)
 * 
 * For SIMULATORS/EMULATORS: Uses localhost automatically
 */

function getApiBaseUrl(): string {
  // 1. Check for explicit environment variable (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Auto-detect from Expo host (for real devices)
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':').shift();
  
  if (debuggerHost && debuggerHost !== 'localhost' && debuggerHost !== '127.0.0.1') {
    // Running on a real device - use the Expo dev server's host
    const backendPort = 4000; // Backend port
    return `http://${debuggerHost}:${backendPort}`;
  }

  // 3. Android emulator special case
  if (Platform.OS === 'android' && !debuggerHost) {
    // Android emulator uses 10.0.2.2 to reach host machine's localhost
    return 'http://10.0.2.2:4000';
  }

  // 4. Default fallback (for iOS simulator and other cases)
  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();

// Log the resolved URL for debugging
console.log('📡 API Base URL:', API_BASE_URL);
