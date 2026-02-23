import React from 'react';
import { motion } from 'motion/react';
import { useStateWithAi } from '@bnbarak/reactai/react';

const ALERT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  info: { bg: '#e8f4fd', color: '#0066cc', border: '#0066cc' },
  warning: { bg: '#fff8e1', color: '#b8860b', border: '#b8860b' },
  success: { bg: '#e8f5e9', color: '#2e7d32', border: '#2e7d32' },
  error: { bg: '#fdecea', color: '#c62828', border: '#c62828' },
};

const EVENT_COLORS: Record<string, string> = {
  login: '#0066cc',
  purchase: '#2e7d32',
  error: '#c62828',
  signup: '#7b1fa2',
  alert: '#b8860b',
};

export const DashboardPage = () => {
  const [alert, , alertRef] = useStateWithAi(
    'Dashboard alert banner',
    { visible: true, type: 'info', message: 'System running normally. All services operational.' },
    { type: ['info', 'warning', 'success', 'error'] },
  );

  const [kpi, , kpiRef] = useStateWithAi('Dashboard KPI metrics', {
    revenue: 128400,
    revenueChange: 12.4,
    activeUsers: 3842,
    activeUsersChange: 5.7,
    conversionRate: 4.2,
    conversionRateChange: 0.3,
    avgSession: 4.8,
    avgSessionChange: -0.2,
  });

  const [chart, , chartRef] = useStateWithAi('Dashboard weekly activity chart', {
    bars: [62, 45, 78, 55, 91, 38, 70],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });

  const [feed, , feedRef] = useStateWithAi('Dashboard recent activity feed', {
    events: [
      { id: 1, text: 'User alice signed up', time: '2m ago', type: 'signup' },
      { id: 2, text: 'Purchase #4821 completed ($89)', time: '5m ago', type: 'purchase' },
      { id: 3, text: 'Login from new device', time: '12m ago', type: 'login' },
      { id: 4, text: 'API rate limit warning', time: '18m ago', type: 'alert' },
      { id: 5, text: 'Deploy succeeded — v1.4.2', time: '34m ago', type: 'success' },
    ],
  });

  const alertStyle = ALERT_COLORS[alert.type as string] ?? ALERT_COLORS.info;

  const kpiCards = [
    {
      label: 'Revenue',
      value: `$${Number(kpi.revenue).toLocaleString()}`,
      change: kpi.revenueChange,
      unit: '%',
    },
    {
      label: 'Active Users',
      value: String(kpi.activeUsers),
      change: kpi.activeUsersChange,
      unit: '%',
    },
    {
      label: 'Conversion',
      value: `${kpi.conversionRate}%`,
      change: kpi.conversionRateChange,
      unit: 'pp',
    },
    { label: 'Avg Session', value: `${kpi.avgSession}m`, change: kpi.avgSessionChange, unit: 'm' },
  ];

  return (
    <div style={{ padding: 32, fontFamily: 'monospace', maxWidth: 860 }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>
        Analytics Dashboard
      </h2>

      {alert.visible && (
        <div
          ref={alertRef as React.RefObject<HTMLDivElement>}
          style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: alertStyle.bg,
            color: alertStyle.color,
            borderLeft: `4px solid ${alertStyle.border}`,
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{String(alert.message)}</span>
          <span
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 'bold',
            }}
          >
            {String(alert.type)}
          </span>
        </div>
      )}

      <div
        ref={kpiRef as React.RefObject<HTMLDivElement>}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {kpiCards.map((card) => {
          const change = Number(card.change);
          const isPos = change >= 0;
          return (
            <div key={card.label} style={{ border: '1px solid #ddd', padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: '#888',
                  marginBottom: 8,
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 6 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: isPos ? '#2e7d32' : '#c62828' }}>
                {isPos ? '▲' : '▼'} {Math.abs(change)}
                {card.unit} vs last week
              </div>
            </div>
          );
        })}
      </div>

      <div ref={chartRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: 16,
          }}
        >
          Weekly Activity
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            height: 140,
            padding: '0 4px',
          }}
        >
          {(chart.bars as number[]).map((val, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                gap: 6,
              }}
            >
              <motion.div
                animate={{ height: val * 1.4 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ width: '100%', background: 'black', borderRadius: 2 }}
              />
              <span style={{ fontSize: 10, color: '#888' }}>{(chart.labels as string[])[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={feedRef as React.RefObject<HTMLDivElement>}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: 12,
          }}
        >
          Recent Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(feed.events as Array<{ id: number; text: string; time: string; type: string }>).map(
            (ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  border: '1px solid #eee',
                  borderLeft: `4px solid ${EVENT_COLORS[ev.type] ?? '#888'}`,
                }}
              >
                <span style={{ flex: 1, fontSize: 13 }}>{ev.text}</span>
                <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{ev.time}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
};
