import React from 'react'
import { useStateWithAi } from '@bnbarak/reactai/react'
import { SettingsProfile } from '../components/SettingsProfile.js'

type Tab = 'profile' | 'notifications' | 'appearance'

const TABS: Tab[] = ['profile', 'notifications', 'appearance']

export const SettingsPage = () => {
  const [state, setState, aiRef] = useStateWithAi(
    'Settings tab navigation',
    { activeTab: 'profile' as Tab },
    { activeTab: TABS },
  )

  const tab = state.activeTab

  return (
    <div ref={aiRef as React.RefObject<HTMLDivElement>} style={{ padding: 40, maxWidth: 560 }}>
      <h2 style={{ margin: '0 0 24px', fontFamily: 'monospace', fontSize: 18 }}>Settings</h2>

      <div style={{ display: 'flex', borderBottom: '1px solid black', marginBottom: 32 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setState({ activeTab: t })}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderBottom: tab === t ? '2px solid black' : '2px solid transparent',
              background: 'none',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: tab === t ? 'bold' : 'normal',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'profile' && <SettingsProfile />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'appearance' && <AppearanceTab />}
    </div>
  )
}

const NotificationsTab = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'monospace', fontSize: 13 }}>
      {[
        ['Email digests', true],
        ['Push notifications', false],
        ['Weekly summary', true],
        ['Security alerts', true],
      ].map(([label, on]) => (
        <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked={on as boolean} style={{ width: 14, height: 14 }} />
          {label}
        </label>
      ))}
    </div>
  )
}

const AppearanceTab = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'monospace', fontSize: 13 }}>
      {[
        ['Compact', 'Tighter spacing for more content'],
        ['Default', 'Balanced spacing and readability'],
        ['Comfortable', 'Extra spacing for focus'],
      ].map(([label, desc], i) => (
        <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input type="radio" name="density" defaultChecked={i === 1} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{label}</div>
            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{desc}</div>
          </div>
        </label>
      ))}
    </div>
  )
}
