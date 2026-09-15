'use client';

// Last line of defence: catches throws in the root layout itself, where
// error.tsx cannot reach. Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          background: '#0A0A0A',
          color: '#F5F1E6',
          textAlign: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Grandma-Jazz-Logo.webp"
          alt="Grandma Jazz"
          width={200}
          height={65}
          style={{ filter: 'grayscale(1)', opacity: 0.4 }}
        />
        <p style={{ maxWidth: '22rem', fontSize: '.95rem', lineHeight: 1.5, opacity: 0.85 }}>
          Something went wrong, dear. Give it another go.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '.55rem 1.4rem',
            border: '1px solid rgba(245,241,230,.5)',
            borderRadius: 999,
            background: 'transparent',
            color: '#F5F1E6',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
