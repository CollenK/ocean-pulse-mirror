import type { Metadata, Viewport } from 'next'
import { BottomNav } from '@/components/Navigation/BottomNav'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { Providers } from '@/components/Providers'
import { CookieConsent } from '@/components/CookieConsent'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Ocean PULSE by Balean - Marine Protected Area Monitor',
    template: '%s | Ocean PULSE',
  },
  description: 'Real-time MPA health monitoring and species tracking. Explore marine protected areas worldwide, discover marine species, and contribute to ocean conservation with Balean.',
  keywords: ['marine protected areas', 'MPA', 'ocean conservation', 'marine species', 'OBIS', 'biodiversity', 'ocean health', 'PWA', 'Balean'],
  authors: [{ name: 'Balean' }],
  creator: 'Balean',
  publisher: 'Balean',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ocean PULSE',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://oceanpulse.balean.org',
    title: 'Ocean PULSE by Balean - Marine Protected Area Monitor',
    description: 'Real-time MPA health monitoring and species tracking. Connect with the global ocean conservation community.',
    siteName: 'Ocean PULSE',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Ocean PULSE by Balean',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ocean PULSE by Balean - Marine Protected Area Monitor',
    description: 'Real-time MPA health monitoring and species tracking',
    images: ['/icons/icon-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#002557',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#002557" />

        {/* Lato Font - Primary body font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap"
          rel="stylesheet"
        />

        {/* Flaticon UIcons */}
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.0.0/uicons-solid-rounded/css/uicons-solid-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.0.0/uicons-bold-rounded/css/uicons-bold-rounded.css"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Ocean PULSE',
              description: 'Real-time MPA health monitoring and species tracking. Explore marine protected areas worldwide and discover marine species.',
              applicationCategory: 'UtilityApplication',
              operatingSystem: 'Any',
              creator: {
                '@type': 'Organization',
                name: 'Balean',
                url: 'https://balean.org',
              },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              featureList: [
                'Interactive map of Marine Protected Areas',
                'GPS-based nearby MPA discovery',
                'Marine species database search',
                'Observation recording and tracking',
                'Offline functionality',
                'Real-time MPA health monitoring',
              ],
              screenshot: '/icons/icon-512x512.png',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1250',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Providers>
          <AuthProvider>
            <AnalyticsProvider>
              <ErrorBoundary>
                <OfflineIndicator />
                {children}
                <BottomNav />
                <CookieConsent />
              </ErrorBoundary>
            </AnalyticsProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
