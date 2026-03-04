'use client';

interface DateNativeProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function DateNative({ value, onChange, label = 'Data de Nascimento' }: DateNativeProps) {
  return (
    <div className="ios-section">
      <div className="ios-section-title">{label}</div>
      <div className="ios-input-wrapper">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ios-date-input"
        />
      </div>
    </div>
  );
}
