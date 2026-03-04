// Types para integração com Airbnb
export interface AirbnbListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  images: string[];
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  rating: number;
  reviewCount: number;
  host: {
    id: string;
    name: string;
    avatar: string;
    isSuperhost: boolean;
  };
  availability: {
    checkin: string;
    checkout: string;
    minNights: number;
    maxNights: number;
  };
  rules: string[];
  coordinates: [number, number];
}

export interface AirbnbSearchParams {
  location?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  amenities?: string[];
  instantBook?: boolean;
}

export interface AirbnbBookingRequest {
  listingId: string;
  checkin: string;
  checkout: string;
  guests: number;
  message?: string;
}

export interface AirbnbApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
