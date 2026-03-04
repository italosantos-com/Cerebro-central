"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CornerDownRight, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper function to safely convert various timestamp types to a Date object
const toDateSafe = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  if (typeof timestamp === 'string') {
    // Attempt to parse string as a Date
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
    // Assume it's a Firebase Timestamp object
    return timestamp.toDate();
  }
  // If it's an object with 'seconds' and 'nanoseconds' like a Firestore Timestamp literal
  if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }
  return null;
};

interface Review {
  id: string;
  author: string;
  authorPhotoUrl?: string | null;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date | { toDate: () => Date } | { seconds: number, nanoseconds: number } | string | null;
  reply?: {
    author: string;
    text: string;
    isVerified: boolean;
    createdAt: Date | { toDate: () => Date } | { seconds: number, nanoseconds: number } | string | null;
  };
}

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const formatTimeAgo = (timestamp: Date | { toDate: () => Date } | { seconds: number, nanoseconds: number } | string | null) => {
    const date = toDateSafe(timestamp);
    if (!date) return 'há algum tempo';

    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: ptBR
    });
  };

  // Função para determinar a fonte do comentário baseado no conteúdo
  const getReviewSource = (authorName: string, text: string) => {
    const lowerAuthor = authorName.toLowerCase();
    const lowerText = text.toLowerCase();

    // Garoto Com Local - indicadores típicos
    if (lowerAuthor.includes('sp') || lowerAuthor.includes('rj') || lowerAuthor.includes('bh') ||
      lowerAuthor.includes('mg') || lowerAuthor.includes('pr') || lowerText.includes('garoto com local')) {
      return { name: 'Garoto Com Local', color: 'bg-green-500', icon: '🌐' };
    }
    // Portal do Cliente - nomes curtos ou conteúdo específico
    else if (authorName.length <= 3 || lowerText.includes('portal') || lowerText.includes('cliente') ||
      lowerAuthor.includes('anon') || lowerAuthor.includes('user')) {
      return { name: 'Portal do Cliente', color: 'bg-blue-500', icon: '👤' };
    }
    // Avaliação Direta - outros casos
    else {
      return { name: 'Avaliação Direta', color: 'bg-orange-500', icon: '📝' };
    }
  };

  const source = getReviewSource(review.author, review.text);

  return (
    <Card className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {source.name === 'Garoto Com Local' ? (
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-primary/20 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Garoto-com-local-icone.svg"
                alt="Garoto Com Local"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://placehold.co/48x48.png?text=GCL";
                }}
              />
            </div>
          ) : (
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              {review.authorPhotoUrl ? (
                <AvatarImage src={review.authorPhotoUrl} alt={review.author} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {review.author.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-foreground">{review.author}</h4>
                <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-full">
                  <div className={`w-2 h-2 ${source.color} rounded-full`}></div>
                  <span className="text-xs font-medium text-muted-foreground">{source.name}</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatTimeAgo(review.createdAt)}
              </span>
            </div>

            <p className="text-foreground/90 leading-relaxed">{review.text}</p>

            {review.reply && (
              <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-muted/20 rounded-r-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/logo.png" alt="Italo Santos" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      IS
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-primary">{review.reply.author}</span>
                    {review.reply.isVerified && (
                      <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-full">
                        <CornerDownRight className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-medium">Verificado</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(review.reply.createdAt)}
                  </span>
                </div>
                <p className="text-foreground/80 text-sm">{review.reply.text}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReviewsSectionProps {
  title?: string;
  maxReviews?: number;
  showOnlyApproved?: boolean;
  showStars?: boolean;
}

export default function ReviewsSection({
  title = "Comentários",
  maxReviews,
  showOnlyApproved = true,
  showStars = false,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = () => {
      setIsLoading(true);
      setError(null);

      console.log('[ReviewsSection] Starting fetch process...');

      if (!db) {
        console.error('[ReviewsSection] Firebase db not available');
        setError("Firebase não está configurado corretamente");
        setIsLoading(false);
        return () => { };
      }

      console.log('[ReviewsSection] Firebase db available, creating query...');

      try {
        const reviewsRef = collection(db, 'reviews');

        // Create query based on showOnlyApproved flag
        let q;
        if (showOnlyApproved) {
          // Try without orderBy first to avoid index issues
          q = query(reviewsRef, where('status', '==', 'approved'));
        } else {
          // Get all reviews without ordering
          q = query(reviewsRef);
        }

        console.log('[ReviewsSection] Query created, setting up listener...');

        const unsubscribe = onSnapshot(q,
          (querySnapshot) => {
            console.log('[ReviewsSection] Query snapshot received, docs count:', querySnapshot.size);
            console.log('[ReviewsSection] showOnlyApproved:', showOnlyApproved);

            // Log all docs found to debug
            querySnapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log('[ReviewsSection] Found doc:', doc.id, 'status:', data.status, 'author:', data.author);
            });

            if (querySnapshot.empty) {
              console.log('[ReviewsSection] No reviews found in database');
              console.log('[ReviewsSection] showOnlyApproved:', showOnlyApproved);
              if (showOnlyApproved) {
                console.log('[ReviewsSection] No approved reviews found. Try checking if there are any reviews with status "approved"');
              } else {
                console.log('[ReviewsSection] No reviews found at all in the database');
              }
              setReviews([]);
              setError(null);
              setIsLoading(false);
              return;
            }

            const fetchedReviews = querySnapshot.docs.map(doc => {
              const data = doc.data();
              console.log('[ReviewsSection] Processing doc:', doc.id, 'status:', data.status);
              return { id: doc.id, ...data } as Review;
            });

            // Sort by createdAt in JavaScript (newest first)
            const sortedReviews = fetchedReviews.sort((a, b) => {
              const dateA = toDateSafe(a.createdAt);
              const dateB = toDateSafe(b.createdAt);
              // Handle cases where date conversion might fail, placing null dates at the end
              if (!dateA && !dateB) return 0;
              if (!dateA) return 1;
              if (!dateB) return -1;
              return dateB.getTime() - dateA.getTime();
            });

            // Apply maxReviews limit if specified
            const limitedReviews = maxReviews ? sortedReviews.slice(0, maxReviews) : sortedReviews;

            console.log('[ReviewsSection] Successfully loaded reviews from database, count:', limitedReviews.length);
            setReviews(limitedReviews);
            setError(null);
            setIsLoading(false);
          },
          (error) => {
            console.error('[ReviewsSection] Query error:', error);
            console.error('[ReviewsSection] Error code:', error.code);
            console.error('[ReviewsSection] Error message:', error.message);

            let errorMessage = "Não foi possível carregar os comentários.";
            if (error.code === 'permission-denied') {
              errorMessage = "Permissão negada para acessar os comentários.";
              console.error('[ReviewsSection] Permission denied - check Firestore rules');
            } else if (error.code === 'unavailable') {
              errorMessage = "Serviço temporariamente indisponível.";
            }

            setReviews([]);
            setError(errorMessage);
            setIsLoading(false);
          }
        );

        return unsubscribe;
      } catch (queryError) {
        console.error('[ReviewsSection] Error creating query:', queryError);
        console.error('[ReviewsSection] Query error details:', queryError);

        // Try a simpler approach - just get all documents without any filters
        console.log('[ReviewsSection] Trying fallback approach without filters...');
        try {
          const simpleQuery = collection(db, 'reviews');
          const unsubscribe = onSnapshot(simpleQuery,
            (querySnapshot) => {
              console.log('[ReviewsSection] Fallback query successful, docs:', querySnapshot.size);

              if (querySnapshot.empty) {
                setReviews([]);
                setError(null);
                setIsLoading(false);
                return;
              }

              const allReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

              // Filter manually if needed
              const filteredReviews = showOnlyApproved
                ? allReviews.filter(review => review.status === 'approved')
                : allReviews;

              // Sort manually
              const sortedReviews = filteredReviews.sort((a, b) => {
                const dateA = toDateSafe(a.createdAt);
                const dateB = toDateSafe(b.createdAt);
                // Handle cases where date conversion might fail, placing null dates at the end
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateB.getTime() - dateA.getTime();
              });

              const limitedReviews = maxReviews ? sortedReviews.slice(0, maxReviews) : sortedReviews;

              setReviews(limitedReviews);
              setError(null);
              setIsLoading(false);
            },
            (fallbackError) => {
              console.error('[ReviewsSection] Even fallback failed:', fallbackError);
              setError("Não foi possível carregar os comentários.");
              setIsLoading(false);
            }
          );

          return unsubscribe;
        } catch (fallbackError) {
          console.error('[ReviewsSection] Fallback approach failed:', fallbackError);
          setError("Erro ao conectar com o banco de dados");
          setIsLoading(false);
          return () => { };
        }
      }
    };

    const unsubscribe = fetchReviews();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showOnlyApproved, maxReviews]);

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-normal text-foreground">{title}</h2>
        {showStars ? (
          <div className="mt-3 flex items-center justify-center gap-1 text-foreground" aria-hidden="true">
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
          </div>
        ) : null}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Carregando avaliações...
          </div>
        </div>
      )}

      {error && (
        <div className="flex justify-center items-center py-10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            {error}
          </div>
        </div>
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nenhuma avaliação encontrada.</p>
        </div>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <div className="flex flex-col items-center gap-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

        </div>
      )}
    </div>
  );
}
