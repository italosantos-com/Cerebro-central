import { SubscriptionsErrorBoundary } from './error-boundary';

export default function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionsErrorBoundary>
      {children}
    </SubscriptionsErrorBoundary>
  );
}
