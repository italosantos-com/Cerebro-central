export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-3xl font-bold">403</h1>
        <p className="text-lg font-medium">Acesso negado</p>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta área.
        </p>
      </div>
    </main>
  );
}
