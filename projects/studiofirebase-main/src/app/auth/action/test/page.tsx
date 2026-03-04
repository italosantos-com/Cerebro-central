"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, RefreshCw } from "lucide-react";

export default function AuthActionTestPage() {
  const router = useRouter();

  const testLinks = [
    {
      title: "Verificação de E-mail",
      description: "Simula o link de verificação de e-mail",
      icon: Mail,
      url: "/auth/action?mode=verifyEmail&oobCode=test-code-verify-email",
      color: "text-blue-500"
    },
    {
      title: "Redefinição de Senha",
      description: "Simula o link de redefinição de senha",
      icon: Lock,
      url: "/auth/action?mode=resetPassword&oobCode=test-code-reset-password",
      color: "text-green-500"
    },
    {
      title: "Recuperar E-mail",
      description: "Simula o link de recuperação de e-mail",
      icon: RefreshCw,
      url: "/auth/action?mode=recoverEmail&oobCode=test-code-recover-email",
      color: "text-yellow-500"
    },
    {
      title: "Alterar E-mail",
      description: "Simula o link de confirmação de alteração de e-mail",
      icon: Shield,
      url: "/auth/action?mode=verifyAndChangeEmail&oobCode=test-code-change-email",
      color: "text-purple-500"
    }
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-white">Teste de Ações do Firebase</CardTitle>
          <CardDescription>
            Clique nos botões abaixo para testar cada modal de ação de autenticação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-primary/20 mb-6">
            <p className="text-sm text-muted-foreground">
              ⚠️ <strong>Nota:</strong> Estes são links de teste com códigos fictícios. 
              Na produção, os códigos serão gerados pelo Firebase e enviados por e-mail.
            </p>
          </div>

          <div className="grid gap-4">
            {testLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Card key={index} className="border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg bg-muted/50 ${link.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{link.title}</h3>
                          <p className="text-sm text-muted-foreground">{link.description}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => router.push(link.url)}
                        variant="outline"
                        size="sm"
                      >
                        Testar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="pt-6 border-t border-primary/20">
            <h3 className="font-semibold text-white mb-3">Como Configurar no Firebase:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Acesse o Firebase Console → Authentication → Templates</li>
              <li>2. Para cada tipo de e-mail, configure a Action URL para:</li>
              <li className="pl-4 font-mono text-xs bg-muted/30 p-2 rounded">
                https://italosantos.com/auth/action?mode=MODE&oobCode=%OOBCODE%
              </li>
              <li>3. Substitua MODE pelo tipo correto (verifyEmail, resetPassword, etc.)</li>
              <li>4. Os templates completos estão em <code className="bg-muted/30 px-1 rounded">FIREBASE_EMAIL_TEMPLATES.md</code></li>
            </ol>
          </div>

          <Button 
            onClick={() => router.push('/')} 
            variant="secondary"
            className="w-full mt-6"
          >
            Voltar para Página Inicial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
