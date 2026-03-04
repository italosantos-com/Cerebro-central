"use client";

import Image from 'next/image';
import { Star } from 'lucide-react';

interface AppearanceSettings {
    textColor?: string;
    numberColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    lineColor?: string;
    neonGlowColor?: string;
    containerColor?: string;
    backgroundColor?: string;
    iconColor?: string;
    fontFamily?: string;
    fontSizePx?: number;
}

interface HomePagePreviewProps {
    appearanceSettings?: AppearanceSettings;
    name?: string;
    coverPhotoUrl?: string;
    profilePhotoUrl?: string;
}

const PREVIEW_PRICE = "99.00";
const PREVIEW_CURRENCY = "R$";

export default function HomePagePreview({
    appearanceSettings,
    name = "Seu Nome",
    coverPhotoUrl,
    profilePhotoUrl = "/placeholder-photo.svg"
}: HomePagePreviewProps) {
    const textColor = appearanceSettings?.textColor || '#ffffff';
    const numberColor = appearanceSettings?.numberColor || '#ffffff';
    const buttonColor = appearanceSettings?.buttonColor || '#ffffff';
    const buttonTextColor = appearanceSettings?.buttonTextColor || '#000000';
    const neonGlowColor = appearanceSettings?.neonGlowColor || '#ffffff';
    const containerColor = appearanceSettings?.containerColor || '#111111';
    const backgroundColor = appearanceSettings?.backgroundColor || '#000000';
    const iconColor = appearanceSettings?.iconColor || '#ffffff';
    const fontFamily = appearanceSettings?.fontFamily || '"Times New Roman", Times, serif';

    return (
        <div
            className="w-full border-2 rounded-lg overflow-hidden shadow-lg"
            style={{
                borderColor: neonGlowColor,
                boxShadow: `0 0 10px ${neonGlowColor}33`
            }}
        >
            {/* Preview Header */}
            <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                Preview da Página Inicial
            </div>

            {/* Miniature home page */}
            <div
                className="relative overflow-hidden"
                style={{ backgroundColor }}
            >
                {/* Hero Section */}
                <div
                    className="relative w-full h-32 flex items-center justify-center"
                    style={{ backgroundColor: containerColor }}
                >
                    {coverPhotoUrl ? (
                        <Image
                            src={coverPhotoUrl}
                            alt="Cover preview"
                            fill
                            className="opacity-60 object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 opacity-60" />
                    )}

                    {/* Circular profile photo in the center */}
                    <div className="absolute z-20 rounded-full overflow-hidden border-2 border-white shadow-lg w-16 h-16 sm:w-20 sm:h-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Image
                            src={profilePhotoUrl}
                            alt="Profile preview"
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>

                    <h1
                        className="relative z-10 text-2xl font-bold text-center px-2"
                        style={{
                            fontFamily,
                            color: textColor,
                            textShadow: `0 0 4px ${neonGlowColor}, 0 0 8px ${neonGlowColor}, 0 0 12px ${neonGlowColor}`,
                            filter: `drop-shadow(0 0 6px ${neonGlowColor})`
                        }}
                    >
                        {name}
                    </h1>
                </div>

                {/* Main Content */}
                <div className="flex flex-col items-center px-4 py-6 space-y-3">
                    {/* Primary Button */}
                    <button
                        className="w-full max-w-xs h-10 text-sm font-semibold rounded-md flex items-center justify-center transition-transform hover:scale-105"
                        style={{
                            backgroundColor: buttonColor,
                            color: buttonTextColor,
                            boxShadow: `0 0 6px ${neonGlowColor}, 0 0 12px ${neonGlowColor}`
                        }}
                    >
                        Cadastre-se Agora
                    </button>

                    {/* Payment Icons Row */}
                    <div className="flex items-center gap-2 w-full max-w-xs">
                        <div className="flex-1 bg-muted/50 h-12 rounded flex items-center justify-center gap-1">
                            <span
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    background: 'linear-gradient(90deg, #4285F4 0%, #4285F4 25%, #34A853 25%, #34A853 50%, #FBBC05 50%, #FBBC05 75%, #EA4335 75%, #EA4335 100%)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                G
                            </span>
                            <span className="text-xs font-semibold opacity-80">Pay</span>
                        </div>
                        <div className="bg-muted/50 h-12 w-12 rounded flex items-center justify-center">
                            <span className="text-[10px] font-semibold opacity-70">PIX</span>
                        </div>
                        <div className="flex-1 bg-muted/50 h-12 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold opacity-80">Apple</span>
                        </div>
                    </div>

                    {/* Price Display */}
                    <div className="text-center py-2">
                        <p className="text-xs mb-1" style={{ color: textColor }}>
                            Assinatura Mensal
                        </p>
                        <p className="text-4xl font-bold leading-none" style={{ color: numberColor }}>
                            <span>{PREVIEW_PRICE.split('.')[0]}</span>
                            <span className="text-xl align-top">.{PREVIEW_PRICE.split('.')[1]}</span>
                            <span className="text-base font-normal align-top ml-1">{PREVIEW_CURRENCY}</span>
                        </p>
                    </div>

                    {/* Security Badge */}
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{
                            backgroundColor: containerColor,
                            borderColor: neonGlowColor + '50'
                        }}
                    >
                        <Star className="h-4 w-4" style={{ color: iconColor }} />
                        <div>
                            <p className="text-[10px] font-semibold" style={{ color: textColor }}>
                                Pagamento Seguro
                            </p>
                            <p className="text-[8px] opacity-70" style={{ color: textColor }}>
                                Seus dados protegidos
                            </p>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        className="w-full max-w-xs h-8 text-xs rounded-md border transition-transform hover:scale-105"
                        style={{
                            borderColor: neonGlowColor,
                            color: textColor,
                            backgroundColor: containerColor
                        }}
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>
    );
}
