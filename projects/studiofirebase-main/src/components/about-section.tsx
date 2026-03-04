
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { useProfileConfig } from '@/hooks/use-profile-config';


export default function AboutSection() {
    const { settings, loading, refreshSettings } = useProfileConfig();
    
    // Texto padrão caso não haja configurações (com Markdown)
    const defaultDescription = `# Bem-vindo

Estamos felizes em tê-lo aqui! Esta é a seção **Sobre** onde você pode conhecer mais sobre nosso trabalho e serviços.

---

## Nossa Proposta

Oferecemos um atendimento personalizado e profissional, sempre buscando a excelência em cada detalhe. Trabalhamos com dedicação para proporcionar a melhor experiência possível aos nossos clientes.

### Nossos Valores

- **Profissionalismo**: Compromisso com a qualidade em todos os aspectos
- **Transparência**: Comunicação clara e honesta
- **Respeito**: Tratamento ético e respeitoso com todos
- **Qualidade**: Excelência em produtos e serviços

---

## Como Funciona

1. **Entre em Contato**: Utilize nossos canais de comunicação
2. **Agende uma Consulta**: Escolha o melhor horário
3. **Atendimento Personalizado**: Receba orientação especializada
4. **Satisfação Garantida**: Nosso compromisso é com seu sucesso

---

## Informações Importantes

> 💡 **Dica**: Configure sua descrição personalizada no painel administrativo para exibir conteúdo específico aqui.

Para personalizar esta seção, acesse **Admin > Configurações > Contato** e adicione sua descrição personalizada.

**Entre em contato** através dos nossos canais disponíveis no rodapé do site.`;

    // Usar a descrição do painel admin ou o texto padrão
    const description = settings?.description || defaultDescription;

    return (
        <Card className="w-full max-w-4xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl my-10">
            <CardHeader className="text-center pb-6">
                <CardTitle className="text-5xl md:text-6xl text-primary font-bold text-center uppercase tracking-wide">
                    SOBRE
                </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-base md:text-lg space-y-6 px-6 md:px-8 pb-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-3 text-sm text-muted-foreground">Carregando informações...</p>
                    </div>
                ) : (
                    <div 
                        className="prose prose-invert prose-red max-w-none"
                        dangerouslySetInnerHTML={{ __html: description }}
                        style={{
                            color: 'hsl(var(--muted-foreground))',
                            lineHeight: '1.6'
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
