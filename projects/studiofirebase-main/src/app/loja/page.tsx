"use client";

import { useState, useEffect, useMemo } from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, AlertCircle, Lock, Eye, Play } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { SmartVideoThumbnail } from '@/components/smart-video-player';
import UnlockPaymentOptionsModal from '@/components/unlock-payment-options-modal';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Badge } from '@/components/ui/badge';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl?: string;
  type?: 'photo' | 'video';
  status: 'active' | 'inactive';
  sales?: number;
  createdAt?: any;
  sellerId?: string; // ID do usuário que está vendendo o produto
  storageType?: string;
}

function LojaPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(new Set());
  const [playingProductId, setPlayingProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { currency, baseAmount } = useLocalization();

  // Razão de conversão baseada no valor de assinatura (baseAmount)
  const conversionRatio = useMemo(() => {
    if (!baseAmount || baseAmount <= 0) return 1;
    if (currency.currencyCode === 'BRL') return 1;
    return currency.amount / baseAmount;
  }, [currency.amount, currency.currencyCode, baseAmount]);

  // Buscar produtos da loja
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Determinar sellerId com base no username da URL
        let sellerIdParam = '';
        if (typeof window !== 'undefined') {
          const username = getPublicUsernameFromPathname(window.location.pathname);
          if (username && !isSuperAdminUsername(username)) {
            const adminUid = await resolveAdminUidByUsername(username);
            if (!adminUid) {
              setProducts([]);
              setIsLoading(false);
              return;
            }
            sellerIdParam = adminUid;
          }
        }

        const url = sellerIdParam
          ? `/api/admin/products?sellerId=${encodeURIComponent(sellerIdParam)}`
          : '/api/admin/products';
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          const activeProducts = (data.products || []).filter((p: Product) => p.status === 'active' && p.videoUrl);
          setProducts(activeProducts);
        } else {
          toast({ variant: "destructive", title: "Erro ao carregar a loja", description: data.message });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Erro de rede", description: "Não foi possível buscar os produtos." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [toast]);

  // Buscar compras do usuário
  useEffect(() => {
    const fetchUserPurchases = async () => {
      if (!user?.uid) {
        setPurchasedProducts(new Set());
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setPurchasedProducts(new Set(userDoc.data().purchasedProducts || []));
        }
      } catch (error) {
        console.error("Erro ao buscar compras do usuário: ", error);
      }
    };
    fetchUserPurchases();
  }, [user?.uid]);

  useEffect(() => {
    const attemptInit = () => {
      if (typeof window === 'undefined') return false;
      const cartPaypal = (window as any).cartPaypal;
      if (cartPaypal?.Cart && cartPaypal?.AddToCart) {
        try {
          cartPaypal.Cart({ id: 'pp-view-cart' });
          // Inicializar AddToCart para cada produto
          products.forEach(() => {
            cartPaypal.AddToCart({ id: 'M9FD9WDBYEBG8' });
          });
        } catch (error) {
          console.error('Erro ao inicializar PayPal Cart/AddToCart', error);
        }
        return true;
      }
      return false;
    };

    if (attemptInit()) {
      return;
    }

    const interval = setInterval(() => {
      if (attemptInit()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [products]);

  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    if (!user) {
      toast({ title: "Login necessário", description: "Você precisa estar logado para visualizar produtos.", variant: "destructive" });
      router.push('/auth/face');
      return;
    }
    if (purchasedProducts.has(product.id)) {
      setPlayingProductId(playingProductId === product.id ? null : product.id);
    } else {
      setModalProduct(product);
    }
  };

  const handlePurchaseSuccess = (productId: string, payer: any) => {
    const newPurchased = new Set(purchasedProducts);
    newPurchased.add(productId);
    setPurchasedProducts(newPurchased);
    setModalProduct(null);

    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedProducts = products.map(p =>
        p.id === productId ? { ...p, sales: (p.sales || 0) + 1 } : p
      );
      setProducts(updatedProducts);
      setPlayingProductId(productId); // Auto-play
    }

    toast({
      title: "Compra Aprovada!",
      description: `Obrigado, ${payer?.name?.given_name || 'Cliente'}! O vídeo é seu.`
    });
  };

  return (
    <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
      {/* Modal de pagamento centralizado */}
      {modalProduct && (
        <UnlockPaymentOptionsModal
          isOpen={!!modalProduct}
          onClose={() => setModalProduct(null)}
          amount={modalProduct.price}
          currency={currency.currencyCode}
          symbol={currency.currencySymbol}
          title={modalProduct.name}
          onPaymentSuccess={(method) => handlePurchaseSuccess(modalProduct.id, user)}
        />
      )}
      <CardHeader className="flex-row items-center justify-between border-b border-primary/20 pb-4">
          <CardTitle className="text-3xl text-white text-center flex-1">Loja</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-12">
        <div>
          <CardTitle className="text-2xl text-white flex items-center gap-3 mb-4">
            <ShoppingCart /> Produtos da Loja
          </CardTitle>
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden bg-card/50 border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all duration-300 flex flex-col group">
                  <CardHeader className="p-0">
                    <div className="relative aspect-video group">
                      {playingProductId === product.id && purchasedProducts.has(product.id) ? (
                        <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                          <video src={product.videoUrl} controls autoPlay muted playsInline className="w-full h-full object-contain" onEnded={() => setPlayingProductId(null)} />
                        </div>
                      ) : (
                        <>
                          {product.videoUrl ? (
                            <SmartVideoThumbnail url={product.videoUrl} title={product.name} className="aspect-video" onClick={() => handleProductClick(product)} />
                          ) : (
                            <div className="aspect-video bg-muted flex items-center justify-center cursor-pointer" onClick={() => handleProductClick(product)}><Play className="w-12 h-12 text-muted-foreground" /></div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="p-2" onClick={() => handleProductClick(product)}>
                              {purchasedProducts.has(product.id) ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="absolute top-2 left-2">
                            <Badge variant={purchasedProducts.has(product.id) ? 'default' : 'secondary'}>
                              {purchasedProducts.has(product.id) ? '✓ Comprado' : 'Bloqueado'}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{product.description}</CardDescription>
                    <div className="mt-2 space-y-1">
                      <p className="text-primary font-semibold text-xl">
                        {(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      {currency.currencyCode !== 'BRL' && (
                        <p className="text-sm text-muted-foreground">
                          ≈ {currency.currencySymbol}{(product.price * conversionRatio).toFixed(2)} {currency.currencyCode}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 mt-auto">
                    <div className="w-full space-y-2 flex flex-col items-center">
                      {purchasedProducts.has(product.id) ? (
                        <div className="w-full text-center p-3 bg-green-500/10 rounded-lg"><p className="text-green-600 font-medium">✓ Produto Comprado</p></div>
                      ) : (
                        <Button className="w-full" variant="default" onClick={() => handleProductClick(product)}>
                          Comprar / Desbloquear
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-xl">Nenhum produto disponível.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LojaPage() {
  return (
    <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
      <LojaPageContent />
    </main>
  );
}
