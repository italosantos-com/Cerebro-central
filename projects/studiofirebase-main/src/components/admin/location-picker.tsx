'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onLocationChange: (location: LocationData | null) => void;
  currentLocation?: LocationData | null;
}

export function LocationPicker({ onLocationChange, currentLocation }: LocationPickerProps) {
  const [location, setLocation] = useState<LocationData | null>(currentLocation || null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const lastGeocodingRequestRef = useRef<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (currentLocation) {
      setLocation(currentLocation);
    }
  }, [currentLocation]);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Try to get location name from reverse geocoding
      try {
        // Rate limiting: ensure at least 1 second between requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastGeocodingRequestRef.current;
        if (timeSinceLastRequest < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
        }
        lastGeocodingRequestRef.current = Date.now();

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'AdminUpdatesApp/1.0',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const locationName = 
            data.address?.road || 
            data.address?.suburb || 
            data.address?.city || 
            data.address?.town || 
            data.display_name?.split(',')[0] ||
            'Localização Atual';

          const newLocation: LocationData = {
            name: locationName,
            latitude,
            longitude,
          };

          setLocation(newLocation);
          onLocationChange(newLocation);

          toast({
            title: 'Localização obtida!',
            description: `📍 ${locationName}`,
          });
        } else {
          throw new Error('Reverse geocoding failed');
        }
      } catch (geocodingError) {
        // Fallback to basic location without name
        const newLocation: LocationData = {
          name: 'Localização Atual',
          latitude,
          longitude,
        };

        setLocation(newLocation);
        onLocationChange(newLocation);

        toast({
          title: 'Localização obtida!',
          description: `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao obter localização',
        description: 'Não foi possível acessar sua localização. Verifique as permissões.',
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const setCustomLocation = () => {
    if (!customLocationName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome inválido',
        description: 'Digite um nome para a localização',
      });
      return;
    }

    const newLocation: LocationData = {
      name: customLocationName,
      latitude: 0,
      longitude: 0,
    };

    setLocation(newLocation);
    onLocationChange(newLocation);
    setShowCustomInput(false);
    setCustomLocationName('');

    toast({
      title: 'Localização definida!',
      description: `📍 ${customLocationName}`,
    });
  };

  const removeLocation = () => {
    setLocation(null);
    onLocationChange(null);
  };

  return (
    <div className="space-y-3">
      {location ? (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">{location.name}</p>
            {location.latitude !== 0 && location.longitude !== 0 && (
              <p className="text-xs text-blue-600">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={removeLocation}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Obtendo...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Marcar Localização
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              Digite Manualmente
            </Button>
          </div>

          {showCustomInput && (
            <div className="flex gap-2">
              <Input
                placeholder="Ex: São Paulo - SP"
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setCustomLocation();
                  }
                }}
              />
              <Button type="button" onClick={setCustomLocation}>
                Adicionar
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Marque onde você está ou adicione uma localização personalizada
      </p>
    </div>
  );
}
