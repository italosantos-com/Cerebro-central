
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ThumbsUp, ThumbsDown, MessageCircle, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllReviews, updateReviewStatus, deleteReview, approveAllPendingReviews, type Review } from './actions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);


  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedReviews = await getAllReviews();
      setReviews(fetchedReviews);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar avaliações',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleUpdateStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    setUpdatingId(reviewId);
    try {
      const result = await updateReviewStatus(reviewId, status);
      if (result.success) {
        toast({
          title: 'Status Atualizado!',
          description: result.message,
        });
        // Optimistically update UI
        setReviews(prevReviews =>
          prevReviews.map(review =>
            review.id === reviewId ? { ...review, status } : review
          )
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string, author: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o comentário de "${author}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setUpdatingId(reviewId);
    try {
      const result = await deleteReview(reviewId);
      if (result.success) {
        toast({
          title: 'Comentário Excluído!',
          description: result.message,
        });
        // Remove from UI
        setReviews(prevReviews =>
          prevReviews.filter(review => review.id !== reviewId)
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir comentário',
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveAllPending = async () => {
    const confirmed = confirm('Deseja aprovar TODOS os comentários pendentes? Eles aparecerão na página inicial.');
    if (!confirmed) return;

    setIsApprovingAll(true);
    try {
      const result = await approveAllPendingReviews();
      if (result.success) {
        toast({
          title: 'Reviews Aprovados!',
          description: result.message,
        });
        // Recarregar a lista de comentários
        fetchReviews();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar reviews',
        description: error.message,
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  const getStatusVariant = (status: Review['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: Review['status']): string => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
      default:
        return 'Pendente';
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Moderação de Avaliações</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Gerenciar Comentários</CardTitle>
              <CardDescription>
                Aprove, rejeite ou exclua permanentemente os comentários deixados pelos visitantes no seu site.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleApproveAllPending}
              disabled={isApprovingAll || isLoading}
              className="flex w-full items-center justify-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 sm:w-auto"
            >
              {isApprovingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              Aprovar Todos Pendentes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[720px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Autor</TableHead>
                      <TableHead>Comentário</TableHead>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="text-right w-[200px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          Nenhuma avaliação encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.author}</TableCell>
                          <TableCell className="text-muted-foreground">{review.text}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(review.status)}>
                              {getStatusText(review.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {updatingId === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                            ) : (
                              <div className="flex flex-wrap justify-end gap-2">
                                {review.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white"
                                      onClick={() => handleUpdateStatus(review.id, 'approved')}
                                    >
                                      <ThumbsUp className="h-4 w-4 mr-1" /> Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                                      onClick={() => handleUpdateStatus(review.id, 'rejected')}
                                    >
                                      <ThumbsDown className="h-4 w-4 mr-1" /> Rejeitar
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                  onClick={() => handleDeleteReview(review.id, review.author)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
