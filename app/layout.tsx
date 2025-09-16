import './globals.css'
import AuthHeader from './components/auth-header'
import ErrorBoundary from './components/error-boundary'

export const metadata = {
  title: 'Equipment Inspection',
  description: 'Fast equipment inspection tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AuthHeader />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}