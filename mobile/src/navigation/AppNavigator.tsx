import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { GymProvider, useGym } from '../context/GymContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import SelectGymScreen from '../screens/SelectGymScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import MyPassesScreen from '../screens/MyPassesScreen';
import PassDetailScreen from '../screens/PassDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Create Account' }} // Will be translated in RegisterScreen
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerShadowVisible: false,
        tabBarStyle: { 
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="MyPasses" 
        component={MyPassesScreen}
        options={{ 
          title: t('passes.myPasses'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: t('passes.buyPasses'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PassDetail" 
        component={PassDetailScreen}
        options={{ title: 'Pass Details' }} // Will be translated in PassDetailScreen
      />
    </Stack.Navigator>
  );
}

export function AppContent() {
  const { isAuthenticated } = useAuth();
  const { selectedGym, isLoading: gymLoading } = useGym();

  // Show loading while checking auth and gym selection
  // Note: This loading state is now handled by SplashWrapper, but keeping for safety
  if (isAuthenticated === null || gymLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If no gym selected, show gym selection screen first
  if (!selectedGym) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SelectGym" component={SelectGymScreen} />
      </Stack.Navigator>
    );
  }

  // Gym selected - show auth or main app
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainApp" component={MainStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <GymProvider>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar barStyle="light-content" />
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </View>
      </AuthProvider>
    </GymProvider>
  );
}
