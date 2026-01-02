import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { authAPI } from '../api/client';
import { saveToken, saveUser } from '../auth/storage';
import { useAuth } from '../auth/AuthContext';
import { useGym } from '../context/GymContext';
import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshAuth } = useAuth();
  const { selectedGym, clearSelectedGym } = useGym();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      await saveToken(response.token);
      await saveUser(response.user);
      await refreshAuth();
    } catch (error: any) {
      // Handle specific login error codes
      if (error.code === 'USER_NOT_FOUND') {
        Alert.alert(
          'Nincs ilyen felhasználó',
          'Nincs ilyen felhasználó. Szeretnél regisztrálni?',
          [
            { text: 'Mégse', style: 'cancel' },
            { 
              text: 'Regisztráció', 
              onPress: () => navigation.navigate('Register')
            }
          ]
        );
      } else if (error.code === 'INVALID_PASSWORD') {
        Alert.alert('Hibás jelszó', 'Hibás jelszó.');
      } else {
        // Generic error fallback
        Alert.alert('Error', error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>GymPass</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {selectedGym && (
          <View style={styles.gymInfo}>
            <Text style={styles.gymLabel}>Kiválasztott terem: <Text style={styles.gymName}>{selectedGym.name}</Text></Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeGymButton}
          onPress={async () => {
            await clearSelectedGym();
          }}
          disabled={loading}
        >
          <Text style={styles.changeGymText}>Másik gym választása</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: colors.textSecondary,
  },
  gymInfo: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  gymLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  gymName: {
    fontWeight: '600',
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: colors.secondary,
    fontSize: 14,
  },
  changeGymButton: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 10,
  },
  changeGymText: {
    color: colors.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
