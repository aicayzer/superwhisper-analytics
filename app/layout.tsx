import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { ProfileProvider } from '@/components/profile-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SuperWhisper Analytics',
  description: 'Personal analytics dashboard for your SuperWhisper recordings',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
