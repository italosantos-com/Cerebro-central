# 🧪 Guia de Testes - Recuperação de Senha Admin

## 📋 Pré-requisitos para Testes

### 1. Ambiente Local
```bash
# Certifique-se de que o projeto está rodando
npm run dev

# Acesse o navegador
http://localhost:3000
```

### 2. Configuração Firebase
- ✅ Firebase Auth deve estar configurado
- ✅ Variáveis de ambiente devem estar definidas
- ✅ Email provider habilitado no Firebase Console

### 3. Email de Teste
- Use um email real para receber os links
- Acesso à caixa de entrada
- Verifique também a pasta de spam

## 🎯 Plano de Testes

### Teste 1: Acesso à Página
**Objetivo**: Verificar que a página carrega corretamente

**Passos**:
1. Acesse `http://localhost:3000/admin`
2. Procure o link "Esqueci minha senha"
3. Clique no link

**Resultado Esperado**:
- ✅ Redireciona para `/admin/forgot-password`
- ✅ Página carrega sem erros
- ✅ Exibe formulário com campo de email
- ✅ Botão "Enviar Link de Recuperação" visível
- ✅ Botão "Voltar ao Login" visível

---

### Teste 2: Validação de Email Vazio
**Objetivo**: Verificar validação de campo obrigatório

**Passos**:
1. Na página `/admin/forgot-password`
2. Deixe o campo de email vazio
3. Clique em "Enviar Link de Recuperação"

**Resultado Esperado**:
- ✅ Toast de erro aparece
- ✅ Mensagem: "Email necessário"
- ✅ Nenhum email é enviado
- ✅ Botão permanece desabilitado

---

### Teste 3: Validação de Email Inválido
**Objetivo**: Verificar validação de formato de email

**Passos**:
1. Digite emails inválidos:
   - `teste` (sem @)
   - `teste@` (sem domínio)
   - `@teste.com` (sem usuário)
   - `teste@teste` (sem TLD)
2. Clique em "Enviar Link de Recuperação"

**Resultado Esperado**:
- ✅ Toast de erro aparece
- ✅ Mensagem: "Email inválido"
- ✅ Nenhum email é enviado

---

### Teste 4: Email Válido mas Não Cadastrado
**Objetivo**: Verificar comportamento com email não existente

**Passos**:
1. Digite um email válido mas não cadastrado no Firebase
2. Exemplo: `naoexiste@teste.com`
3. Clique em "Enviar Link de Recuperação"

**Resultado Esperado**:
- ✅ Firebase retorna erro `auth/user-not-found`
- ✅ Toast de erro com mensagem: "Nenhuma conta encontrada com este email"
- ✅ Não revela se o email existe (boa prática de segurança)

---

### Teste 5: Email Válido e Cadastrado ⭐
**Objetivo**: Testar o fluxo completo de sucesso

**Passos**:
1. Crie um usuário admin no Firebase (se não existir)
2. Digite o email do admin cadastrado
3. Clique em "Enviar Link de Recuperação"
4. Aguarde o processamento

**Resultado Esperado**:
- ✅ Botão muda para "Enviando..." (loading state)
- ✅ Após ~1-2 segundos, toast de sucesso aparece
- ✅ Interface muda para tela de confirmação
- ✅ Ícone de check verde (✅) aparece
- ✅ Exibe o email enviado
- ✅ Botões "Enviar Novamente" e "Voltar ao Login" visíveis

---

### Teste 6: Verificar Email Recebido
**Objetivo**: Confirmar recebimento do email

**Passos**:
1. Após o Teste 5
2. Acesse a caixa de entrada do email
3. Procure por email do Firebase
4. Verifique também a pasta de spam

**Resultado Esperado**:
- ✅ Email recebido (geralmente em 10-30 segundos)
- ✅ Assunto: "Reset your password" ou similar
- ✅ Remetente: noreply@... ou Firebase Auth
- ✅ Conteúdo tem link para redefinir senha
- ✅ Link começa com domínio do Firebase

