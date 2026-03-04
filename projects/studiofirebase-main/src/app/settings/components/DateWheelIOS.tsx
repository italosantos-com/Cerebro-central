'use client';

import { useState } from 'react';

interface DateWheelIOSProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateWheelIOS({ value, onChange }: DateWheelIOSProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [day, setDay] = useState(value ? parseInt(value.split('-')[2]) : 1);
  const [month, setMonth] = useState(value ? parseInt(value.split('-')[1]) : 1);
  const [year, setYear] = useState(value ? parseInt(value.split('-')[0]) : 2000);

  const handleConfirm = () => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setShowPicker(false);
  };

  const formatDate = (d: number, m: number, y: number) => {
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="ios-section">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="ios-picker-trigger"
        type="button"
      >
        <span>Data de Nascimento</span>
        <span className="ios-value">{formatDate(day, month, year)}</span>
      </button>

      {showPicker && (
        <div className="ios-wheel-container">
          <div className="ios-wheel">
            <div className="ios-wheel-column">
              <div className="ios-wheel-label">Dia</div>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="ios-wheel-column">
              <div className="ios-wheel-label">Mês</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="ios-wheel-column">
              <div className="ios-wheel-label">Ano</div>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ios-wheel-actions">
            <button
              className="ios-button-cancel"
              onClick={() => setShowPicker(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="ios-button-confirm"
              onClick={handleConfirm}
              type="button"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
