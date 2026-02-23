import { useEffect, useState } from 'react';
import { markerRegistry } from '@bnbarak/reactai/react';
import { useDebug } from '../DebugContext.js';

export const DebugPanel = () => {
  const { turns } = useDebug();
  const [markers, setMarkers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const id = setInterval(() => setMarkers(markerRegistry.getAll()), 300);
    return () => clearInterval(id);
  }, []);

  const markerEntries = Object.entries(markers);

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        borderLeft: '2px solid black',
        fontFamily: 'monospace',
        fontSize: 11,
        background: '#fafafa',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid black',
          fontWeight: 'bold',
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
          background: 'white',
          flexShrink: 0,
        }}
      >
        Debug
      </div>

      <Section label="Markers">
        {markerEntries.length === 0 ? (
          <Empty>none</Empty>
        ) : (
          markerEntries.map(([k, v]) => (
            <Row key={k}>
              <Key>{k}</Key>
              <Val>{JSON.stringify(v)}</Val>
            </Row>
          ))
        )}
      </Section>

      <Section label="Turns">
        {turns.length === 0 ? (
          <Empty>no turns yet</Empty>
        ) : (
          turns.map((t) => (
            <div key={t.turn} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 3 }}>Turn {t.turn}</div>
              {t.intent && (
                <div
                  style={{
                    color: '#555',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    marginBottom: 4,
                    paddingLeft: 8,
                    borderLeft: '2px solid #ccc',
                  }}
                >
                  {t.intent}
                </div>
              )}
              <div style={{ color: t.success ? '#1a7a1a' : '#c00', paddingLeft: 8 }}>
                {t.success ? `✓ ${t.key} → ${JSON.stringify(t.patch)}` : `✗ ${t.error ?? 'failed'}`}
              </div>
            </div>
          ))
        )}
      </Section>
    </div>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>
    <div
      style={{
        fontWeight: 'bold',
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#888',
        marginBottom: 8,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>{children}</div>
);

const Key = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#888', flexShrink: 0 }}>{String(children)}:</span>
);

const Val = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#222', wordBreak: 'break-all' }}>{String(children)}</span>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#bbb', fontStyle: 'italic' }}>{children}</span>
);
