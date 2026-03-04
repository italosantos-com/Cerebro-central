import { ReactNode } from "react";

interface IOSCardProps {
  children: ReactNode;
}

export default function IOSCard({ children }: IOSCardProps) {
  return <div className="ios-card">{children}</div>;
}
