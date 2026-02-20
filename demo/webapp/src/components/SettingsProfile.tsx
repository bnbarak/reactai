import React from 'react'
import { useStateWithAi } from '../../../../bridge/src/useStateWithAi.js'

const ROW = { display: 'flex', flexDirection: 'column' as const, gap: 4 }
const LABEL = { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const, color: '#888' }
const INPUT = {
  fontSize: 15,
  fontWeight: 'bold' as const,
  fontFamily: 'monospace',
  border: 'none',
  borderBottom: '1px solid #ccc',
  outline: 'none',
  padding: '2px 0',
  background: 'transparent',
  width: '100%',
}

const LANGUAGES = ['English', 'Hebrew', 'Spanish', 'French', 'German', 'Japanese']
const TIMEZONES = ['UTC', 'US/Eastern', 'US/Pacific', 'Europe/London', 'Asia/Tokyo']

export const SettingsProfile = () => {
  const [state, setState, aiRef] = useStateWithAi(
    'User profile settings',
    { username: 'barak', language: 'English', timezone: 'UTC' },
    { language: LANGUAGES, timezone: TIMEZONES },
  )

  return (
    <div ref={aiRef as React.RefObject<HTMLDivElement>} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={ROW}>
        <span style={LABEL}>Username</span>
        <input
          style={INPUT}
          value={state.username}
          onChange={(e) => setState({ ...state, username: e.target.value })}
        />
      </div>
      <div style={ROW}>
        <span style={LABEL}>Language</span>
        <select
          style={{ ...INPUT, cursor: 'pointer' }}
          value={state.language}
          onChange={(e) => setState({ ...state, language: e.target.value })}
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div style={ROW}>
        <span style={LABEL}>Timezone</span>
        <select
          style={{ ...INPUT, cursor: 'pointer' }}
          value={state.timezone}
          onChange={(e) => setState({ ...state, timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <div style={ROW}>
        <span style={LABEL}>Email</span>
        <span style={{ ...INPUT, borderBottom: 'none' }}>user@example.com</span>
      </div>
      <div style={ROW}>
        <span style={LABEL}>Member since</span>
        <span style={{ ...INPUT, borderBottom: 'none' }}>January 2024</span>
      </div>
      <div style={ROW}>
        <span style={LABEL}>Plan</span>
        <span style={{ ...INPUT, borderBottom: 'none' }}>Pro</span>
      </div>
    </div>
  )
}
