import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { logout, getUser } from '../auth/storage';
import { useAuth } from '../auth/AuthContext';
import { useGym } from '../context/GymContext';
import { colors } from '../theme/colors';
import { getDayName, formatHours } from '../utils/openingHours';
import { changeLanguage } from '../i18n/config';
import ScreenHeader from '../components/ScreenHeader';

export default function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const [user, setUser] = React.useState<any>(null);
  const { refreshAuth } = useAuth();
  const { selectedGym, clearSelectedGym, refreshGymData } = useGym();

  React.useEffect(() => {
    loadUser();
  }, []);

  // Refresh gym data (including openingHours) when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (selectedGym) {
        refreshGymData();
      }
    }, [selectedGym])
  );

  const loadUser = async () => {
    const userData = await getUser();
    setUser(userData);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
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
      t('gym.changeGym'),
      t('gym.changeGymConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('gym.changeGym'),
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

  const handleLanguageChange = async (lang: 'hu' | 'en') => {
    await changeLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title={t('settings.title')} />
        
        {selectedGym && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('gym.currentGym')}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('gym.name')}:</Text>
              <Text style={styles.value}>{selectedGym.name}</Text>
            </View>
            {selectedGym.city && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>{t('gym.city')}:</Text>
                <Text style={styles.value}>{selectedGym.city}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changeGymButton} onPress={handleChangeGym}>
            <Text style={styles.changeGymButtonText}>{t('gym.changeGym')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedGym && selectedGym.openingHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('gym.openingHours')}</Text>
          <View style={styles.infoCard}>
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
              const dayHours = selectedGym.openingHours![day as keyof typeof selectedGym.openingHours];
              return (
                <View key={day} style={styles.infoRow}>
                  <Text style={styles.label}>{getDayName(day)}:</Text>
                  <Text style={styles.value}>{formatHours(dayHours)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {selectedGym && !selectedGym.openingHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('gym.openingHours')}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.unknownText}>{t('gym.openingHoursUnknown')}</Text>
          </View>
        </View>
      )}

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('gym.name')}:</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('auth.email')}:</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={[styles.languageOption, i18n.language === 'hu' && styles.languageOptionSelected]}
            onPress={() => handleLanguageChange('hu')}
          >
            <Text style={[styles.languageText, i18n.language === 'hu' && styles.languageTextSelected]}>
              {t('settings.magyar')}
            </Text>
            {i18n.language === 'hu' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageOption, i18n.language === 'en' && styles.languageOptionSelected]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[styles.languageText, i18n.language === 'en' && styles.languageTextSelected]}>
              {t('settings.english')}
            </Text>
            {i18n.language === 'en' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>GymGo v1.0.0</Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unknownText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageOptionSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  languageText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  languageTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
