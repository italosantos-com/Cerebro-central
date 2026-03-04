'use client';

import { useState } from 'react';
import { countries, statesBR, citiesBR } from '../../../lib/geo';

interface LocationPickerProps {
  country: string;
  state?: string;
  city?: string;
  onCountryChange: (value: string) => void;
  onStateChange?: (value: string) => void;
  onCityChange?: (value: string) => void;
}

export function LocationPicker({
  country,
  state = '',
  city = '',
  onCountryChange,
  onStateChange = () => {},
  onCityChange = () => {},
}: LocationPickerProps) {
  const [showState, setShowState] = useState(false);
  const [showCity, setShowCity] = useState(false);

  const availableStates = statesBR;
  const availableCities = city && state ? (citiesBR[state] || []) : [];

  return (
    <div className="ios-section">
      <div className="ios-section-title">Localização</div>

      {/* Seletor de País */}
      <div className="ios-input-wrapper">
        <select
          className="ios-select"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
        >
          <option value="">País</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Seletor de Estado (apenas para Brasil) */}
      {country === 'Brasil' && (
        <div className="ios-input-wrapper">
          <select
            className="ios-select"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
          >
            <option value="">Estado</option>
            {availableStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Seletor de Cidade */}
      {country === 'Brasil' && state && availableCities.length > 0 && (
        <div className="ios-input-wrapper">
          <select
            className="ios-select"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
          >
            <option value="">Cidade</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
