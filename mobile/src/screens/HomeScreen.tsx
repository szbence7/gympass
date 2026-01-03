import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { passAPI, PassType } from '../api/client';
import { colors } from '../theme/colors';
import { useGym } from '../context/GymContext';
import { getPassDisplayName, getPassDisplayDescription } from '../utils/passLocalization';
import ScreenHeader from '../components/ScreenHeader';

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { selectedGym, refreshGymData } = useGym();

  useEffect(() => {
    loadPassTypes();
  }, []);

  // Refresh gym data (including openingHours) when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedGym) {
        refreshGymData();
      }
    }, [selectedGym])
  );

  const loadPassTypes = async () => {
    try {
      const types = await passAPI.getPassTypes();
      setPassTypes(types);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('passes.failedToLoadPassTypes'));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (passTypeId: string) => {
    setPurchasing(passTypeId);
    try {
      await passAPI.purchasePass(passTypeId);
      Alert.alert(t('common.success'), t('passes.purchasedSuccessfully'), [
        { text: t('passes.viewMyPasses'), onPress: () => navigation.navigate('MyPasses') },
        { text: t('common.ok') },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('passes.failedToPurchasePass'));
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title={t('passes.buyPasses')} />
        
        {passTypes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('passes.noPassesAvailable')}</Text>
        </View>
      ) : (
        passTypes.map((passType) => (
          <View key={passType.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{getPassDisplayName(passType)}</Text>
              <Text style={styles.price}>{passType.price.toFixed(0)} HUF</Text>
            </View>

            {getPassDisplayDescription(passType) && (
              <Text style={styles.description}>{getPassDisplayDescription(passType)}</Text>
            )}

            <View style={styles.details}>
              {passType.durationDays && (
                <Text style={styles.detailText}>{t('passes.validForDays', { days: passType.durationDays })}</Text>
              )}
              {passType.totalEntries ? (
                <Text style={styles.detailText}>{t('passes.totalEntries', { count: passType.totalEntries })}</Text>
              ) : (
                <Text style={styles.detailText}>{t('passes.unlimitedEntries')}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.buyButton, purchasing === passType.id && styles.buyButtonDisabled]}
              onPress={() => handlePurchase(passType.id)}
              disabled={purchasing === passType.id}
            >
              <Text style={styles.buyButtonText}>
                {purchasing === passType.id ? t('passes.purchasing') : t('passes.buyNow')}
              </Text>
            </TouchableOpacity>
          </View>
        ))
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  details: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  buyButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: colors.border,
  },
  buyButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
