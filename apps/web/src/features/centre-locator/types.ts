export type CategoryKey = 'csc' | 'agri' | 'govt' | 'health' | 'post';

export interface CategoryInfo {
  label: string;
  short: string;
  color: string;
  glyph: string;
}

export interface SchemeInfo {
  id: string;
  name: string;
  help: string;
  relevant: CategoryKey[];
}

export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
  importance?: number;
  pin?: boolean;
  typed?: string | null;
}

export interface CentreItem {
  id: string;
  name: string;
  category: CategoryKey;
  classificationNote?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  externalPlaceId: string;
  supportedServices?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  verificationStatus: 'osm_listed' | 'verified' | 'pending' | 'unverified';
  lastVerified?: string | null;
  dist?: number | null;
}

export interface GeocodeHit {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  address?: {
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: any;
  };
}

