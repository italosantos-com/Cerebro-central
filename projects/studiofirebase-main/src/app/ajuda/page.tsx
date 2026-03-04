export default function AjudaPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Ajuda e Suporte</h1>
          <p className="text-muted-foreground">
            Precisa de ajuda? Confira as orientações abaixo ou entre em contato com o suporte.
          </p>
        </header>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Atendimento</h2>
          <p className="mt-2 text-muted-foreground">
            Se algo não estiver funcionando, revise as configurações da sua conta e tente novamente.
            Persistindo o problema, fale com o suporte.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Como funciona a plataforma</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              • <span className="font-medium text-foreground">Cadastro e login:</span> acesso seguro com autenticação para
              proteger sua conta.
            </li>
            <li>
              • <span className="font-medium text-foreground">Assinatura:</span> libera áreas restritas e conteúdos premium
              enquanto estiver ativa.
            </li>
            <li>
              • <span className="font-medium text-foreground">Pagamentos:</span> processados com métodos locais e
              internacionais, com confirmação automática.
            </li>
            <li>
              • <span className="font-medium text-foreground">Conteúdos:</span> organizados por fotos, vídeos e galerias com
              navegação simples.
            </li>
            <li>
              • <span className="font-medium text-foreground">Avaliações:</span> moderadas para manter qualidade e segurança.
            </li>
            <li>
              • <span className="font-medium text-foreground">Suporte:</span> canal oficial para dúvidas técnicas ou de conta.
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Contato</h2>
          <p className="mt-2 text-muted-foreground">
            Envie sua mensagem pelo canal oficial do site. Responderemos o mais rápido possível.
          </p>
        </section>
      </div>
    </main>
  );
}
