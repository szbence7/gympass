// Polyfill for TextEncoder/TextDecoder (required by react-native-qrcode-svg on Hermes)
import 'fast-text-encoding';

import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import SplashWrapper from './src/components/SplashWrapper';

// Prevent the splash screen from auto-hiding as early as possible
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors, splash screen may not be available in all environments
});

export default function App() {
  return <SplashWrapper />;
}