**Exemplo de URL do link**:
```
https://seuapp.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=CODIGO_LONGO...
```

---

### Teste 7: Clicar no Link do Email
**Objetivo**: Verificar redirecionamento para página do Firebase

**Passos**:
1. No email recebido
2. Clique no link "Reset Password" / "Redefinir Senha"

**Resultado Esperado**:
- ✅ Abre nova aba/janela
- ✅ Redireciona para página do Firebase
- ✅ URL contém parâmetros: `mode=resetPassword` e `oobCode=...`
- ✅ Formulário para definir nova senha aparece
- ✅ Campos: "Nova Senha" e "Confirmar Senha"

---

### Teste 8: Redefinir Senha
**Objetivo**: Completar o processo de redefinição

**Passos**:
1. Na página do Firebase
2. Digite uma nova senha forte
3. Confirme a senha
4. Clique em "Save" / "Salvar"

**Resultado Esperado**:
- ✅ Validação de senha forte (se configurada)
- ✅ Mensagem de sucesso
- ✅ Link/botão para voltar ao login
- ✅ Senha atualizada no Firebase

---

### Teste 9: Login com Nova Senha
**Objetivo**: Verificar que a nova senha funciona

**Passos**:
1. Volte para `/admin`
2. Digite o email
3. Digite a NOVA senha
4. Clique em "Entrar"

**Resultado Esperado**:
- ✅ Login bem-sucedido
- ✅ Redireciona para painel admin
- ✅ Token de autenticação criado
- ✅ Cookies/localStorage definidos

---

### Teste 10: Botão "Enviar Novamente"
**Objetivo**: Verificar funcionalidade de reenvio

**Passos**:
1. Após enviar email pela primeira vez
2. Na tela de confirmação
3. Clique em "Enviar Novamente"

**Resultado Esperado**:
- ✅ Volta para formulário inicial
- ✅ Campo de email limpo
- ✅ Pode enviar novo email
- ✅ Link anterior continua válido (por 1 hora)

---

### Teste 11: Botão "Voltar ao Login"
**Objetivo**: Verificar navegação de volta

**Passos**:
1. Em qualquer estado da página
2. Clique em "Voltar ao Login"

**Resultado Esperado**:
- ✅ Redireciona para `/admin`
- ✅ Página de login carrega normalmente
- ✅ Sem erros no console

---

### Teste 12: Rate Limiting
**Objetivo**: Verificar proteção contra spam

**Passos**:
1. Envie múltiplas solicitações rapidamente
2. Tente enviar 5-10 emails consecutivos
3. Aguarde resposta

**Resultado Esperado**:
- ✅ Após algumas tentativas, Firebase bloqueia
- ✅ Erro: `auth/too-many-requests`
- ✅ Toast: "Muitas tentativas. Tente novamente mais tarde"
- ✅ Proteção automática ativada

---

### Teste 13: Link Expirado
**Objetivo**: Verificar comportamento com link vencido

**Passos**:
1. Solicite email de recuperação
2. Aguarde mais de 1 hora (ou altere data do sistema)
3. Tente usar o link

**Resultado Esperado**:
- ✅ Firebase detecta link expirado
- ✅ Mensagem de erro na página do Firebase
- ✅ Opção de solicitar novo link

---

### Teste 14: Tecla Enter no Campo
**Objetivo**: Verificar atalho de teclado

**Passos**:
1. Digite email válido
2. Pressione Enter (sem clicar no botão)

**Resultado Esperado**:
- ✅ Formulário é submetido
- ✅ Email é enviado
- ✅ Mesmo comportamento que clicar no botão

---

### Teste 15: Navegação com Botão Voltar (Browser)
**Objetivo**: Testar comportamento do histórico

**Passos**:
1. Acesse `/admin/forgot-password`
2. Envie email com sucesso
3. Clique no botão voltar do navegador

**Resultado Esperado**:
- ✅ Volta para página anterior
- ✅ Sem erros
- ✅ Estado da aplicação consistente

---

## 📊 Checklist de Testes

