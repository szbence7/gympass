import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gym, useGym } from '../context/GymContext';
import apiClient from '../api/client';
import { colors } from '../theme/colors';

export default function SelectGymScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { setSelectedGym } = useGym();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/public/gyms');
      setGyms(response.data);
    } catch (err: any) {
      console.error('Failed to load gyms:', err);
      setError(err.message || t('gym.failedToLoadGyms'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    const selectedGym = gyms.find(g => g.id === selectedId);
    if (!selectedGym) {
      Alert.alert(t('gym.noGymSelected'), t('gym.pleaseSelectGym'));
      return;
    }

    try {
      await setSelectedGym(selectedGym);
      // Navigation will be handled automatically by AppNavigator
      // which watches the selectedGym context
    } catch (err: any) {
      Alert.alert(t('common.error'), t('gym.failedToSaveSelection'));
    }
  };

  const renderGymItem = ({ item }: { item: Gym }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.gymItem, isSelected && styles.gymItemSelected]}
        onPress={() => setSelectedId(item.id)}
      >
        <View style={styles.gymInfo}>
          <Text style={[styles.gymName, isSelected && styles.gymNameSelected]}>
            {item.name}
          </Text>
          {item.city && (
            <Text style={[styles.gymCity, isSelected && styles.gymCitySelected]}>
              {item.city}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('gym.loadingGyms')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadGyms}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (gyms.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('gym.noGymsAvailable')}</Text>
        <Text style={styles.errorSubtext}>{t('gym.contactSupport')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('gym.chooseGym')}</Text>
        <Text style={styles.subtitle}>
          {t('gym.chooseGymSubtitle')}
        </Text>
      </View>

      <FlatList
        data={gyms}
        keyExtractor={(item) => item.id}
        renderItem={renderGymItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedId && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedId}
        >
          <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 15,
  },
  gymItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gymItemSelected: {
    borderColor: colors.selectedBorder,
    backgroundColor: colors.selectedBg,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  gymNameSelected: {
    color: colors.primary,
  },
  gymCity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  gymCitySelected: {
    color: colors.secondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    color: colors.primaryText,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});

