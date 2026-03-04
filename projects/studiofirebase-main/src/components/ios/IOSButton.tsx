import { ReactNode } from "react";

interface IOSButtonProps {
  children: ReactNode;
  onClick?: () => void;
}

export default function IOSButton({ children, onClick }: IOSButtonProps) {
  return (
    <button className="ios-button" onClick={onClick}>
      {children}
    </button>
  );
}
