/**
 * Geocoding utility for converting coordinates to addresses
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * For production with high volume, consider Google Maps Geocoding API
 */

interface GeocodingResult {
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Convert latitude and longitude to a human-readable address
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted address string or null if failed
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    // Use OpenStreetMap Nominatim for free geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StudioFirebase/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status);
      return null;
    }

    const data: GeocodingResult = await response.json();

    // Format address from components
    if (data.address) {
      const parts: string[] = [];
      
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb) parts.push(data.address.suburb);
      if (data.address.city || data.address.town || data.address.village) {
        const city = data.address.city || data.address.town || data.address.village;
        if (city) parts.push(city);
      }
      if (data.address.state) parts.push(data.address.state);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    // Fallback to display_name
    return data.display_name || null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
}

/**
 * Alternative implementation using Google Maps Geocoding API
 * Uncomment and use this if you have a Google Maps API key
 * 
 * export async function reverseGeocodeGoogle(lat: number, lng: number): Promise<string | null> {
 *   const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
 *   
 *   if (!apiKey) {
 *     console.error('Google Maps API key not configured');
 *     return null;
 *   }
 *   
 *   try {
 *     const response = await fetch(
 *       `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
 *     );
 *     
 *     if (!response.ok) {
 *       return null;
 *     }
 *     
 *     const data = await response.json();
 *     return data.results[0]?.formatted_address || null;
 *   } catch (error) {
 *     console.error('Error in Google reverse geocoding:', error);
 *     return null;
 *   }
 * }
 */
