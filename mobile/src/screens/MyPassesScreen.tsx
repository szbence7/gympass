import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { passAPI, UserPass } from '../api/client';
import { colors } from '../theme/colors';
import { useGym } from '../context/GymContext';
import { computeGymOpenStatus, getStatusText, getStatusColor as getGymStatusColor } from '../utils/openingHours';
import { getPurchasedPassDisplayName } from '../utils/passLocalization';

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
      case 'DEPLETED': return colors.warning;
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (passes.length === 0) {
    return (
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
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {selectedGym && (
        <View style={styles.gymBranding}>
          <View style={styles.gymNameRow}>
            {selectedGym.openingHours ? (() => {
              const status = computeGymOpenStatus(selectedGym.openingHours);
              return (
                <>
                  <Text style={styles.gymNameWithStatus}>
                    {selectedGym.name} - {getStatusText(status)}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: getGymStatusColor(status) }]} />
                </>
              );
            })() : (
              <Text style={styles.gymName}>{selectedGym.name}</Text>
            )}
          </View>
        </View>
      )}
      
      {passes.map((pass) => (
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
              <Text style={styles.statusText}>{t(`passes.status.${pass.status.toLowerCase()}` as any, { defaultValue: pass.status })}</Text>
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
  },
  gymBranding: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  gymNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  gymName: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  gymNameWithStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
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
