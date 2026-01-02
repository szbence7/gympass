import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { logout, getUser } from '../auth/storage';
import { useAuth } from '../auth/AuthContext';
import { useGym } from '../context/GymContext';
import { colors } from '../theme/colors';

export default function SettingsScreen({ navigation }: any) {
  const [user, setUser] = React.useState<any>(null);
  const { refreshAuth } = useAuth();
  const { selectedGym, clearSelectedGym } = useGym();

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await getUser();
    setUser(userData);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await refreshAuth();
          },
        },
      ]
    );
  };

  const handleChangeGym = () => {
    Alert.alert(
      'Change Gym',
      'Changing your gym will sign you out. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Gym',
          style: 'default',
          onPress: async () => {
            await logout();
            await clearSelectedGym();
            await refreshAuth();
            // Navigation will be handled by AppNavigator automatically
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {selectedGym && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Gym</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{selectedGym.name}</Text>
            </View>
            {selectedGym.city && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>City:</Text>
                <Text style={styles.value}>{selectedGym.city}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changeGymButton} onPress={handleChangeGym}>
            <Text style={styles.changeGymButtonText}>Change Gym</Text>
          </TouchableOpacity>
        </View>
      )}

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GymPass v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  changeGymButton: {
    backgroundColor: colors.secondary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changeGymButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.danger,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
