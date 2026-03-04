"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, deleteUser, onAuthStateChanged, type User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCog,
  MoreHorizontal,
  Ban,
  Trash2,
  CheckCircle,
  XCircle,
  CreditCard,
  Crown,
  RefreshCw,
  Loader2,
  Shield,
  ShieldOff,
  Settings2,
} from "lucide-react";
import { isSuperAdminUser } from "@/lib/superadmin-config";

// Payment method icons (using emoji/text for simplicity)
const PAYMENT_METHODS = [
  { id: "paypal", name: "PayPal", icon: "💳", color: "bg-blue-500" },
  { id: "stripe", name: "Stripe", icon: "💎", color: "bg-purple-500" },
  { id: "mercadopago", name: "Mercado Pago", icon: "🟡", color: "bg-yellow-500" },
  { id: "googlepay", name: "Google Pay", icon: "🌐", color: "bg-green-500" },
  { id: "applepay", name: "Apple Pay", icon: "🍎", color: "bg-gray-800" },
] as const;

type PaymentMethodId = typeof PAYMENT_METHODS[number]["id"];

interface Admin {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  status: "active" | "blocked" | "pending";
  isMainAdmin?: boolean;
  createdAt: any;
  paymentMethods?: Partial<Record<PaymentMethodId, boolean>>;
}

interface ReportedAdminSummary {
  adminUid: string;
  adminName: string;
  adminEmail: string;
  adminUsername?: string;
  reportsCount: number;
  lastReportedAt?: any;
  latestReason?: string;
}

interface FraudAlertSummary {
  id: string;
  adminUid: string;
  existingAdminUid?: string | null;
  imageUrl?: string | null;
  existingImageUrl?: string | null;
  createdAt?: any;
}

