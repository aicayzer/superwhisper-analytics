import { createHashRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { ChartView } from './screens/ChartView'
import { Language } from './screens/Language'
import { Overview } from './screens/overview'
import { Settings } from './screens/Settings'
import { TranscriptDetail } from './screens/TranscriptDetail'
import { TranscriptsList } from './screens/TranscriptsList'
import { Usage } from './screens/Usage'

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'transcripts', element: <TranscriptsList /> },
      { path: 'transcripts/:id', element: <TranscriptDetail /> },
      { path: 'usage', element: <Usage /> },
      { path: 'language', element: <Language /> },
      { path: 'chart/:slug', element: <ChartView /> },
      { path: 'settings', element: <Settings /> }
    ]
  }
])
