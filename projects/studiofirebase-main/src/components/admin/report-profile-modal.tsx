"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { AlertTriangle, Loader2, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from "@/lib/firebase";
import { resolveAdminUidByUsername } from "@/utils/admin-lookup-client";
import { isSuperAdminUser } from "@/lib/superadmin-config";

type AdminTarget = {
  uid: string;
  name: string;
  username?: string;
  email?: string;
};

function getAdminSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  return pathname.match(/^\/([^\/]+)\/admin(\/|$)/)?.[1] ?? null;
}

export default function ReportProfileModal() {
  const { toast } = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [target, setTarget] = useState<AdminTarget | null>(null);
  const [targetLoading, setTargetLoading] = useState(true);

  const adminSlug = useMemo(() => getAdminSlugFromPath(pathname), [pathname]);

  useEffect(() => {
    const resolveTarget = async () => {
      try {
        if (adminSlug) {
          const adminUid = await resolveAdminUidByUsername(adminSlug);
          if (adminUid) {
            const adminDoc = await getDoc(doc(db, "admins", adminUid));
            const data = adminDoc.exists() ? adminDoc.data() : {};
            setTarget({
              uid: adminUid,
              name: String(data.name || "Admin"),
              username: String(data.username || adminSlug),
              email: String(data.email || "")
            });
            return;
          }
        }

        const currentUser = auth.currentUser;
        if (currentUser?.uid) {
          const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
          const data = adminDoc.exists() ? adminDoc.data() : {};
          setTarget({
            uid: currentUser.uid,
            name: String(data.name || "Admin"),
            username: String(data.username || ""),
            email: String(data.email || currentUser.email || "")
          });
        }
      } catch (error) {
        console.error("[ReportProfile] Falha ao resolver admin alvo:", error);
      } finally {
        setTargetLoading(false);
      }
    };

    void resolveTarget();
  }, [adminSlug]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    setFiles(selected);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast({
        variant: "destructive",
        title: "Informe o motivo",
        description: "Explique o motivo da denuncia para continuar."
      });
      return;
    }

    if (!target?.uid) {
      toast({
        variant: "destructive",
        title: "Admin nao identificado",
        description: "Nao foi possivel identificar o perfil denunciado."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reporter = auth.currentUser;
      const reportRef = doc(collection(db, "admin_reports"));

      const evidenceUrls: string[] = [];
      if (files.length > 0) {
        const uploadResults = await Promise.all(
          files.map(async (file) => {
            const safeName = file.name.replace(/\s+/g, "-");
            const storageRef = ref(storage, `admin-reports/${target.uid}/${reportRef.id}/${safeName}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
          })
        );
        evidenceUrls.push(...uploadResults);
      }

      await setDoc(reportRef, {
        adminUid: target.uid,
        adminName: target.name,
        adminUsername: target.username || "",
        adminEmail: target.email || "",
        reason: trimmedReason,
        evidenceUrls,
        reporterUid: reporter?.uid || null,
        reporterEmail: reporter?.email || null,
        pagePath: pathname || "",
        status: "open",
        createdAt: serverTimestamp(),
        reportedAt: serverTimestamp()
      });

      toast({
        title: "Denuncia enviada",
        description: "O SuperAdmin vai revisar o relato."
      });
      setReason("");
      setFiles([]);
      setOpen(false);
    } catch (error) {
      console.error("[ReportProfile] Falha ao enviar denuncia:", error);
      toast({
        variant: "destructive",
        title: "Erro ao denunciar",
        description: "Nao foi possivel enviar a denuncia."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (targetLoading) {
    return null;
  }

  if (target && isSuperAdminUser({ username: target.username, email: target.email })) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-6 right-6 z-50">
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            Denunciar perfil
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Denunciar perfil</DialogTitle>
          <DialogDescription>
            Conte o motivo da denuncia e envie prints se necessario. O SuperAdmin recebe essa notificacao.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportReason">Motivo da denuncia</Label>
            <Textarea
              id="reportReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explique o que aconteceu..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportImages">Enviar imagens (prints)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="reportImages"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </div>
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s).</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar denuncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
