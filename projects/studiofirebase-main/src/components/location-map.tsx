"use client";

import { useProfileSettings } from '@/hooks/use-profile-settings';

const LocationMap = () => {
    const { settings: adminSettings } = useProfileSettings();

    // Só renderiza se houver endereço configurado
    if (!adminSettings?.address) {
        return null;
    }

    const getGoogleMapsUrl = (address: string) => {
        const encodedAddress = encodeURIComponent(address);
        return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    return (
        <div className="w-full py-10 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-8">
                    <h3 className="text-3xl md:text-4xl font-bold text-primary mb-3">📍 Localização</h3>
                    <p className="text-muted-foreground text-lg">Me encontre no mapa</p>
                </div>
                
                <div className="w-full max-w-4xl mx-auto">
                    <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden shadow-lg border border-primary/30">
                        <iframe
                            src={getGoogleMapsUrl(adminSettings.address)}
                            className="absolute top-0 left-0 w-full h-full"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Localização"
                        />
                    </div>
                    
                    {/* Endereço em texto */}
                    <div className="mt-6 text-center">
                        <p className="text-muted-foreground text-base md:text-lg">
                            <span className="font-semibold text-primary">Endereço:</span> {adminSettings.address}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationMap;
