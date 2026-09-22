// src/services/locationService.ts
import * as Location from 'expo-location';

export interface NearbyResource {
  name: string;
  type: 'hospital' | 'pharmacy' | 'clinic' | 'support_center';
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

// Mock nearby support resources (in production, use Google Places API)
export const getNearbyResources = async (): Promise<NearbyResource[]> => {
  const location = await getCurrentLocation();
  if (!location) return getMockResources();

  // In a real app, call Google Places API with location.coords
  return getMockResources();
};

const getMockResources = (): NearbyResource[] => [
  { name: 'City Medical Centre', type: 'clinic', distance: '0.8 km', address: '12 Main Rd' },
  { name: 'LifeLine Pharmacy', type: 'pharmacy', distance: '1.2 km', address: '45 Oak Ave' },
  { name: 'Cognitive Support Centre', type: 'support_center', distance: '2.1 km', address: '8 Palm St' },
  { name: 'Regional Hospital', type: 'hospital', distance: '3.4 km', address: '1 Hospital Dr' },
];
