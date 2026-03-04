import { ReactNode } from "react";

interface IOSDatePickerProps {
  children: ReactNode;
}

export default function IOSDatePicker({ children }: IOSDatePickerProps) {
  return (
    <div style={{ padding: 20 }}>
      {children}
    </div>
  );
}
