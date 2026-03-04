
"use client";

import { CheckCircle } from 'lucide-react';

const features = [
    "Atualizações semanais com novas produções.",
    "Comunidade e interação direta.",
    "Conteúdo exclusivo e sem censura.",
    "Acesso a vídeos e ensaios completos.",
];

const FeatureMarquee = () => (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-background via-card to-background py-6 mt-10 border-y border-primary/20">
        <div className="flex animate-marquee whitespace-nowrap">
            {features.map((feature, index) => (
                <span key={index} className="flex items-center mx-6 text-muted-foreground text-base md:text-lg font-medium">
                    <CheckCircle className="h-5 w-5 mr-3 text-primary" />
                    {feature}
                </span>
            ))}
            {features.map((feature, index) => (
                 <span key={`dup-${index}`} className="flex items-center mx-6 text-muted-foreground text-base md:text-lg font-medium" aria-hidden="true">
                    <CheckCircle className="h-5 w-5 mr-3 text-primary" />
                    {feature}
                </span>
            ))}
        </div>
    </div>
);

export default FeatureMarquee;
