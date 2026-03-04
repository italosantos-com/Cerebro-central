import { ReactNode } from "react";

interface IOSLayoutProps {
  children: ReactNode;
}

export default function IOSLayout({ children }: IOSLayoutProps) {
  return <div style={{ padding: 20, paddingBottom: 80 }}>{children}</div>;
}
