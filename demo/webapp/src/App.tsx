import { SessionProvider } from '../../../bridge/src/SessionContext.js'
import { LoadingProvider } from './LoadingContext.js'
import { DebugProvider } from './DebugContext.js'
import { ChatPanel } from './components/ChatPanel.js'
import { AppLayout } from './components/AppLayout.js'
import { LoadingBar } from './components/LoadingBar.js'
import { DebugPanel } from './components/DebugPanel.js'

const App = () => {
  return (
    <SessionProvider serverUrl="http://localhost:3001/api">
      <LoadingProvider>
        <DebugProvider>
          <div
            style={{
              display: 'flex',
              height: '100vh',
              fontFamily: 'monospace',
              fontSize: 14,
              color: 'black',
              background: 'white',
              overflow: 'hidden',
            }}
          >
            <ChatPanel />
            <AppLayout activePage="portfolio" />
            <DebugPanel />
          </div>
          <LoadingBar />
        </DebugProvider>
      </LoadingProvider>
    </SessionProvider>
  )
}

export default App
