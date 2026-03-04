interface IOSSwitchProps {
  active: boolean;
  onClick?: () => void;
}

export default function IOSSwitch({ active, onClick }: IOSSwitchProps) {
  return (
    <div
      className={`ios-switch ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    />
  );
}
