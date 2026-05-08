import { createHashRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { Overview } from './screens/Overview'
import { Placeholder } from './screens/Placeholder'
import { TranscriptDetail } from './screens/TranscriptDetail'
import { TranscriptsList } from './screens/TranscriptsList'

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'transcripts', element: <TranscriptsList /> },
      { path: 'transcripts/:id', element: <TranscriptDetail /> },
      { path: 'usage', element: <Placeholder name="Usage" /> },
      { path: 'language', element: <Placeholder name="Language" /> },
      { path: 'settings', element: <Placeholder name="Settings" /> }
    ]
  }
])
