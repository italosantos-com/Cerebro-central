"use client";

import { useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth, isLocalhost } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FirebasePhoneAuthWidget() {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState<"phone" | "code">("phone");
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const confirmationRef = useRef<ConfirmationResult | null>(null);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

    // Prepare reCAPTCHA and optional emulator testing flag
    useEffect(() => {
        // Allow bypass for emulator/testing
        try {
            if (isLocalhost && (auth as any).settings) {
                (auth as any).settings.appVerificationDisabledForTesting = true;
            }
        } catch { }

        if (typeof window === "undefined") return;

        // Avoid creating multiple verifiers
        if (!recaptchaRef.current) {
            // Create a visible reCAPTCHA widget similar to FirebaseUI default
            const RecaptchaVerifierCtor = RecaptchaVerifier as unknown as {
                new(...args: any[]): RecaptchaVerifier;
            };
            recaptchaRef.current = new RecaptchaVerifierCtor(
                auth,
                "recaptcha-container",
                {
                    size: "normal",
                    callback: () => {
                        // Called on successful solve; we don't auto-submit
                    },
                    "expired-callback": () => {
                        setMessage("reCAPTCHA expirou, por favor resolva novamente.");
                    },
                }
            );
            // Render now
            recaptchaRef.current.render().catch(() => { });
        }

        return () => {
            try {
                if (recaptchaRef.current) {
                    recaptchaRef.current.clear();
                    recaptchaRef.current = null;
                }
            } catch { }
        };
    }, []);

    async function handleSendCode() {
        setError(null);
        setMessage(null);
        if (!phone.trim()) {
            setError("Informe um número de telefone em E.164, ex: +14155552671");
            return;
        }
        setLoading("send");
        try {
            const verifier = recaptchaRef.current;
            if (!verifier) throw new Error("reCAPTCHA não inicializado");
            const result = await signInWithPhoneNumber(auth, phone, verifier);
            confirmationRef.current = result;
            setStep("code");
            setMessage("Código SMS enviado. Verifique seu telefone e digite o código abaixo.");
        } catch (e: any) {
            setError(e?.message || "Falha ao enviar SMS");
            try {
                // Reset reCAPTCHA so user can try again
                recaptchaRef.current?.render();
            } catch { }
        } finally {
            setLoading(null);
        }
    }

    async function handleVerifyCode() {
        setError(null);
        setMessage(null);
        if (!code.trim()) {
            setError("Informe o código recebido por SMS");
            return;
        }
        setLoading("verify");
        try {
            const confirmation = confirmationRef.current;
            if (!confirmation) throw new Error("Confirmação não iniciada");
            await confirmation.confirm(code);
            setMessage("Autenticado com sucesso via SMS.");
            setCode("");
            setPhone("");
            setStep("phone");
        } catch (e: any) {
            setError(e?.message || "Falha ao verificar código");
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
                Fluxo de login por SMS com reCAPTCHA (estilo FirebaseUI, mas nativo ao SDK atual).
            </div>

            {step === "phone" && (
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="phone">Telefone (com DDI)</Label>
                        <Input
                            id="phone"
                            placeholder="+14155552671"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div
                        id="recaptcha-container"
                        className="min-h-[78px] fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center"
                        style={{ width: '100px' }}
                    />
                    <Button onClick={handleSendCode} disabled={loading === "send"} className="w-full">
                        {loading === "send" ? "Enviando SMS..." : "Enviar código por SMS"}
                    </Button>
                </div>
            )}

            {step === "code" && (
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="code">Código SMS</Label>
                        <Input
                            id="code"
                            placeholder="123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleVerifyCode} disabled={loading === "verify"}>
                            {loading === "verify" ? "Verificando..." : "Verificar e entrar"}
                        </Button>
                        <Button variant="outline" onClick={() => setStep("phone")}>Trocar Número</Button>
                    </div>
                </div>
            )}

            {error && <div className="text-red-500 text-sm">{error}</div>}
            {message && <div className="text-green-600 text-sm">{message}</div>}
        </div>
    );
}
