/**
 * EXEMPLO DE USO: Sistema isAdmin
 * 
 * Demonstra como usar o sistema de administradores
 * em diferentes partes da aplicação
 */

// ============================================
// 1. PROTEGER UMA PÁGINA ADMIN (Server Component)
// ============================================

// src/app/admin/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
    // Verificar admin no servidor
    const session = cookies().get('admin_session');

    if (!session) {
        redirect('/admin/login');
    }

    return (
        <div>
        <h1>Dashboard Admin </h1>
    {/* Seu conteúdo aqui */ }
    </div>
  );
}

// ============================================
// 2. PROTEGER COMPONENTE CLIENT-SIDE
// ============================================

// src/components/admin/protected-panel.tsx
'use client';

import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function ProtectedPanel() {
    const { isAdmin, loading, error } = useIsAdmin();

    if (loading) {
        return <div>Verificando permissões...</div>;
    }

    if (error) {
        return <div>Erro: { error } </div>;
    }

    if (!isAdmin) {
        return <div>Acesso negado.Você não é administrador.</div>;
    }

    return (
        <div>
        <h2>Painel Administrativo </h2>
            < p > Bem - vindo, administrador! </p>
    {/* Conteúdo protegido */ }
    </div>
  );
}

// ============================================
// 3. USAR HOC PARA PROTEGER COMPONENTE
// ============================================

// src/components/admin/settings.tsx
'use client';

import { withAdminAuth } from '@/hooks/useIsAdmin';

function AdminSettings() {
    return (
        <div>
        <h2>Configurações Administrativas </h2>
            < p > Este componente só é renderizado para admins </p>
                </div>
  );
}

// Exportar componente protegido
export default withAdminAuth(AdminSettings);

// ============================================
// 4. PROTEGER PÁGINA COM REDIRECIONAMENTO AUTOMÁTICO
// ============================================

// src/app/admin/users/page.tsx
'use client';

import { useRequireAdmin } from '@/hooks/useIsAdmin';

export default function UsersPage() {
    const { isAdmin, loading, shouldRedirect } = useRequireAdmin('/');

    if (loading) {
        return <div>Carregando...</div>;
    }

    if (shouldRedirect) {
        return <div>Redirecionando...</div>;
    }

    return (
        <div>
        <h1>Gerenciar Usuários </h1>
    {/* Lista de usuários */ }
    </div>
  );
}

// ============================================
// 5. VERIFICAR ADMIN EM API ROUTE
// ============================================