### Interface
- [ ] Página carrega sem erros
- [ ] Todos os textos estão em português
- [ ] Ícones aparecem corretamente
- [ ] Layout responsivo funciona
- [ ] Botões têm estados corretos (disabled/enabled)

### Validações
- [ ] Email vazio é rejeitado
- [ ] Email inválido é rejeitado
- [ ] Email válido é aceito

### Fluxo de Sucesso
- [ ] Email é enviado
- [ ] Tela de confirmação aparece
- [ ] Email chega na caixa de entrada
- [ ] Link funciona
- [ ] Senha pode ser redefinida
- [ ] Login funciona com nova senha

### Tratamento de Erros
- [ ] Erro de usuário não encontrado
- [ ] Erro de email inválido
- [ ] Erro de rate limiting
- [ ] Erro de link expirado
- [ ] Mensagens de erro são claras

### Navegação
- [ ] Link "Esqueci minha senha" funciona
- [ ] Botão "Voltar ao Login" funciona
- [ ] Botão "Enviar Novamente" funciona
- [ ] Navegação do browser funciona

### Experiência do Usuário
- [ ] Loading states são visíveis
- [ ] Toasts aparecem e desaparecem
- [ ] Feedback é imediato
- [ ] Instruções são claras
- [ ] Sem confusão no fluxo

## 🐛 Troubleshooting

### Email não chega
**Possíveis causas**:
1. Email está na pasta de spam
2. Email não está cadastrado no Firebase
3. Configuração de email no Firebase Console
4. Domínio não está autorizado

**Solução**:
```bash
# Verificar configuração Firebase
# Console > Authentication > Settings > Authorized domains
```

### Erro ao enviar
**Possíveis causas**:
1. Firebase não inicializado
2. Variáveis de ambiente ausentes
3. Problema de rede

**Debug**:
```bash
# Verificar console do navegador
# Verificar logs do Firebase
console.log('[Forgot Password] Erro:', error);
```

### Link não funciona
**Possíveis causas**:
1. Link expirado (>1 hora)
2. Já foi usado
3. URL incorreta

**Solução**:
- Solicitar novo link
- Verificar configuração de action URLs no Firebase

## 📝 Registro de Testes

### Template de Relatório
```markdown
# Relatório de Testes - Recuperação de Senha

**Data**: _______________
**Testador**: _______________
**Ambiente**: [ ] Local [ ] Staging [ ] Production

## Resultados

| Teste | Status | Observações |
|-------|--------|-------------|
| 1. Acesso à Página | ⬜ | |
| 2. Email Vazio | ⬜ | |
| 3. Email Inválido | ⬜ | |
| 4. Email Não Cadastrado | ⬜ | |
| 5. Email Válido | ⬜ | |
| 6. Email Recebido | ⬜ | |
| 7. Clicar no Link | ⬜ | |
| 8. Redefinir Senha | ⬜ | |
| 9. Login com Nova Senha | ⬜ | |
| 10. Enviar Novamente | ⬜ | |
| 11. Voltar ao Login | ⬜ | |
| 12. Rate Limiting | ⬜ | |
| 13. Link Expirado | ⬜ | |
| 14. Tecla Enter | ⬜ | |
| 15. Navegação Browser | ⬜ | |

**Status Final**: [ ] ✅ Aprovado [ ] ❌ Reprovado

**Bugs Encontrados**: _______________
**Comentários**: _______________
```

## 🎯 Critérios de Aceitação

### Mínimo para Aprovação
- ✅ Todos os testes de 1-9 passam
- ✅ Email é recebido em <1 minuto
- ✅ Senha pode ser redefinida com sucesso
- ✅ Login funciona após reset
- ✅ Sem erros críticos no console

### Ideal
- ✅ Todos os 15 testes passam
- ✅ Email chega em <30 segundos
- ✅ UX é suave e intuitiva
- ✅ Mensagens são claras
- ✅ Performance é boa

---

**Teste completo e validado** ✅
**Pronto para homologação** 🚀
