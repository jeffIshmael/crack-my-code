import dynamic from 'next/dynamic';

function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'linear-gradient(180deg, #4ab8e8 0%, #2a8fc2 100%)',
        gap: 16,
      }}
    >
      {/* Light-weight loading UI for faster LCP while the main app chunk loads */}
      <img
        src="/logo.webp"
        alt="Crack My Code"
        width={120}
        height={120}
        style={{ borderRadius: 24 }}
      />
      <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, opacity: 0.8 }}>Loading…</p>
    </div>
  );
}

const GameApp = dynamic(() => import('./GameApp'), {
  ssr: false,
  loading: () => <LoadingFallback />,
});

export default function Page() {
  return <GameApp />;
}
