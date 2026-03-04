"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import IOSLayout from "@/components/ios/IOSLayout";
import IOSNavigation from "@/components/ios/IOSNavigation";
import IOSCard from "@/components/ios/IOSCard";
import IOSButton from "@/components/ios/IOSButton";
import IOSSwitch from "@/components/ios/IOSSwitch";
import IOSSegmented from "@/components/ios/IOSSegmented";
import IOSAlert from "@/components/ios/IOSAlert";
import PageTransition from "@/components/ios/PageTransition";
import type { ProfileSettings } from "@/app/admin/settings/actions";
import HomePagePreview from "@/components/admin/HomePagePreview";

interface AppearanceSettings {
  textColor?: string;
  numberColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  lineColor?: string;
  neonGlowColor?: string;
  containerColor?: string;
  backgroundColor?: string;
  iconColor?: string;
  fontFamily?: string;
  fontSizePx?: number;
}

const THEME_OPTIONS = ["Light", "Dark", "System"] as const;
type ThemeMode = typeof THEME_OPTIONS[number];
const isThemeMode = (value: string): value is ThemeMode =>
  THEME_OPTIONS.includes(value as ThemeMode);

export default function Personalizacao() {
  const [user] = useAuthState(auth);
  const [modo, setModo] = useState<ThemeMode>("System");
  const [ativo, setAtivo] = useState(false);
  const [whatsappAtivo, setWhatsappAtivo] = useState(true);
  const [liveChatAtivo, setLiveChatAtivo] = useState(true);
  const [alert, setAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    textColor: "#ffffff",
    numberColor: "#ffffff",
    buttonColor: "#ffffff",
    buttonTextColor: "#000000",
    lineColor: "#4b5563",
    neonGlowColor: "#ffffff",
    containerColor: "#111111",
    backgroundColor: "#000000",
    iconColor: "#ffffff",
    fontFamily: '"Times New Roman", Times, serif',
    fontSizePx: 16
  });
  const [adminName, setAdminName] = useState<string>('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const settingsDoc = doc(db, 'admins', user.uid, 'profile', 'settings');
        const docSnap = await getDoc(settingsDoc);

        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileSettings;
          setModo(data.themeMode && isThemeMode(data.themeMode) ? data.themeMode : "System");
          setAtivo(data.highlightEnabled ?? false);
          setWhatsappAtivo(data.showWhatsappButton ?? true);
          setLiveChatAtivo(data.showLiveChatButton ?? true);

          // Load appearance settings
          if (data.appearanceSettings) {
            setAppearanceSettings(data.appearanceSettings);
          }

          // Load user profile data
          setAdminName(data.name || 'Seu Nome');
          setCoverPhotoUrl(data.coverPhotoUrl || '');
          setProfilePhotoUrl(data.profilePictureUrl || '/placeholder-photo.svg');
        }

      } catch (error) {
        console.error('Erro ao carregar configurações do WhatsApp para o usuário:', user.uid, error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      const settingsDoc = doc(db, 'admins', user.uid, 'profile', 'settings');
      const docSnap = await getDoc(settingsDoc);

      const currentSettings = docSnap.exists() ? docSnap.data() : {};

      await setDoc(settingsDoc, {
        ...currentSettings,
        themeMode: modo,
        highlightEnabled: ativo,
        showWhatsappButton: whatsappAtivo,
        showLiveChatButton: liveChatAtivo
      }, { merge: true });

      setAlert(true);
    } catch (error) {
      console.error('Erro ao salvar configurações do WhatsApp para o usuário:', user.uid, error);
    }
  };

  return (
    <IOSLayout>
      <PageTransition>

        <IOSNavigation title="Personalização" />

        <IOSCard>
          <p>Modo do Tema</p>
          <IOSSegmented
            options={[...THEME_OPTIONS]}
            value={modo}
            onChange={(value) => setModo(isThemeMode(value) ? value : "System")}
          />
        </IOSCard>

        <br />

        <IOSCard>
          <p>Ativar Destaque</p>
          <IOSSwitch
            active={ativo}
            onClick={() => setAtivo(!ativo)}
          />
        </IOSCard>

        <br />

        <IOSCard>
          <p>Ativar Ícone do WhatsApp</p>
          <IOSSwitch
            active={whatsappAtivo}
            onClick={() => setWhatsappAtivo(!whatsappAtivo)}
          />
        </IOSCard>

        <br />

        <IOSCard>
          <p>Ativar Botão Live Chat</p>
          <IOSSwitch
            active={liveChatAtivo}
            onClick={() => setLiveChatAtivo(!liveChatAtivo)}
          />
        </IOSCard>

        <br />

        <IOSButton onClick={handleSave}>
          {loading ? "Carregando..." : "Salvar Alterações"}
        </IOSButton>

        <IOSAlert
          open={alert}
          title="Sucesso"
          message="Configurações atualizadas."
          onClose={() => setAlert(false)}
        />

        <HomePagePreview
          appearanceSettings={appearanceSettings}
          name={adminName}
          coverPhotoUrl={coverPhotoUrl}
          profilePhotoUrl={profilePhotoUrl}
        />

      </PageTransition>
    </IOSLayout>
  );
}
