import { SessionProvider } from '../../bridge/src/SessionContext.js'
import { DemoCard } from './components/DemoCard.js'
import { DemoBanner } from './components/DemoBanner.js'
import { DemoPrompt } from './components/DemoPrompt.js'

function App() {
  return (
    <SessionProvider serverUrl="http://localhost:3001">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
        <DemoBanner headline="Welcome to reactAI" theme="light" />

        <div style={{ marginTop: 24 }}>
          <DemoCard
            title="Getting Started"
            body="Use the prompt below to ask the AI to update any component on this page."
            buttonLabel="Learn More"
            onButtonClick={() => alert('Button clicked!')}
          />
        </div>

        <DemoPrompt />
      </div>
    </SessionProvider>
  )
}

export default App
