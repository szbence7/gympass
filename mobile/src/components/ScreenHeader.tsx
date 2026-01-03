import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGym } from '../context/GymContext';
import { computeGymOpenStatus, getStatusText, getStatusColor } from '../utils/openingHours';
import { colors } from '../theme/colors';

interface ScreenHeaderProps {
  title: string;
  showGymStatus?: boolean;
}

export default function ScreenHeader({ title, showGymStatus = true }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { selectedGym } = useGym();

  return (
    <>
      {/* Fixed top header with gym status */}
      {showGymStatus && selectedGym && (
        <View style={[styles.topHeader, { paddingTop: 4 }]}>
          <View style={styles.gymStatusRow}>
            {selectedGym.openingHours ? (() => {
              const status = computeGymOpenStatus(selectedGym.openingHours);
              return (
                <>
                  <Text style={styles.gymStatusText}>
                    {selectedGym.name} - {getStatusText(status)}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                </>
              );
            })() : (
              <Text style={styles.gymStatusText}>{selectedGym.name}</Text>
            )}
          </View>
        </View>
      )}

      {/* Large page title */}
      <Text style={styles.pageTitle}>{title}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  gymStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  gymStatusText: {
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
  pageTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
});

