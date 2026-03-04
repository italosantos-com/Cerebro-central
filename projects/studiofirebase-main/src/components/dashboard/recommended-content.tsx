import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Play } from 'lucide-react';
import Image from 'next/image';

interface RecommendedItem {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  creator: string;
  rating: number;
  category: string;
}

interface RecommendedContentProps {
  items: RecommendedItem[];
  onBuyClick?: (id: string) => void;
  isLoading?: boolean;
}

export function RecommendedContent({ items, onBuyClick, isLoading = false }: RecommendedContentProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recomendado Para Você
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⭐ Recomendado Para Você
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhuma recomendação disponível.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-lg overflow-hidden border border-border/50 hover:border-primary hover:shadow-lg transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video overflow-hidden bg-muted">
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.rating > 0 && (
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-bold text-yellow-400 flex items-center gap-1">
                      ⭐ {item.rating}
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.creator}</span>
                    <span className="bg-muted px-2 py-1 rounded">{item.category}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.price)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onBuyClick?.(item.id)}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Zap } from 'lucide-react';
