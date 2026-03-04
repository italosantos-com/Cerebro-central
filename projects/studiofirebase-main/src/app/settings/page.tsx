'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { saveProfile, getProfile } from '@/lib/saveProfile';
import { LanguageAuto } from './components/LanguageAuto';
import { GenderPicker } from './components/GenderPicker';
import { DateNative } from './components/DateNative';
import { DateWheelIOS } from './components/DateWheelIOS';
import { LocationPicker } from './components/LocationPicker';
import { ShareNative } from './components/ShareNative';

export default function SettingsPage() {
  const [user] = useAuthState(auth);

  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (user) {
      try {
        const profile = await getProfile(user.uid);
        setGender(profile.gender || '');
        setBirthDate(profile.birthDate || '');
        setCountry(profile.country || '');
        setState(profile.state || '');
        setCity(profile.city || '');
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert('Você precisa estar logado');
      return;
    }

    setLoading(true);
    try {
      await saveProfile(user.uid, {
        gender,
        birthDate,
        country,
        state,
        city
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="ios-page">
        <div className="ios-alert">
          <p>Faça login para acessar as configurações</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-page">
      <div className="ios-page-title">Configurações</div>

      {/* Seção de Idioma */}
      <div className="ios-section">
        <div className="ios-section-title">Preferências</div>
        <LanguageAuto />
      </div>

      {/* Seção de Gênero */}
      <GenderPicker value={gender} onChange={setGender} />

      {/* Seção de Data de Nascimento */}
      <DateNative value={birthDate} onChange={setBirthDate} />

      {/* Ou usar DateWheelIOS para iOS-like picker */}
      {/* <DateWheelIOS value={birthDate} onChange={setBirthDate} /> */}

      {/* Seção de Localização */}
      <LocationPicker
        country={country}
        state={state}
        city={city}
        onCountryChange={setCountry}
        onStateChange={setState}
        onCityChange={setCity}
      />

      {/* Seção de Compartilhamento */}
      <ShareNative
        title="Meu Perfil"
        text="Confira meu perfil no app!"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />

      {/* Buttons de Ação */}
      <div className="ios-section">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`ios-button-primary ${loading ? 'ios-button-loading' : ''}`}
          type="button"
        >
          {loading ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Footer */}
      <div className="ios-footer">
        <p>User: {user.email}</p>
        <p className="ios-footer-small">Última atualização: {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
