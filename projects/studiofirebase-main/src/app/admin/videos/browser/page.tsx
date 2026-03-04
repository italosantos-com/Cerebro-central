"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PRESET_LINKS = [
  { label: "Google Fotos", url: "https://photos.google.com/" },
  { label: "Google Fotos (álbum público)", url: "https://photos.app.goo.gl/" },
  { label: "iCloud Fotos (álbum público)", url: "https://www.icloud.com/sharedalbum/" },
];

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default function AdminVideosBrowserPage() {
  const searchParams = useSearchParams();
  const initialUrl = useMemo(() => searchParams.get("url") || PRESET_LINKS[0].url, [searchParams]);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const openUrl = (targetUrl?: string) => {
    const nextUrl = (targetUrl || url).trim();
    if (!isValidUrl(nextUrl)) return;
    window.open(nextUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Browser Interno - Galeria Pública
          </CardTitle>
          <CardDescription>
            Para Google Fotos e iCloud Fotos, use abertura em nova aba. Esses serviços bloqueiam iframe direto no painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Este browser interno inicia com links públicos de galeria e abre o destino em nova aba para manter compatibilidade.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="gallery-url">URL da galeria pública</Label>
            <Input
              id="gallery-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://photos.google.com/ ou https://www.icloud.com/sharedalbum/..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_LINKS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUrl(preset.url)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => openUrl()} disabled={!isValidUrl(url)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em nova aba
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
