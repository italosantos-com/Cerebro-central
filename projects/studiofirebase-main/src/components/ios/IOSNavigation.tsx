interface IOSNavigationProps {
  title: string;
}

export default function IOSNavigation({ title }: IOSNavigationProps) {
  return (
    <div style={{
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 20
    }}>
      {title}
    </div>
  );
}
