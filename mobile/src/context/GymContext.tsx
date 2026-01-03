import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

const SELECTED_GYM_KEY = 'selectedGym';

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
}

export interface Gym {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  openingHours?: OpeningHours | null;
}

interface GymContextType {
  selectedGym: Gym | null;
  setSelectedGym: (gym: Gym) => Promise<void>;
  clearSelectedGym: () => Promise<void>;
  refreshGymData: () => Promise<void>;
  isLoading: boolean;
}

const GymContext = createContext<GymContextType>({
  selectedGym: null,
  setSelectedGym: async () => {},
  clearSelectedGym: async () => {},
  refreshGymData: async () => {},
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
        
        // If gym doesn't have openingHours (missing, null, or undefined), refresh from backend
        if (gym.openingHours === undefined || gym.openingHours === null) {
          try {
            const response = await axios.get(`${API_BASE_URL}/api/public/gyms`);
            const gyms = response.data;
            const updatedGym = gyms.find((g: Gym) => g.id === gym.id);
            if (updatedGym) {
              // Update gym with latest data (including openingHours, even if null)
              const refreshedGym = { ...gym, openingHours: updatedGym.openingHours };
              await AsyncStorage.setItem(SELECTED_GYM_KEY, JSON.stringify(refreshedGym));
              setSelectedGymState(refreshedGym);
            } else {
              setSelectedGymState(gym);
            }
          } catch (refreshError) {
            console.error('Failed to refresh gym data:', refreshError);
            // Use existing gym data even if refresh fails
            setSelectedGymState(gym);
          }
        } else {
          setSelectedGymState(gym);
        }
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

  const refreshGymData = async () => {
    if (!selectedGym) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/public/gyms`);
      const gyms = response.data;
      const updatedGym = gyms.find((g: Gym) => g.id === selectedGym.id);
      if (updatedGym) {
        // Update gym with latest data (especially openingHours)
        const refreshedGym = { ...selectedGym, openingHours: updatedGym.openingHours };
        await AsyncStorage.setItem(SELECTED_GYM_KEY, JSON.stringify(refreshedGym));
        setSelectedGymState(refreshedGym);
      }
    } catch (error) {
      console.error('Failed to refresh gym data:', error);
      // Silently fail - don't break the app
    }
  };

  return (
    <GymContext.Provider value={{ selectedGym, setSelectedGym, clearSelectedGym, refreshGymData, isLoading }}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  return useContext(GymContext);
}




