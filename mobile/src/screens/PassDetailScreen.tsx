import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { passAPI, featuresAPI, UserPass, Features } from '../api/client';
import { getToken } from '../auth/storage';
import { API_BASE_URL } from '../api/config';
import { colors } from '../theme/colors';

export default function PassDetailScreen({ route, navigation }: any) {
  const { passId } = route.params;
  const [pass, setPass] = useState<UserPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [features, setFeatures] = useState<Features>({ appleWallet: false });

  useEffect(() => {
    loadPass();
    loadFeatures();
  }, [passId]);

  const loadPass = async () => {
    try {
      const passData = await passAPI.getPassById(passId);
      setPass(passData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pass');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    try {
      const featuresData = await featuresAPI.getFeatures();
      setFeatures(featuresData);
    } catch (error) {
      console.error('Failed to load features:', error);
      // Default to false on error (already set in initial state)
    }
  };

  const handleAddToWallet = async () => {
    if (!pass || !pass.token) {
      Alert.alert('Error', 'Pass token not available');
      return;
    }

    setDownloading(true);
    try {
      const token = await getToken();
      const url = `${API_BASE_URL}/api/passes/${pass.id}/wallet`;
      
      const fileUri = FileSystem.documentDirectory + `${pass.walletSerialNumber}.pkpass`;
      
      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (Platform.OS === 'ios') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/vnd.apple.pkpass',
            dialogTitle: 'Add to Apple Wallet',
          });
        } else {
          Alert.alert('Success', 'Pass downloaded. Open it to add to Wallet.');
        }
      } else {
        Alert.alert('Downloaded', 'Pass file downloaded to device');
      }
    } catch (error: any) {
      console.error('Wallet download error:', error);
      Alert.alert('Error', 'Failed to download wallet pass');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInSafari = () => {
    if (!pass) return;
    
    getToken().then((token) => {
      const url = `${API_BASE_URL}/api/passes/${pass.id}/wallet`;
      Linking.openURL(url);
    });
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
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!pass) {
    return (
      <View style={styles.centerContainer}>
        <Text>Pass not found</Text>
      </View>
    );
  }

  const qrContent = pass.token?.token ? `gympass://scan?token=${pass.token.token}` : '';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{pass.passType?.name || 'Pass'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pass.status) }]}>
          <Text style={styles.statusText}>{pass.status}</Text>
        </View>
      </View>

      <View style={styles.qrSection}>
        <Text style={styles.sectionTitle}>Scan this QR code at the gym</Text>
        {qrContent ? (
          <View style={styles.qrContainer}>
            <QRCode value={qrContent} size={250} />
          </View>
        ) : (
          <Text style={styles.errorText}>QR code not available</Text>
        )}
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Pass Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{pass.passType?.name}</Text>
        </View>

        {pass.validUntil && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valid Until:</Text>
            <Text style={styles.detailValue}>{formatDate(pass.validUntil)}</Text>
          </View>
        )}

        {pass.remainingEntries !== null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remaining Entries:</Text>
            <Text style={styles.detailValue}>
              {pass.remainingEntries} / {pass.totalEntries}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Purchased:</Text>
          <Text style={styles.detailValue}>{formatDate(pass.purchasedAt)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Serial Number:</Text>
          <Text style={styles.detailValue}>{pass.walletSerialNumber}</Text>
        </View>
      </View>

      {Platform.OS === 'ios' && pass.status === 'ACTIVE' && (
        <View style={styles.walletSection}>
          <Text style={styles.sectionTitle}>Apple Wallet</Text>
          
          {features.appleWallet ? (
            <>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Development passes may not install if unsigned. In production, ensure passes are properly signed with Apple certificates.
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.walletButton, downloading && styles.walletButtonDisabled]}
                onPress={handleAddToWallet}
                disabled={downloading}
              >
                <Text style={styles.walletButtonText}>
                  {downloading ? 'Downloading...' : 'Add to Apple Wallet'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleOpenInSafari}
              >
                <Text style={styles.linkText}>Or open wallet pass in browser</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.comingSoonText}>Coming soon...</Text>
          )}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  qrSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  detailsSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  walletSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
    padding: 20,
    marginBottom: 20,
  },
  warningBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    lineHeight: 18,
  },
  walletButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  walletButtonDisabled: {
    backgroundColor: colors.border,
  },
  walletButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: colors.secondary,
    fontSize: 14,
  },
  comingSoonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});
