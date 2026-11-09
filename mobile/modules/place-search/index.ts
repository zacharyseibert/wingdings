import { requireNativeModule } from 'expo-modules-core';

export interface NativePlace {
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  distance: number | null;
}

const PlaceSearch = requireNativeModule<{
  nearby(lat: number, lng: number, radiusMeters: number): Promise<NativePlace[]>;
  search(query: string, lat: number | null, lng: number | null): Promise<NativePlace[]>;
}>('PlaceSearch');

export default PlaceSearch;