export default function AdminManagerPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reportedAdmins, setReportedAdmins] = useState<ReportedAdminSummary[]>([]);
  const [reportedLoading, setReportedLoading] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertSummary[]>([]);
  const [fraudAlertsLoading, setFraudAlertsLoading] = useState(false);
  const [fraudResolveLoading, setFraudResolveLoading] = useState<Record<string, boolean>>({});
  const [selfDeleteLoading, setSelfDeleteLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdminUsername, setCurrentAdminUsername] = useState<string>("");
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const adminSlugFromPath = pathname.match(/^\/([^\/]+)\/admin(\/|$)/)?.[1] ?? null;
  const isGlobalAdminRoute = !adminSlugFromPath && pathname.startsWith("/admin");

  const getTimestampValue = (timestamp: any) => {
    if (!timestamp) return 0;
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.getTime();
    } catch {
      return 0;
    }
  };

  const adminLookup = useMemo(() => {
    return new Map(admins.map((admin) => [admin.uid, admin]));
  }, [admins]);

  const loadReportedAdmins = useCallback(async (adminList?: Admin[]) => {
    try {
      setReportedLoading(true);
      const reportsRef = collection(db, "admin_reports");
      const snapshot = await getDocs(reportsRef);

      const reportsMap = new Map<string, ReportedAdminSummary>();

      snapshot.forEach((reportDoc) => {
        const data = reportDoc.data() || {};
        const adminUid = data.adminUid || data.adminId;
        if (!adminUid) return;

        const matchingAdmin = adminList?.find((admin) => admin.uid === adminUid);
        const createdAt = data.createdAt || data.reportedAt || null;
        const reason = data.reason || data.message || data.description || "";

        const existing = reportsMap.get(adminUid);
        if (!existing) {
          reportsMap.set(adminUid, {
            adminUid,
            adminName: data.adminName || matchingAdmin?.name || "Admin",
            adminEmail: data.adminEmail || matchingAdmin?.email || "",
            adminUsername: data.adminUsername || matchingAdmin?.username || "",
            reportsCount: 1,
            lastReportedAt: createdAt,
            latestReason: reason,
          });
          return;
        }

        existing.reportsCount += 1;

        const currentTime = getTimestampValue(existing.lastReportedAt);
        const incomingTime = getTimestampValue(createdAt);
        if (incomingTime > currentTime) {
          existing.lastReportedAt = createdAt;
          if (reason) {
            existing.latestReason = reason;
          }
        }
      });

      const reportedList = Array.from(reportsMap.values()).sort((a, b) =>
        getTimestampValue(b.lastReportedAt) - getTimestampValue(a.lastReportedAt)
      );

      setReportedAdmins(reportedList);
    } catch (error) {
      console.error("Error loading reported admins:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar denúncias",
        description: "Não foi possível carregar a lista de denunciados.",
      });
    } finally {
      setReportedLoading(false);
    }
  }, [toast]);

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const adminsRef = collection(db, "admins");
      const snapshot = await getDocs(adminsRef);

      const adminList: Admin[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        adminList.push({
          uid: doc.id,
          name: data.name || "Sem nome",
          email: data.email || "",
          phone: data.phone || "",
          username: data.username || "",
          status: data.status || "active",
          isMainAdmin: data.isMainAdmin || false,
          createdAt: data.createdAt,
          paymentMethods: data.paymentMethods || {},
        });
      });

      // Sort: Main admin first, then by name
      adminList.sort((a, b) => {
        if (a.isMainAdmin && !b.isMainAdmin) return -1;
        if (!a.isMainAdmin && b.isMainAdmin) return 1;
        return a.name.localeCompare(b.name);
      });

      setAdmins(adminList);
      await loadReportedAdmins(adminList);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar administradores",
        description: "Não foi possível carregar a lista de admins.",
      });
    } finally {
      setLoading(false);
    }
  }, [loadReportedAdmins, toast]);

  const loadFraudAlerts = useCallback(async () => {
    try {
      setFraudAlertsLoading(true);
      const alertsQuery = query(
        collection(db, "admin_fraud_alerts"),
        where("status", "==", "open")
      );
      const snapshot = await getDocs(alertsQuery);
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          adminUid: data.adminUid || '',
          existingAdminUid: data.existingAdminUid || null,
          imageUrl: data.imageUrl || null,
          existingImageUrl: data.existingImageUrl || null,
          createdAt: data.createdAt || data.reportedAt || null,
        } as FraudAlertSummary;
      });

      items.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));
      setFraudAlerts(items);
    } catch (error) {
      console.error("Error loading fraud alerts:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar alertas",
        description: "Não foi possível carregar alertas de fraude.",
      });
    } finally {
      setFraudAlertsLoading(false);
    }
  }, [toast]);

  const resolveFraudAlert = useCallback(async (alertId: string) => {
    try {
      setFraudResolveLoading((prev) => ({ ...prev, [alertId]: true }));
      await updateDoc(doc(db, "admin_fraud_alerts", alertId), {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUser?.uid || null,
      });
      setFraudAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });
    } catch (error) {
      console.error("Error resolving fraud alert:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
      });
    } finally {
      setFraudResolveLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  }, [currentUser?.uid, toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const resolveCurrentAdmin = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, "admins", currentUser.uid));
        const adminData = adminSnap.exists() ? adminSnap.data() : {};
        const username = String(adminData?.username || "");
        const email = String(adminData?.email || currentUser.email || "");
        const superadmin = isSuperAdminUser({ username, email });

        setCurrentAdminUsername(username);
        setCurrentAdminEmail(email);
        setIsSuperAdmin(superadmin);

        if (!superadmin) {
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Apenas o SuperAdmin pode gerenciar administradores.",
          });
          const fallbackPath = username
            ? `/${username}/admin`
            : "/admin";
          router.replace(fallbackPath);
        }
      } catch (error) {
        console.error("Error resolving current admin:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isGlobalAdminRoute) {
      setLoading(false);
      return;
    }

    void resolveCurrentAdmin();
  }, [currentUser, isGlobalAdminRoute, router, toast]);

  useEffect(() => {
    if (!isGlobalAdminRoute || !isSuperAdmin) {
      return;
    }

    void loadAdmins();
    void loadFraudAlerts();
  }, [isGlobalAdminRoute, isSuperAdmin, loadAdmins, loadFraudAlerts]);

  const handleBlockAdmin = async (admin: Admin) => {
    if (admin.isMainAdmin) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Não é possível bloquear o administrador principal.",
      });
      return;
    }

    try {
      setActionLoading(admin.uid);
      const newStatus = admin.status === "blocked" ? "active" : "blocked";

      await updateDoc(doc(db, "admins", admin.uid), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setAdmins((prev) =>
        prev.map((a) =>
          a.uid === admin.uid ? { ...a, status: newStatus } : a
        )
      );

      toast({
        title: newStatus === "blocked" ? "Admin bloqueado" : "Admin desbloqueado",
        description: `${admin.name} foi ${newStatus === "blocked" ? "bloqueado" : "desbloqueado"} com sucesso.`,
      });
    } catch (error) {
      console.error("Error blocking admin:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status do admin.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (admin.isMainAdmin) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Não é possível excluir o administrador principal.",
      });
      return;
    }

    try {
      setActionLoading(admin.uid);

      // Delete from Firestore
      await deleteDoc(doc(db, "admins", admin.uid));

      // Also delete profile settings subcollection
      try {
        const profileRef = doc(db, "admins", admin.uid, "profile", "settings");
        await deleteDoc(profileRef);
      } catch (e) {
        // Profile might not exist
      }

      setAdmins((prev) => prev.filter((a) => a.uid !== admin.uid));

      toast({
        title: "Admin excluído",
        description: `${admin.name} foi excluído com sucesso.`,
      });
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o admin.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMyAccount = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Não autenticado",
        description: "Faça login novamente para excluir sua conta.",
      });
      return;
    }

    try {
      setSelfDeleteLoading(true);

      const currentAdminSnap = await getDoc(doc(db, "admins", currentUser.uid));
      if (currentAdminSnap.exists() && currentAdminSnap.data().isMainAdmin) {
        toast({
          variant: "destructive",
          title: "Ação não permitida",
          description: "O administrador principal não pode ser excluído.",
        });
        return;
      }

      await deleteDoc(doc(db, "admins", currentUser.uid));

      try {
        const profileRef = doc(db, "admins", currentUser.uid, "profile", "settings");
        await deleteDoc(profileRef);
      } catch (e) {
        // Perfil pode não existir
      }

      await deleteUser(currentUser);

      toast({
        title: "Conta excluída",
        description: "Sua conta de administrador foi excluída com sucesso.",
      });

      router.push("/admin");
    } catch (error: any) {
      console.error("Error deleting own admin account:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Não foi possível excluir sua conta.",
      });
    } finally {
      setSelfDeleteLoading(false);
    }
  };

  const handlePaymentMethodToggle = async (
    admin: Admin,
    methodId: PaymentMethodId,
    enabled: boolean
  ) => {
    try {
      const currentMethods = admin.paymentMethods || {};
      const updatedMethods = {
        ...currentMethods,
        [methodId]: enabled,
      };

      await updateDoc(doc(db, "admins", admin.uid), {
        paymentMethods: updatedMethods,
        updatedAt: new Date().toISOString(),
      });

      setAdmins((prev) =>
        prev.map((a) =>
          a.uid === admin.uid ? { ...a, paymentMethods: updatedMethods } : a
        )
      );

      if (selectedAdmin?.uid === admin.uid) {
        setSelectedAdmin({ ...selectedAdmin, paymentMethods: updatedMethods });
      }

      const method = PAYMENT_METHODS.find((m) => m.id === methodId);
      toast({
        title: enabled ? "Método habilitado" : "Método desabilitado",
        description: `${method?.name} ${enabled ? "habilitado" : "desabilitado"} para ${admin.name}.`,
      });
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o método de pagamento.",
      });
    }
  };

  const openPaymentDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: Admin["status"], isMainAdmin?: boolean) => {
    if (isMainAdmin) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600">
          <Crown className="h-3 w-3 mr-1" />
          Principal
        </Badge>
      );
    }

    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case "blocked":
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getEnabledPaymentCount = (paymentMethods?: Partial<Record<PaymentMethodId, boolean>>) => {
    if (!paymentMethods) return 0;
    return Object.values(paymentMethods).filter(Boolean).length;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Data não disponível";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Data inválida";
    }
  };

  const renderAdminInfo = (adminUid?: string | null) => {
    if (!adminUid) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    const admin = adminLookup.get(adminUid);
    return (
      <div className="flex flex-col">
        <span className="font-medium">{admin?.name || "Admin"}</span>
        {admin?.email ? (
          <span className="text-xs text-muted-foreground">{admin.email}</span>
        ) : (
          <span className="text-xs text-muted-foreground break-all">{adminUid}</span>
        )}
        {admin?.username ? (
          <span className="text-xs text-muted-foreground">@{admin.username}</span>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
              <UserCog className="h-6 w-6" />
              Gerenciador de Admins
            </h1>
            {fraudAlerts.length > 0 ? (
              <Badge variant="destructive">{fraudAlerts.length} alerta(s)</Badge>
            ) : null}
          </div>
          <p className="text-white/60">
            Gerencie administradores, permissões e métodos de pagamento.
          </p>
        </div>
        <Button
          onClick={() => {
            void loadAdmins();
            void loadFraudAlerts();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Admins</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {admins.filter((a) => a.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins Bloqueados</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {admins.filter((a) => a.status === "blocked").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Fraude</CardTitle>
            <ShieldOff className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {fraudAlerts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Fraude</CardTitle>
          <CardDescription>
            Imagens duplicadas detectadas no treino da IA. Revise possiveis perfis fake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fraudAlertsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando alertas...
            </div>
          ) : fraudAlerts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum alerta aberto.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead className="hidden sm:table-cell">Duplicado</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="hidden lg:table-cell">Hash</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      {renderAdminInfo(alert.adminUid)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {renderAdminInfo(alert.existingAdminUid)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {alert.createdAt ? formatDate(alert.createdAt) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {alert.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={fraudResolveLoading[alert.id]}
                        onClick={() => resolveFraudAlert(alert.id)}
                      >
                        {fraudResolveLoading[alert.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Resolver"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Denunciados */}
      <Card>
        <CardHeader>
          <CardTitle>Denunciados</CardTitle>
          <CardDescription>
            Perfis denunciados por usuários. Revise e tome ações quando necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportedLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando denúncias...
            </div>
          ) : reportedAdmins.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma denúncia registrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead className="hidden sm:table-cell">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Última denúncia</TableHead>
                  <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportedAdmins.map((reported) => (
                  <TableRow key={reported.adminUid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{reported.adminName}</span>
                        {reported.adminEmail ? (
                          <span className="text-sm text-muted-foreground">{reported.adminEmail}</span>
                        ) : null}
                        {reported.adminUsername ? (
                          <span className="text-xs text-muted-foreground">@{reported.adminUsername}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">{reported.reportsCount}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {reported.lastReportedAt ? formatDate(reported.lastReportedAt) : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {reported.latestReason || "Não informado"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Administradores</CardTitle>
          <CardDescription>
            Todos os administradores cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead className="hidden md:table-cell">Username</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Pagamentos</TableHead>
                <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum administrador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.uid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{admin.name}</span>
                        <span className="text-sm text-muted-foreground">{admin.email}</span>
                        <span className="sm:hidden mt-1">
                          {getStatusBadge(admin.status, admin.isMainAdmin)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {admin.username ? (
                        <span className="text-muted-foreground">@{admin.username}</span>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(admin.status, admin.isMainAdmin)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {getEnabledPaymentCount(admin.paymentMethods)}/{PAYMENT_METHODS.length}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {formatDate(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === admin.uid}
                          >
                            {actionLoading === admin.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {/* Payment Methods */}
                          <DropdownMenuItem onClick={() => openPaymentDialog(admin)}>
                            <Settings2 className="h-4 w-4 mr-2" />
                            Métodos de Pagamento
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Block/Unblock */}
                          {!admin.isMainAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleBlockAdmin(admin)}
                              className={admin.status === "blocked" ? "text-green-600" : "text-amber-600"}
                            >
                              {admin.status === "blocked" ? (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Desbloquear
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Bloquear
                                </>
                              )}
                            </DropdownMenuItem>
                          )}

                          {/* Delete */}
                          {!admin.isMainAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o administrador{" "}
                                    <strong>{admin.name}</strong>? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAdmin(admin)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {admin.isMainAdmin && (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <Crown className="h-4 w-4 mr-2" />
                              Admin Principal
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Métodos de Pagamento</DialogTitle>
            <DialogDescription>
              Ative ou desative métodos de pagamento para o admin selecionado.
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin ? (
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{method.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{method.name}</div>
                      <div className="text-xs text-muted-foreground">{method.id}</div>
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(selectedAdmin.paymentMethods?.[method.id])}
                    onCheckedChange={(checked) =>
                      handlePaymentMethodToggle(selectedAdmin, method.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Selecione um administrador para configurar os métodos de pagamento.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
