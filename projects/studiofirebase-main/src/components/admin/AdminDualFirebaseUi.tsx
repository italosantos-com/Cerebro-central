"use client";

import { useEffect, useRef, useState } from "react";
import { app, isLocalhost } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";
import {
    getAuth,
    sendEmailVerification,
    reload,
    linkWithCredential,
    User,
    EmailAuthProvider,
    PhoneAuthProvider,
} from "firebase/auth";
import { Button } from "@/components/ui/button";

// Minimal types for FirebaseUI loaded via CDN
interface FirebaseUIAuthUI {
    start(element: Element, config: any): void;
    delete(): Promise<void>;
    reset(): void;
}

// Load FirebaseUI from CDN at runtime
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

export default function AdminDualFirebaseUi({ onComplete, onError }: Props) {
    const auth = getAuth(app);
    const emailContainerRef = useRef<HTMLDivElement | null>(null);
    const phoneContainerRef = useRef<HTMLDivElement | null>(null);
    const uiRef = useRef<FirebaseUIAuthUI | null>(null);
    const [step, setStep] = useState<"email" | "phone" | "done">("email");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [emailVerified, setEmailVerified] = useState<boolean>(false);
    const [phoneLinked, setPhoneLinked] = useState<boolean>(false);
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
                const verified = !!user?.emailVerified;
                const hasPhone = !!user?.phoneNumber;
                setEmailVerified(verified);
                setPhoneLinked(hasPhone);

                if (verified && hasPhone) {
                    setStep("done");
                    setLoading(false);
                    if (!cancelled && user) onComplete(user);
                    return;
                }

                setStep(verified ? "phone" : "email");
                setLoading(false);

                // Start appropriate step (delay to ensure container is mounted in Dialog portal)
                if (!cancelled) {
                    const starter = () => {
                        if (!verified) {
                            startEmailStep(ui!);
                        } else {
                            startPhoneStep(ui!);
                        }
                    };
                    setTimeout(starter, 50);
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

    async function startEmailStep(ui: FirebaseUIAuthUI) {
        // Ensure container exists and is in DOM; retry shortly if not yet mounted
        if (!emailContainerRef.current || !document.body.contains(emailContainerRef.current)) {
            setTimeout(() => startEmailStep(ui), 50);
            return;
        }
        ui.reset?.();
        const config: any = {
            signInFlow: "popup",
            signInOptions: [EmailAuthProvider.PROVIDER_ID],
            callbacks: {
                signInSuccessWithAuthResult: async (authResult: any) => {
                    const user: User = authResult.user;
                    setCurrentUser(user);
                    // Require email verification
                    await trySendVerification(user);
                    await reload(user);
                    const verified = !!user.emailVerified;
                    setEmailVerified(verified);
                    // Don't auto-advance; show 'Próximo' button to proceed to telefone
                    return false; // stay on page
                },
            },
        };
        // Small delay helps when inside portals to avoid race conditions
        setTimeout(() => {
            if (emailContainerRef.current) {
                ui.start(emailContainerRef.current, config);
            }
        }, 0);
    }

    async function trySendVerification(user: User | null) {
        try {
            if (user && !user.emailVerified) {
                const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=/admin/register`;
                await sendEmailVerification(user, {
                    url: actionUrl,
                    handleCodeInApp: true,
                });
            }
        } catch (e) {
            // Ignore; user may have rate limits
        }
    }

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
                        const phoneCred = authResult.credential; // should be PhoneAuthCredential
                        const phoneUser: User = authResult.user;
                        const base = auth.currentUser || currentUser;
                        if (!base) {
                            // If no base user, accept phone sign-in as base user
                            setCurrentUser(phoneUser);
                            setPhoneLinked(!!phoneUser.phoneNumber);
                            if (phoneUser.emailVerified && phoneUser.phoneNumber) {
                                setStep("done");
                                onComplete(phoneUser);
                            }
                            return false;
                        }

                        if (base.uid !== phoneUser.uid && phoneCred) {
                            // Link phone credential to the base (email) user
                            await linkWithCredential(base, phoneCred);
                            // Optionally delete temp phone user to avoid orphan accounts
                            try { await phoneUser.delete(); } catch { }
                            await reload(base);
                            setCurrentUser(base);
                            setPhoneLinked(!!base.phoneNumber);
                            if (base.emailVerified && base.phoneNumber) {
                                setStep("done");
                                onComplete(base);
                            }
                        } else {
                            // Same user; just ensure phone is present
                            const u = auth.currentUser || phoneUser;
                            await reload(u);
                            setPhoneLinked(!!u.phoneNumber);
                            if ((u.emailVerified ?? false) && u.phoneNumber) {
                                setStep("done");
                                onComplete(u);
                            }
                        }
                    } catch (e: any) {
                        const msg = e?.message || "Falha ao vincular telefone";
                        setError(msg);
                        onError?.(msg);
                    }
                    return false; // avoid redirects
                },
            },
        };
        setTimeout(() => {
            if (phoneContainerRef.current) {
                ui.start(phoneContainerRef.current, config);
            }
        }, 0);
    }

    const handleIAlreadyVerified = async () => {
        try {
            const u = auth.currentUser;
            if (u) {
                await reload(u);
                const verified = !!u.emailVerified;
                setEmailVerified(verified);
                if (verified) {
                    setStep("phone");
                }
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

            {step === "email" && (
                <div className="space-y-2">
                    <div className="text-sm">Passo 1 de 2 — Cadastre-se com Email e verifique seu e-mail</div>
                    <div ref={emailContainerRef} />
                    {currentUser && !emailVerified && (
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => trySendVerification(currentUser)}>Reenviar verificação</Button>
                            <Button size="sm" variant="secondary" onClick={handleIAlreadyVerified}>Já verifiquei</Button>
                        </div>
                    )}
                    {emailVerified && (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => {
                                setStep("phone");
                                const ui = uiRef.current;
                                if (ui) {
                                    // slight delay to ensure the phone container exists
                                    setTimeout(() => startPhoneStep(ui), 0);
                                }
                            }}>Próximo</Button>
                        </div>
                    )}
                </div>
            )}

            {step === "phone" && (
                <div className="space-y-2">
                    <div className="text-sm">Passo 2 de 2 — Verifique seu telefone (SMS)</div>
                    <div ref={phoneContainerRef} />
                </div>
            )}

            {step === "done" && (
                <div className="text-sm text-green-600">Email verificado e telefone vinculado com sucesso.</div>
            )}
        </div>
    );
}
