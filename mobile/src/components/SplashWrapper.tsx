import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { GymProvider, useGym } from '../context/GymContext';
import { AppContent } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

function LoadingBar() {
  const translateX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Indeterminate progress animation - sliding bar that loops
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      // Cleanup: stop animation when component unmounts
      if (loop.stop) {
        loop.stop();
      }
    };
  }, []);

  const slideX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 300], // Adjust based on container width
  });

  return (
    <View style={styles.loadingBarTrack}>
      <Animated.View
        style={[
          styles.loadingBarFill,
          {
            transform: [{ translateX: slideX }],
          },
        ]}
      />
    </View>
  );
}

function AppWithSplash() {
  const { isAuthenticated } = useAuth();
  const { isLoading: gymLoading } = useGym();
  const [appIsReady, setAppIsReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  // Wait for initialization to complete with timeout fallback
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    async function prepare() {
      try {
        // Wait for initialization with timeout fallback (4000ms max wait)
        const startTime = Date.now();
        const maxWait = 4000;

        while ((isAuthenticated === null || gymLoading) && (Date.now() - startTime) < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 50));
          if (!mounted) return;
        }

        // DEV-ONLY: Add delay for visual testing (only in development)
        if (__DEV__) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          if (!mounted) return;
        }
      } catch (e) {
        console.warn('Error during initialization:', e);
      } finally {
        // CRITICAL: Always set app ready, even if init fails or times out
        if (mounted) {
          setAppIsReady(true);
        }
      }
    }

    // Hard timeout fallback to ensure app always renders
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Init timeout reached, forcing app ready');
        setAppIsReady(true);
      }
    }, 4000);

    prepare();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, gymLoading]);

  // Hide splash screen after layout pass when app is ready
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !layoutReady) {
      setLayoutReady(true);
      // Wait a tiny bit more to ensure layout is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      await SplashScreen.hideAsync().catch((error) => {
        console.warn('Failed to hide splash screen:', error);
      });
    }
  }, [appIsReady, layoutReady]);

  // Safety fallback: ensure hideAsync is called if app is ready but layout callback didn't fire
  useEffect(() => {
    if (appIsReady && !layoutReady) {
      const timeoutId = setTimeout(async () => {
        setLayoutReady(true);
        await SplashScreen.hideAsync().catch((error) => {
          console.warn('Failed to hide splash screen (fallback):', error);
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [appIsReady, layoutReady]);

  // Show splash UI while initializing or before layout ready
  if (!appIsReady || !layoutReady) {
    return (
      <View style={styles.splashContainer} onLayout={onLayoutRootView}>
        <StatusBar barStyle="light-content" />
        <Image 
          source={require('../../assets/splash.png')} 
          style={styles.splashImage}
          resizeMode="cover"
        />
        <View style={styles.loadingBarContainer}>
          <LoadingBar />
        </View>
      </View>
    );
  }

  // Initialization complete and layout ready, render app navigation
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </View>
  );
}

export default function SplashWrapper() {
  return (
    <GymProvider>
      <AuthProvider>
        <AppWithSplash />
      </AuthProvider>
    </GymProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  loadingBarContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: 80,
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
    position: 'absolute',
    left: 0,
  },
});

