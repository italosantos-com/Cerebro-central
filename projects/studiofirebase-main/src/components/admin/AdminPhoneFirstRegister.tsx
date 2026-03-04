"use client";

import { useEffect, useRef, useState } from "react";
import { app, isLocalhost } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";
import {
    getAuth,
    reload,
    User,
    PhoneAuthProvider,
    verifyBeforeUpdateEmail,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Minimal types for FirebaseUI loaded via CDN
interface FirebaseUIAuthUI {
    start(element: Element, config: any): void;
    delete(): Promise<void>;
    reset(): void;
}

function loadFirebaseUiFromCdn(): Promise<any> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") return reject(new Error("No window"));
        const w = window as any;
        if (w.firebaseui && w.firebaseui.auth) return resolve(w.firebaseui);

        const script = document.createElement("script");
        script.src = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.js";
        script.async = true;
        script.onload = () => {
            const ui = (window as any).firebaseui;
            if (ui && ui.auth) resolve(ui);
            else reject(new Error("firebaseui not available after script load"));
        };
        script.onerror = () => reject(new Error("Failed to load firebaseui script"));
        document.head.appendChild(script);
    });
}

function ensureFirebaseUiCss() {
    const cssHref = "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css";
    const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => (l as HTMLLinkElement).href === cssHref);
    if (!exists) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssHref;
        document.head.appendChild(link);
    }
}

type Props = {
    onComplete: (user: User) => void;
    onError?: (message: string) => void;
};

export default function AdminPhoneFirstRegister({ onComplete, onError }: Props) {
    const auth = getAuth(app);
    const phoneContainerRef = useRef<HTMLDivElement | null>(null);
    const uiRef = useRef<FirebaseUIAuthUI | null>(null);
    const [step, setStep] = useState<"phone" | "email" | "done">("phone");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [phoneLinked, setPhoneLinked] = useState<boolean>(false);
    const [emailInput, setEmailInput] = useState<string>("");
    const [emailRequested, setEmailRequested] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ui: FirebaseUIAuthUI | null = null;
        let cancelled = false;

        async function bootstrap() {
            try {
                ensureFirebaseUiCss();
                const firebaseui = await loadFirebaseUiFromCdn();

                if (isLocalhost && (auth as any).settings) {
                    try { (auth as any).settings.appVerificationDisabledForTesting = true; } catch { }
                }

                const AuthUI = firebaseui.auth.AuthUI;
                ui = AuthUI.getInstance() || new AuthUI(auth);
                uiRef.current = ui as unknown as FirebaseUIAuthUI;

                const user = auth.currentUser;
                setCurrentUser(user);
                const hasPhone = !!user?.phoneNumber;
                if (hasPhone) {
                    setPhoneLinked(true);
                    setStep("email");
                }
                setLoading(false);

                if (!cancelled) {
                    setTimeout(() => startPhoneStep(ui!), 50);
                }
            } catch (e: any) {
                const msg = e?.message || "Falha ao inicializar FirebaseUI";
                setError(msg);
                onError?.(msg);
                setLoading(false);
            }
        }

        bootstrap();

        return () => {
            cancelled = true;
            try { ui?.delete().catch(() => { }); } catch { }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function startPhoneStep(ui: FirebaseUIAuthUI) {
        if (!phoneContainerRef.current || !document.body.contains(phoneContainerRef.current)) {
            setTimeout(() => startPhoneStep(ui), 50);
            return;
        }
        ui.reset?.();
        const config: any = {
            signInFlow: "popup",
            signInOptions: [PhoneAuthProvider.PROVIDER_ID],
            callbacks: {
                signInSuccessWithAuthResult: async (authResult: any) => {
                    try {
                        const phoneUser: User = authResult.user;
                        await reload(phoneUser);
                        setCurrentUser(phoneUser);
                        const hasPhone = !!phoneUser.phoneNumber;
                        setPhoneLinked(hasPhone);
                        if (hasPhone) {
                            setStep("email");
                        }
                    } catch (e: any) {
                        const msg = e?.message || "Falha no login por telefone";
                        setError(msg);
                        onError?.(msg);
                    }
                    return false;
                },
            },
        };
        setTimeout(() => {
            if (phoneContainerRef.current) {
                ui.start(phoneContainerRef.current, config);
            }
        }, 0);
    }

    async function sendEmailVerificationLink() {
        try {
            const u = auth.currentUser || currentUser;
            if (!u) throw new Error("Usuário não autenticado");
            if (!emailInput || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailInput)) {
                throw new Error("Informe um e-mail válido");
            }
            const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=/admin`;
            await verifyBeforeUpdateEmail(u, emailInput, {
                url: actionUrl,
                handleCodeInApp: true,
            });
            setEmailRequested(true);
        } catch (e: any) {
            const msg = e?.message || "Falha ao enviar verificação para o e-mail";
            setError(msg);
            onError?.(msg);
        }
    }

    const handleIAlreadyVerified = async () => {
        try {
            const u = auth.currentUser || currentUser;
            if (!u) return;
            await reload(u);
            // Após o usuário clicar no link de verificação, o e-mail do usuário será atualizado
            // e 'emailVerified' ficará true.
            if (u.email && (u as any).emailVerified) {
                setStep("done");
                onComplete(u);
            }
        } catch { }
    };

    if (loading) {
        return <div className="p-4 text-sm">Carregando autenticação...</div>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 rounded border border-destructive text-destructive text-sm">{error}</div>
            )}

            {step === "phone" && (
                <div className="space-y-2">
                    <div className="text-sm">Passo 1 de 2 — Verifique seu telefone (SMS)</div>
                    <div ref={phoneContainerRef} />
                </div>
            )}

            {step === "email" && (
                <div className="space-y-3">
                    <div className="text-sm">Passo 2 de 2 — Informe seu e-mail e confirme pelo link enviado</div>
                    <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={sendEmailVerificationLink}>Enviar verificação</Button>
                        {emailRequested && (
                            <Button size="sm" variant="secondary" onClick={handleIAlreadyVerified}>Já verifiquei</Button>
                        )}
                    </div>
                </div>
            )}

            {step === "done" && (
                <div className="text-sm text-green-600">Telefone verificado e e-mail confirmado com sucesso.</div>
            )}
        </div>
    );
}
