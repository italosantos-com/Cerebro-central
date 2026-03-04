"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

interface QrCodeResponse {
  code: string;
  prefilled_message: string;
  deep_link_url: string;
  qr_image_url?: string;
}

type ConnectionStatus = "idle" | "loading" | "ready" | "error";

export default function WhatsAppBusinessConnectPage() {
  const { toast } = useToast();
  const [prefilledMessage, setPrefilledMessage] = useState(
    "Olá! Gostaria de mais informações."
  );
  const [format, setFormat] = useState<"PNG" | "SVG">("PNG");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [qr, setQr] = useState<QrCodeResponse | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingConfig, setMissingConfig] = useState<string[] | null>(null);

  const handleGenerate = async () => {
    setStatus("loading");
    setErrorMessage(null);
    setMissingConfig(null);

    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        setStatus("error");
        toast({
          variant: "destructive",
          title: "Não autenticado",
          description: "Faça login no painel antes de gerar o QR code.",
        });
        return;
      }

      const accessToken = await user.getIdToken();

      const response = await fetch("/api/whatsapp/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          prefilledMessage,
          generateQrImage: format,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        if (Array.isArray(data?.missing)) {
          setMissingConfig(data.missing);
        }
        throw new Error(data?.message || "Falha ao gerar QR code");
      }

      setQr(data.qr);
      setGeneratedAt(data.generatedAt || null);
      setStatus("ready");

      toast({
        title: "QR code gerado!",
        description: "Use o WhatsApp para escanear e abrir o chat.",
      });
    } catch (error: any) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Erro ao gerar QR code";
      setErrorMessage(message);

      toast({
        variant: "destructive",
        title: "Erro ao gerar QR",
        description: message,
      });
    }
  };

  const renderStatus = () => {
    if (status === "loading") return <Badge variant="secondary">Gerando...</Badge>;
    if (status === "ready") return <Badge className="bg-emerald-500/10 text-emerald-400">Pronto</Badge>;
    if (status === "error") return <Badge variant="destructive">Erro</Badge>;
    return <Badge variant="outline">Aguardando</Badge>;
  };


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle>WhatsApp Business</CardTitle>
            {renderStatus()}
          </div>
          <CardDescription>
            Gere um QR code com mensagem pré-preenchida para iniciar conversas no WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="prefilled-message">
              Mensagem pré-preenchida
            </label>
            <Textarea
              id="prefilled-message"
              value={prefilledMessage}
              onChange={(event) => setPrefilledMessage(event.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Máximo 140 caracteres.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato do QR</label>
              <Select value={format} onValueChange={(value) => setFormat(value as "PNG" | "SVG")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG</SelectItem>
                  <SelectItem value="SVG">SVG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={status === "loading"}>
                {status === "loading" ? "Gerando..." : "Gerar QR code"}
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p>{errorMessage}</p>
              {missingConfig && missingConfig.length > 0 && (
                <div className="space-y-1 text-xs text-destructive/80">
                  <p>Variáveis ausentes:</p>
                  <ul className="list-inside list-disc">
                    {missingConfig.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {qr && (
            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              <div className="flex items-center justify-center rounded-lg border bg-muted/40 p-4">
                {qr.qr_image_url ? (
                  <Image
                    src={qr.qr_image_url}
                    alt="QR Code WhatsApp"
                    width={192}
                    height={192}
                    className="h-48 w-48 object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    QR code gerado sem imagem. Use o link para abrir o WhatsApp.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Deep link</label>
                  <Input value={qr.deep_link_url} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Código</label>
                  <Input value={qr.code} readOnly />
                </div>
                {generatedAt && (
                  <p className="text-xs text-muted-foreground">Gerado em: {new Date(generatedAt).toLocaleString()}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary">
                    <a href={qr.deep_link_url} target="_blank" rel="noreferrer">
                      Abrir no WhatsApp
                    </a>
                  </Button>
                  {qr.qr_image_url && (
                    <Button asChild variant="outline">
                      <a href={qr.qr_image_url} target="_blank" rel="noreferrer">
                        Baixar QR
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
