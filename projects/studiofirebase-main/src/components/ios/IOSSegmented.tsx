interface IOSSegmentedProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function IOSSegmented({ options, value, onChange }: IOSSegmentedProps) {
  return (
    <div style={{
      display: "flex",
      background: "var(--ios-card)",
      borderRadius: 12,
      padding: 4
    }}>
      {options.map((opt: string) => (
        <div
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            textAlign: "center",
            padding: 8,
            borderRadius: 10,
            background: value === opt ? "var(--ios-accent)" : "transparent",
            color: value === opt ? "#fff" : "inherit",
            cursor: "pointer"
          }}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}
