// src/services/locationService.ts
import * as Location from 'expo-location';

export interface NearbyResource {
  name: string;
  type: 'disability_unit' | 'learning_centre' | 'educational_psychologist' | 'tutoring_centre';
  distance: string;
  address: string;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return null;
  }
};

export const getLocationAddress = async (): Promise<string | null> => {
  try {
    const location = await getCurrentLocation();
    if (!location) return null;
    const [address] = await Location.reverseGeocodeAsync(location.coords);
    if (!address) return null;
    return `${address.city ?? ''}, ${address.region ?? ''}`.trim().replace(/^,|,$/g, '');
  } catch {
    return null;
  }
};

// Mock nearby academic/dyslexia support resources (in production, use Google Places
// API or a curated list of your institution's Disability Unit / partner centres).
export const getNearbyResources = async (): Promise<NearbyResource[]> => {
  const location = await getCurrentLocation();
  if (!location) return getMockResources();

  // In a real app, call Google Places API (or a campus directory) with location.coords
  return getMockResources();
};

const getMockResources = (): NearbyResource[] => [
  { name: 'Campus Disability Unit', type: 'disability_unit', distance: '0.5 km', address: 'Student Services Building' },
  { name: 'Academic Learning Support Centre', type: 'learning_centre', distance: '0.9 km', address: '3 Library Rd' },
  { name: 'Educational Psychology Practice', type: 'educational_psychologist', distance: '2.3 km', address: '17 Oak Ave' },
  { name: 'Peer Tutoring Centre', type: 'tutoring_centre', distance: '1.1 km', address: 'Student Union, Floor 2' },
];
