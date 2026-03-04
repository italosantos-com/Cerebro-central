import { ReactNode } from "react";

interface IOSTabBarProps {
  children: ReactNode;
}

export default function IOSTabBar({ children }: IOSTabBarProps) {
  return (
    <div className="ios-tabbar">
      {children}
    </div>
  );
}
