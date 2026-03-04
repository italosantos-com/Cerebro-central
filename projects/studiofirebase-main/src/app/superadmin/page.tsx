"use client";

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Users, ShieldCheck, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalAdmins: number;
}

/**
 * Painel global do superadmin.
 *
 * Exibe uma visão consolidada de todos os administradores registrados
 * no sistema e fornece acesso rápido às principais funcionalidades globais.
 */
export default function SuperAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        setStats({ totalAdmins: adminsSnap.size });
      } catch (err) {
        console.error('[SuperAdmin] Erro ao carregar estatísticas:', err);
        setStats({ totalAdmins: 0 });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Painel SuperAdmin</h1>
      </div>

      {currentUid && (
        <p className="text-sm text-muted-foreground">
          Autenticado como <span className="font-mono">{currentUid}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Admins</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalAdmins ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acesso Global</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesso irrestrito ao Firestore via role <span className="font-mono">superadmin</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