// src/app/api/admin/delete-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function DELETE(req: NextRequest) {
    try {
        // Obter token
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verificar token e custom claim
        const auth = getAuth(getAdminApp());
        const decodedToken = await auth.verifyIdToken(idToken);

        // Verificar se é admin
        if (!decodedToken.admin) {
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores.' },
                { status: 403 }
            );
        }

        // Continuar com operação administrativa
        const { userId } = await req.json();

        await auth.deleteUser(userId);

        return NextResponse.json({
            success: true,
            message: 'Usuário deletado com sucesso'
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// ============================================
// 6. CHAMAR CLOUD FUNCTION PARA VERIFICAR ADMIN
// ============================================

// src/services/admin-service.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

const functions = getFunctions(app);

// Verificar se usuário é admin via Cloud Function
export async function checkIsAdminViaFunction() {
    const isAdminFunction = httpsCallable(functions, 'isAdmin');

    try {
        const result = await isAdminFunction();
        return result.data as {
            isAdmin: boolean;
            hasCustomClaim: boolean;
            inAdminCollection: boolean;
        };
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        return { isAdmin: false, hasCustomClaim: false, inAdminCollection: false };
    }
}

// Setar custom claim via Cloud Function (requer ser admin)
export async function setAdminClaimViaFunction(uid: string) {
    const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');

    try {
        const result = await setAdminClaimFunction({ uid });
        return result.data as { success: boolean; message: string };
    } catch (error: any) {
        console.error('Erro ao setar claim:', error);
        throw new Error(error.message);
    }
}

// Listar todos os admins (requer ser admin)
export async function getAllAdminsViaFunction() {
    const getAllAdminsFunction = httpsCallable(functions, 'getAllAdmins');

    try {
        const result = await getAllAdminsFunction();
        return result.data as { success: boolean; admins: any[] };
    } catch (error: any) {
        console.error('Erro ao listar admins:', error);
        throw new Error(error.message);
    }
}

// ============================================
// 7. COMPONENTE COM NÍVEIS DE PERMISSÃO
// ============================================

// src/components/admin/role-based-content.tsx
'use client';

import { useIsAdmin } from '@/hooks/useIsAdmin';

interface RoleBasedContentProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AdminOnlyContent({ children, fallback }: RoleBasedContentProps) {
    const { isAdmin, loading } = useIsAdmin();

    if (loading) {
        return <div>Carregando...</div>;
    }

    if (!isAdmin) {
        return fallback || null;
    }

    return <>{ children } </>;
}

// Uso:
// <AdminOnlyContent fallback={<p>Conteúdo para usuários comuns</p>}>
//   <p>Este conteúdo só aparece para admins</p>
// </AdminOnlyContent>

// ============================================
// 8. BOTÃO CONDICIONAL BASEADO EM PERMISSÃO
// ============================================

// src/components/admin/conditional-action-button.tsx
'use client';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';

interface AdminActionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
}

export function AdminActionButton({ onClick, children }: AdminActionButtonProps) {
    const { isAdmin, loading } = useIsAdmin();

    if (loading) {
        return <Button disabled > Carregando...</Button>;
    }

    if (!isAdmin) {
        return null; // Não mostra o botão
    }

    return (
        <Button onClick= { onClick } variant = "destructive" >
            { children }
            </Button>
  );
}

// Uso:
// <AdminActionButton onClick={handleDeleteUser}>
//   Deletar Usuário
// </AdminActionButton>

// ============================================
// 9. MIDDLEWARE PARA PROTEGER ROTAS (middleware.ts)
// ============================================

// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    // Verificar se é rota admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
        const token = request.cookies.get('admin_token')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // Aqui você poderia verificar o token com Firebase Admin
        // mas isso requer setup adicional no edge runtime
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};

// ============================================
// 10. HOOK PERSONALIZADO COM CACHE
// ============================================

// src/hooks/useAdminWithCache.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const CACHE_KEY = 'admin_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CachedAdminStatus {
    isAdmin: boolean;
    timestamp: number;
}

export function useAdminWithCache() {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        // Verificar cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { isAdmin: cachedStatus, timestamp }: CachedAdminStatus = JSON.parse(cached);

            // Se cache ainda é válido, usar
            if (Date.now() - timestamp < CACHE_DURATION) {
                setIsAdmin(cachedStatus);
                setLoading(false);
                return;
            }
        }

        // Cache inválido ou não existe, verificar via API
        async function checkAdmin() {
            try {
                const idToken = await user.getIdToken(true);
                const response = await fetch('/api/admin/check', {
                    headers: { Authorization: `Bearer ${idToken}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsAdmin(data.isAdmin);

                    // Salvar no cache
                    const cacheData: CachedAdminStatus = {
                        isAdmin: data.isAdmin,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                }
            } catch (error) {
                console.error('Erro ao verificar admin:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        }

        checkAdmin();
    }, [user?.uid]);

    return { isAdmin, loading };
}

// ============================================
// 11. SERVIDOR ACTION COM VERIFICAÇÃO ADMIN
// ============================================

// src/app/admin/actions.ts
'use server';

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function deleteUserAction(userId: string) {
    try {
        // Obter token do cookie/session
        const session = cookies().get('admin_session');
        if (!session) {
            return { error: 'Não autenticado' };
        }

        // Verificar se é admin
        const auth = getAuth(getAdminApp());
        const decodedToken = await auth.verifySessionCookie(session.value);

        if (!decodedToken.admin) {
            return { error: 'Acesso negado' };
        }

        // Executar ação administrativa
        await auth.deleteUser(userId);

        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

// ============================================
// 12. TESTE DE INTEGRAÇÃO
// ============================================

// src/__tests__/admin-system.test.ts
import { checkIsAdminViaFunction, setAdminClaimViaFunction } from '@/services/admin-service';

describe('Admin System', () => {
    it('should verify admin status', async () => {
        const result = await checkIsAdminViaFunction();
        expect(result).toHaveProperty('isAdmin');
        expect(result).toHaveProperty('hasCustomClaim');
    });

    it('should set admin claim', async () => {
        const result = await setAdminClaimViaFunction('test-uid');
        expect(result.success).toBe(true);
    });
});
