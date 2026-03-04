'use client';

interface GenderPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  'Masculino',
  'Feminino',
  'Não-binário',
  'Outro',
  'Prefiro não informar'
];

export function GenderPicker({ value, onChange }: GenderPickerProps) {
  return (
    <div className="ios-section">
      <div className="ios-section-title">Gênero</div>
      <div className="ios-list">
        {options.map((option) => (
          <button
            key={option}
            className={`ios-item ${value === option ? 'ios-item-active' : ''}`}
            onClick={() => onChange(option)}
            type="button"
          >
            <span>{option}</span>
            {value === option && <span className="ios-checkmark">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
