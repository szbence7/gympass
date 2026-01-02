import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { passAPI, PassType } from '../api/client';
import { colors } from '../theme/colors';
import { useGym } from '../context/GymContext';

export default function HomeScreen({ navigation }: any) {
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { selectedGym } = useGym();

  useEffect(() => {
    loadPassTypes();
  }, []);

  const loadPassTypes = async () => {
    try {
      const types = await passAPI.getPassTypes();
      setPassTypes(types);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pass types');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (passTypeId: string) => {
    setPurchasing(passTypeId);
    try {
      await passAPI.purchasePass(passTypeId);
      Alert.alert('Success', 'Pass purchased successfully!', [
        { text: 'View My Passes', onPress: () => navigation.navigate('MyPasses') },
        { text: 'OK' },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to purchase pass');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {selectedGym && (
        <View style={styles.gymBranding}>
          <Text style={styles.gymName}>{selectedGym.name}</Text>
        </View>
      )}
      
      {passTypes.map((passType) => (
        <View key={passType.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{passType.name}</Text>
            <Text style={styles.price}>${passType.price.toFixed(2)}</Text>
          </View>

          {passType.description && (
            <Text style={styles.description}>{passType.description}</Text>
          )}

          <View style={styles.details}>
            {passType.durationDays && (
              <Text style={styles.detailText}>Valid for {passType.durationDays} days</Text>
            )}
            {passType.totalEntries ? (
              <Text style={styles.detailText}>{passType.totalEntries} total entries</Text>
            ) : (
              <Text style={styles.detailText}>Unlimited entries</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.buyButton, purchasing === passType.id && styles.buyButtonDisabled]}
            onPress={() => handlePurchase(passType.id)}
            disabled={purchasing === passType.id}
          >
            <Text style={styles.buyButtonText}>
              {purchasing === passType.id ? 'Purchasing...' : 'Buy Now'}
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  gymBranding: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  gymName: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
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
});
