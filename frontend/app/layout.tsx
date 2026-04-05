import './globals.css'
import Sidebar from '@/components/Sidebar'
import { LanguageProvider } from '@/components/LanguageProvider'

export const metadata = {
  title: 'Chef MES - Procurement Orchestrator',
  description: 'Procurement Engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Font Awesome */}
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body className="bg-slate-100 flex h-screen overflow-hidden text-slate-800 m-0">
        <LanguageProvider>
          {/* Lateral Sidebar */}
          <Sidebar />

          {/* Main area where pages are loaded */}
          <div className="flex-1 flex flex-col h-screen min-w-0 overflow-y-auto">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}