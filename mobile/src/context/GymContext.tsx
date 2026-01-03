import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_GYM_KEY = 'selectedGym';

export interface Gym {
  id: string;
  slug: string;
  name: string;
  city: string | null;
}

interface GymContextType {
  selectedGym: Gym | null;
  setSelectedGym: (gym: Gym) => Promise<void>;
  clearSelectedGym: () => Promise<void>;
  isLoading: boolean;
}

const GymContext = createContext<GymContextType>({
  selectedGym: null,
  setSelectedGym: async () => {},
  clearSelectedGym: async () => {},
  isLoading: true,
});

export function GymProvider({ children }: { children: React.ReactNode }) {
  const [selectedGym, setSelectedGymState] = useState<Gym | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load selected gym from storage on mount
  useEffect(() => {
    loadSelectedGym();
  }, []);

  const loadSelectedGym = async () => {
    try {
      const gymJson = await AsyncStorage.getItem(SELECTED_GYM_KEY);
      if (gymJson) {
        const gym = JSON.parse(gymJson);
        setSelectedGymState(gym);
      }
    } catch (error) {
      console.error('Failed to load selected gym:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedGym = async (gym: Gym) => {
    try {
      await AsyncStorage.setItem(SELECTED_GYM_KEY, JSON.stringify(gym));
      setSelectedGymState(gym);
    } catch (error) {
      console.error('Failed to save selected gym:', error);
      throw error;
    }
  };

  const clearSelectedGym = async () => {
    try {
      await AsyncStorage.removeItem(SELECTED_GYM_KEY);
      setSelectedGymState(null);
    } catch (error) {
      console.error('Failed to clear selected gym:', error);
      throw error;
    }
  };

  return (
    <GymContext.Provider value={{ selectedGym, setSelectedGym, clearSelectedGym, isLoading }}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  return useContext(GymContext);
}




