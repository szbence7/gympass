import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { passAPI, UserPass } from '../api/client';
import { colors } from '../theme/colors';
import { useGym } from '../context/GymContext';
import { getPurchasedPassDisplayName } from '../utils/passLocalization';
import ScreenHeader from '../components/ScreenHeader';

export default function MyPassesScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [passes, setPasses] = useState<UserPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedGym, refreshGymData } = useGym();

  const loadPasses = async () => {
    try {
      const myPasses = await passAPI.getMyPasses();
      setPasses(myPasses);
    } catch (error: any) {
      console.error('Failed to load passes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper to determine if a pass is active (usable)
  const isPassActive = (pass: UserPass): boolean => {
    const now = new Date();
    const isDateExpired = pass.validUntil && new Date(pass.validUntil) < now;
    const isUsageExhausted = pass.remainingEntries !== null && pass.remainingEntries <= 0;
    const isInvalidStatus = pass.status === 'EXPIRED' || pass.status === 'DEPLETED' || pass.status === 'REVOKED';
    
    return !isDateExpired && !isUsageExhausted && !isInvalidStatus;
  };

  // Sort passes: active first, then expired, both sorted by purchase date descending
  const getSortedPasses = (passesList: UserPass[]): UserPass[] => {
    const activePasses: UserPass[] = [];
    const expiredPasses: UserPass[] = [];

    // Split into active and expired groups
    passesList.forEach(pass => {
      if (isPassActive(pass)) {
        activePasses.push(pass);
      } else {
        expiredPasses.push(pass);
      }
    });

    // Sort both groups by purchasedAt descending (newest first)
    // Handle missing/invalid dates gracefully
    const sortByPurchaseDate = (a: UserPass, b: UserPass) => {
      const dateA = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
      const dateB = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
      // If date is invalid (NaN), treat as 0 (oldest)
      const validDateA = isNaN(dateA) ? 0 : dateA;
      const validDateB = isNaN(dateB) ? 0 : dateB;
      return validDateB - validDateA; // Descending (newest first)
    };

    activePasses.sort(sortByPurchaseDate);
    expiredPasses.sort(sortByPurchaseDate);

    // Return active first, then expired
    return [...activePasses, ...expiredPasses];
  };

  useFocusEffect(
    useCallback(() => {
      loadPasses();
      // Refresh gym data (including openingHours) when screen comes into focus
      if (selectedGym) {
        refreshGymData();
      }
    }, [selectedGym])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPasses();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return colors.success;
      case 'EXPIRED': return colors.danger;
      case 'DEPLETED': return colors.danger; // Changed from warning to danger - expired/invalid passes should be red
      case 'REVOKED': return colors.textMuted;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('passes.noExpiry');
    return new Date(dateStr).toLocaleDateString();
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

  if (passes.length === 0) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <ScreenHeader title={t('passes.myPasses')} />
          
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{t('passes.noPassesYet')}</Text>
            <Text style={styles.emptySubtext}>{t('passes.purchasePassToStart')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.emptyButtonText}>{t('passes.browsePasses')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ScreenHeader title={t('passes.myPasses')} />
        
        {getSortedPasses(passes).map((pass) => (
        <TouchableOpacity
          key={pass.id}
          style={styles.card}
          onPress={() => navigation.navigate('PassDetail', { passId: pass.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {getPurchasedPassDisplayName(pass)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pass.status) }]}>
              <Text style={styles.statusText}>
                {(() => {
                  const now = new Date();
                  const isDateExpired = pass.validUntil && new Date(pass.validUntil) < now;
                  const isUsageExhausted = pass.remainingEntries !== null && pass.remainingEntries <= 0;
                  
                  if (isDateExpired || isUsageExhausted || pass.status === 'EXPIRED' || pass.status === 'DEPLETED') {
                    return t('passes.status.expired');
                  } else if (pass.status === 'REVOKED') {
                    return t('passes.status.revoked');
                  }
                  return t('passes.status.active');
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.details}>
            {pass.validUntil && (
              <Text style={styles.detailText}>{t('passes.expires')}: {formatDate(pass.validUntil)}</Text>
            )}
            {pass.remainingEntries !== null && (
              <Text style={styles.detailText}>
                {t('passes.remaining')}: {pass.remainingEntries} / {pass.totalEntries}
              </Text>
            )}
            <Text style={styles.detailText}>{t('passes.serial')}: {pass.walletSerialNumber}</Text>
          </View>

          <Text style={styles.viewDetails}>{t('passes.tapToViewQR')}</Text>
        </TouchableOpacity>
        ))}
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
    padding: 20,
    minHeight: 400,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
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
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  viewDetails: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});
