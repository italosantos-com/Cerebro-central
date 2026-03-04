# 🚀 Quick Start: SMS com Firebase

## ⚡ 30 Segundos

O projeto agora tem SMS nativo do Firebase pronto para usar!

```bash
# 1. Instalar dependências (se necessário)
npm install

# 2. Iniciar dev server
npm run dev

# 3. Ir para: http://localhost:3000/admin
# 4. Clicar "Não tenho conta"
# 5. Preencher formulário e enviar OTP
# 6. Receber SMS e continuar
```

---

## 🎯 O Que Funciona

| Feature | Status |
|---------|--------|
| Enviar OTP via SMS | ✅ |
| Verificar código OTP | ✅ |
| Formatar telefone automaticamente | ✅ |
| Reenviar código (com countdown) | ✅ |
| Validação em tempo real | ✅ |
| Mensagens de erro claras | ✅ |
| reCAPTCHA automático | ✅ |
| Email verification | ✅ |
| Logout automático | ✅ |

---

## 📱 Formatos de Telefone Aceitos

Todos são convertidos para `+5511999999999`:

```
✅ +5511999999999   (formato E.164)
✅ 11999999999      (com DDD)
✅ +55 11 99999-9999 (com espaços/hífens)
✅ 11 99999-9999    (apenas DDD + número)

❌ 1234567890       (sem DDD)
❌ 123456789        (muito curto)
```

---

## 🧪 Testar SMS

### Opção 1: No Navegador (Recomendado)

1. Acesse: http://localhost:3000/admin
2. Clique "Não tenho conta"
3. Use seu número real ou teste com Firebase Emulator

### Opção 2: Firebase Emulator

```bash
# Terminal 1: Emulator
npm run dev:emulator

# Terminal 2: Seu app
npm run dev

# Use número teste: +1 555-0100
# Código aparece no Console do Emulator
```

### Opção 3: Script de Teste

```bash
npm run test:email
# Testa email SMTP (útil para debug)
```

---

## 🔧 Usar em Outro Componente

```tsx
import { useSmsOtp } from '@/hooks/use-sms-otp';

export function MeuComponente() {
  const {
    sendOtp,        // Enviar OTP
    verifyOtp,      // Verificar código
    resendOtp,      // Reenviar
    loading,        // Enviando?
    error,          // Mensagem de erro
    resendCountdown // Segundos até poder reenviar
  } = useSmsOtp();

  return (
    <div>
      <input 
        placeholder="+55 11 9999-9999"
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={() => sendOtp(phone)}>
        {loading ? 'Enviando...' : 'Enviar OTP'}
      </button>

      {error && <p className="error">{error}</p>}

      <input 
        placeholder="000000"
        maxLength={6}
        onChange={(e) => setCode(e.target.value)}
      />
      <button onClick={() => verifyOtp(code)}>
        Verificar
      </button>

      <button 
        onClick={resendOtp}
        disabled={resendCountdown > 0}
      >
        {resendCountdown > 0 
          ? `Reenviar em ${resendCountdown}s`
          : 'Reenviar'}
      </button>
    </div>
  );
}
```

---

## 🆘 Problemas Comuns

### "Código inválido ou expirado"
- ❌ Digitar número errado
- ✅ Clique "Reenviar código"
- ✅ Digite novo código

### "Muitas tentativas. Aguarde..."
- Firebase está protegendo contra abuso
- Espere 10-15 minutos e tente novamente

### "Número de telefone inválido"
- Formatos aceitos: `+5511999999999` ou `11999999999`
- Com DDD (código de área de 2 dígitos)

### Não chegou o SMS
- Aguarde até 60 segundos
- Procure em SPAM
- Tente novamente
- Use Firebase Emulator para teste

---

## 🔍 Debug

### Ver logs no navegador
```
Abrir: F12 (DevTools) → Console
Procurar por: [SMS Service] ou [AdminRegisterModal]
```

### Ver logs do servidor
```bash
npm run dev
# Procurar por logs com [SMS] ou [Email]
```

### Ativar debug detalhado
```bash
SMTP_DEBUG=true npm run dev
# Mostra detalhes SMTP no console
```

---

## 📚 Arquivos Principais

```
src/
├── services/
│   └── firebase-sms-service.ts    ← Lógica de SMS
├── hooks/
│   └── use-sms-otp.ts             ← Hook React
└── components/admin/
    └── AdminRegisterModal.tsx      ← Componente pronto

docs/
├── SMS_FIREBASE_IMPLEMENTATION.md  ← Guia técnico
├── SMS_RESUMO_IMPLEMENTACAO.md    ← Este resumo
└── DIAGNOSTICO_EMAIL_SMS_OTP.md   ← Troubleshooting
```

---

## ✅ Checklist de Teste

- [ ] Enviar OTP (sucesso)
- [ ] Receber SMS
- [ ] Digitar código correto (sucesso)
- [ ] Digitar código errado (erro)
- [ ] Reenviar código (sucesso)
- [ ] Criar conta (sucesso)
- [ ] Receber email de verificação
- [ ] Fazer login com email verificado (sucesso)

---

## 🎉 Pronto!

Seu sistema de SMS com Firebase está 100% funcional!

**Próximas melhorias:**
- WhatsApp OTP (opcional)
- 2FA com SMS
- Recuperação de conta

**Dúvidas?**  
Veja [SMS_FIREBASE_IMPLEMENTATION.md](SMS_FIREBASE_IMPLEMENTATION.md) para guia completo.

---

**Última atualização**: 02/01/2026  
**Status**: ✅ Pronto para uso
