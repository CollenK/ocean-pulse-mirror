# Ocean PULSE Progressive Web App (PWA) Implementation Guide
## Mobile-First Marine Conservation Platform

**Version:** 1.0  
**Date:** December 16, 2024  
**Target:** iOS, Android, Desktop via single codebase

---

## EXECUTIVE SUMMARY

Ocean PULSE is **perfectly suited for PWA architecture** because:

✅ **Users are mobile** - Researchers, tourists, divers access MPAs on phones  
✅ **Offline capability** - Works without internet on boats/remote locations  
✅ **Install to homescreen** - Feels like native app without app stores  
✅ **Push notifications** - Alert users to MPA health changes  
✅ **Camera integration** - Capture species observations directly  
✅ **Geolocation** - Find nearest MPAs automatically  
✅ **No app store approval** - Deploy updates instantly  

**Cost advantage:** One PWA codebase = iOS + Android + Desktop (vs. 3 separate native apps)

---

## 1. PWA ARCHITECTURE OVERVIEW

### 1.1 Progressive Web App Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│                    PWA FEATURE MATRIX                        │
├──────────────────────┬──────────────┬──────────────────────┤
│ Feature              │ Support      │ Ocean PULSE Usage    │
├──────────────────────┼──────────────┼──────────────────────┤
│ Installable          │ ✓ All        │ Add to homescreen    │
│ Offline Mode         │ ✓ All        │ Cached MPA data      │
│ Push Notifications   │ ✓ Android/PC │ MPA health alerts    │
│                      │ ⚠ iOS        │                      │
│ Background Sync      │ ✓ Android/PC │ Upload observations  │
│ Camera Access        │ ✓ All        │ Species photos       │
│ Geolocation          │ ✓ All        │ Find nearby MPAs     │
│ Share API            │ ✓ All        │ Share MPA data       │
│ App-like Feel        │ ✓ All        │ Full-screen mode     │
└──────────────────────┴──────────────┴──────────────────────┘
```

### 1.2 Technical Stack for PWA

**Core Technologies:**
- Next.js 14 (React framework with PWA support)
- TypeScript
- Tailwind CSS (mobile-first responsive)
- Workbox (service worker management)
- next-pwa (PWA plugin for Next.js)

**PWA-Specific Libraries:**
```json
{
  "dependencies": {
    "next": "14.0.0",
    "next-pwa": "^5.6.0",
    "workbox-window": "^7.0.0",
    "idb": "^7.1.1",
    "react-device-detect": "^2.2.3"
  }
}
```

---

## 2. MOBILE-FIRST DESIGN PRINCIPLES

### 2.1 Touch-Optimized Interface

**Critical Requirements:**
- Minimum touch target: 44×44px (iOS), 48×48px (Android)
- Swipe gestures for navigation
- Pull-to-refresh for data updates
- Bottom navigation for thumb reach
- Large, tappable map controls

### 2.2 Performance Targets (Mobile)

```
METRIC                  TARGET      WHY
─────────────────────────────────────────────────────
First Contentful Paint  < 1.8s      User sees something
Largest Contentful Paint < 2.5s     Main content visible
Time to Interactive     < 3.8s      App is usable
Cumulative Layout Shift < 0.1       No jarring shifts
First Input Delay       < 100ms     Responds instantly
Bundle Size             < 200KB     Fast on 3G networks
```

### 2.3 Responsive Breakpoints

```css
/* Mobile First Approach */
:root {
  /* Base: Mobile (320px - 640px) */
  --nav-height: 56px;
  --card-padding: 12px;
  --font-size-base: 14px;
}

@media (min-width: 640px) {
  /* Tablet */
  --nav-height: 64px;
  --card-padding: 16px;
  --font-size-base: 15px;
}

@media (min-width: 1024px) {
  /* Desktop */
  --nav-height: 72px;
  --card-padding: 20px;
  --font-size-base: 16px;
}
```

---

## 3. PWA IMPLEMENTATION

### 3.1 Manifest Configuration

```json
// public/manifest.json
{
  "name": "Ocean PULSE - Marine Protected Area Monitor",
  "short_name": "Ocean PULSE",
  "description": "Real-time MPA health monitoring and species tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F8FAFB",
  "theme_color": "#002557",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Ocean PULSE Dashboard"
    },
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Ocean PULSE Desktop View"
    }
  ],
  "shortcuts": [
    {
      "name": "Find Nearby MPAs",
      "short_name": "Nearby",
      "description": "Find MPAs near your location",
      "url": "/nearby",
      "icons": [{ "src": "/icons/nearby-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Add Observation",
      "short_name": "Observe",
      "description": "Log a species observation",
      "url": "/observe",
      "icons": [{ "src": "/icons/camera-96x96.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["education", "lifestyle", "productivity"],
  "iarc_rating_id": "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7"
}
```

### 3.2 Next.js PWA Configuration

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.obis\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'obis-api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'esri-tiles-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60
        }
      }
    }
  ]
})

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api.obis.org', 'server.arcgisonline.com']
  }
})
```

### 3.3 Service Worker Registration

```typescript
// app/layout.tsx
'use client'
import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                if (confirm('New version available! Reload to update?')) {
                  window.location.reload()
                }
              }
            })
          })
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])
  
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#002557" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## 4. OFFLINE FUNCTIONALITY

### 4.1 Offline Storage Strategy

```typescript
// lib/offline-storage.ts
import { openDB, DBSchema } from 'idb'

interface OceanPulseDB extends DBSchema {
  'mpas': {
    key: string
    value: {
      id: string
      name: string
      bounds: number[][]
      data: any
      lastUpdated: number
    }
  }
  'species-data': {
    key: string
    value: {
      mpaId: string
      species: any[]
      totalRecords: number
      lastUpdated: number
    }
  }
  'observations': {
    key: number
    value: {
      id: number
      mpaId: string
      photo: Blob
      location: { lat: number; lng: number }
      notes: string
      timestamp: number
      synced: boolean
    }
    indexes: { 'by-sync-status': 'synced' }
  }
}

export async function initDB() {
  return openDB<OceanPulseDB>('ocean-pulse-db', 1, {
    upgrade(db) {
      // MPA data store
      db.createObjectStore('mpas', { keyPath: 'id' })
      
      // Species data store
      db.createObjectStore('species-data', { keyPath: 'mpaId' })
      
      // User observations store
      const obsStore = db.createObjectStore('observations', { 
        keyPath: 'id', 
        autoIncrement: true 
      })
      obsStore.createIndex('by-sync-status', 'synced')
    }
  })
}

// Save MPA data for offline use
export async function cacheMPAData(mpaId: string, data: any) {
  const db = await initDB()
  await db.put('mpas', {
    id: mpaId,
    ...data,
    lastUpdated: Date.now()
  })
}

// Get cached MPA data
export async function getCachedMPA(mpaId: string) {
  const db = await initDB()
  return db.get('mpas', mpaId)
}

// Save observation for later sync
export async function saveObservation(observation: any) {
  const db = await initDB()
  return db.add('observations', {
    ...observation,
    synced: false,
    timestamp: Date.now()
  })
}

// Get unsynced observations
export async function getUnsyncedObservations() {
  const db = await initDB()
  const index = db.transaction('observations').store.index('by-sync-status')
  return index.getAll(false)
}
```

### 4.2 Network Status Detection

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  
  useEffect(() => {
    setIsOnline(navigator.onLine)
    
    // Detect connection type
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (connection) {
      setConnectionType(connection.effectiveType)
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType)
      })
    }
    
    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger background sync
      if ('serviceWorker' in navigator && 'sync' in window) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync.register('sync-observations')
        })
      }
    }
    
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return { isOnline, connectionType }
}
```

### 4.3 Offline UI Indicators

```typescript
// components/OfflineIndicator.tsx
'use client'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function OfflineIndicator() {
  const { isOnline, connectionType } = useNetworkStatus()
  
  if (isOnline && connectionType !== 'slow-2g' && connectionType !== '2g') {
    return null
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm">
      {!isOnline ? (
        '📡 You are offline. Viewing cached data.'
      ) : (
        `⚠️ Slow connection detected (${connectionType}). Using cached data when possible.`
      )}
    </div>
  )
}
```

---

## 5. MOBILE-SPECIFIC FEATURES

### 5.1 Geolocation Integration

```typescript
// hooks/useGeolocation.ts
import { useState, useEffect } from 'react'

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }
    
    const watchId = navigator.geolocation.watchPosition(
      position => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
      },
      error => {
        setError(error.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
  
  return { location, error, loading }
}
```

```typescript
// app/nearby/page.tsx
'use client'
import { useGeolocation } from '@/hooks/useGeolocation'
import { findNearestMPAs } from '@/lib/mpa-service'

export default function NearbyMPAsPage() {
  const { location, error, loading } = useGeolocation()
  const [nearbyMPAs, setNearbyMPAs] = useState([])
  
  useEffect(() => {
    if (location) {
      findNearestMPAs(location.lat, location.lng, 5).then(setNearbyMPAs)
    }
  }, [location])
  
  if (loading) return <div>Finding your location...</div>
  if (error) return <div>Location access denied: {error}</div>
  
  return (
    <div>
      <h1>MPAs Near You</h1>
      {nearbyMPAs.map(mpa => (
        <MPACard key={mpa.id} mpa={mpa} distance={mpa.distance} />
      ))}
    </div>
  )
}
```

### 5.2 Camera Integration for Observations

```typescript
// components/CameraCapture.tsx
'use client'
import { useState, useRef } from 'react'
import { saveObservation } from '@/lib/offline-storage'

export function CameraCapture({ mpaId }: { mpaId: string }) {
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [notes, setNotes] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } // Use back camera
    })
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }
  
  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video && canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      
      canvas.toBlob(blob => {
        if (blob) setPhoto(blob)
      }, 'image/jpeg', 0.95)
    }
  }
  
  const saveObservationData = async () => {
    if (!photo) return
    
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject)
    })
    
    await saveObservation({
      mpaId,
      photo,
      location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      },
      notes,
      timestamp: Date.now(),
      synced: false
    })
    
    alert('Observation saved! Will sync when online.')
  }
  
  return (
    <div className="camera-capture">
      <video ref={videoRef} autoPlay playsInline className="w-full" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="controls">
        <button onClick={startCamera}>Start Camera</button>
        <button onClick={capturePhoto}>Capture</button>
      </div>
      
      {photo && (
        <div className="preview">
          <img src={URL.createObjectURL(photo)} alt="Captured" />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this observation..."
          />
          <button onClick={saveObservationData}>Save Observation</button>
        </div>
      )}
    </div>
  )
}
```

### 5.3 Touch Gestures

```typescript
// hooks/useSwipeGesture.ts
import { useState, useEffect, TouchEvent } from 'react'

interface SwipeConfig {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // Minimum distance in pixels
}

export function useSwipeGesture(config: SwipeConfig) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const threshold = config.threshold || 50
  
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
  }
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }
    
    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    
    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        config.onSwipeRight?.()
      } else {
        config.onSwipeLeft?.()
      }
    }
    
    // Vertical swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        config.onSwipeDown?.()
      } else {
        config.onSwipeUp?.()
      }
    }
    
    setTouchStart(null)
  }
  
  return { handleTouchStart, handleTouchEnd }
}
```

### 5.4 Pull-to-Refresh

```typescript
// components/PullToRefresh.tsx
'use client'
import { useState } from 'react'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [isPulling, setIsPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
    onSwipeDown: async () => {
      if (window.scrollY === 0 && !refreshing) {
        setIsPulling(true)
        setRefreshing(true)
        await onRefresh()
        setRefreshing(false)
        setIsPulling(false)
      }
    },
    threshold: 100
  })
  
  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {(isPulling || refreshing) && (
        <div className="pull-indicator">
          {refreshing ? '🔄 Refreshing...' : '⬇️ Pull to refresh'}
        </div>
      )}
    </div>
  )
}
```

---

## 6. MOBILE UI COMPONENTS

### 6.1 Bottom Navigation

```typescript
// components/BottomNav.tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function BottomNav() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/', icon: '🗺️', label: 'Map' },
    { href: '/nearby', icon: '📍', label: 'Nearby' },
    { href: '/observe', icon: '📷', label: 'Observe' },
    { href: '/profile', icon: '👤', label: 'Profile' }
  ]
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              pathname === item.href
                ? 'text-cyan-600'
                : 'text-gray-600'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

### 6.2 Mobile-Optimized Map

```typescript
// components/Map/MobileMap.tsx
'use client'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'

function LocationMarker() {
  const { location } = useGeolocation()
  const map = useMap()
  
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 13)
    }
  }, [location, map])
  
  return location ? (
    <Marker position={[location.lat, location.lng]}>
      <Popup>You are here</Popup>
    </Marker>
  ) : null
}

export function MobileMap() {
  const [mapHeight, setMapHeight] = useState('100vh')
  
  useEffect(() => {
    // Adjust for mobile browser chrome
    const updateHeight = () => {
      setMapHeight(`${window.innerHeight}px`)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])
  
  return (
    <div style={{ height: mapHeight }} className="relative">
      <MapContainer
        center={[0, 20]}
        zoom={2}
        zoomControl={false} // Custom controls for mobile
        className="h-full w-full"
      >
        <TileLayer url="https://server.arcgisonline.com/..." />
        <LocationMarker />
        
        {/* Mobile-friendly zoom controls */}
        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
          <button className="bg-white rounded-full w-12 h-12 shadow-lg text-2xl">
            +
          </button>
          <button className="bg-white rounded-full w-12 h-12 shadow-lg text-2xl">
            −
          </button>
          <button className="bg-white rounded-full w-12 h-12 shadow-lg text-2xl">
            📍
          </button>
        </div>
      </MapContainer>
    </div>
  )
}
```

---

## 7. INSTALLATION PROMPTS

### 7.1 Install Prompt Component

```typescript
// components/InstallPrompt.tsx
'use client'
import { useState, useEffect } from 'react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show prompt after user has used app for 30 seconds
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  
  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted install')
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }
  
  if (!showPrompt) return null
  
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-navy-600 text-white p-4 rounded-lg shadow-xl z-50">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🌊</span>
        <div className="flex-1">
          <h3 className="font-bold mb-1">Install Ocean PULSE</h3>
          <p className="text-sm opacity-90">
            Get quick access and work offline. No app store needed!
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-cyan-500 text-white py-2 rounded-lg font-semibold"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="px-4 py-2 rounded-lg border border-white/20"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
```

### 7.2 iOS-Specific Install Instructions

```typescript
// components/IOSInstallPrompt.tsx
'use client'
import { useState, useEffect } from 'react'

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  
  useEffect(() => {
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = ('standalone' in window.navigator) && 
                               (window.navigator as any).standalone
    
    if (isIOS && !isInStandaloneMode) {
      // Check if user dismissed before
      const dismissed = localStorage.getItem('ios-install-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 30000)
      }
    }
  }, [])
  
  const handleDismiss = () => {
    localStorage.setItem('ios-install-dismissed', 'true')
    setShowPrompt(false)
  }
  
  if (!showPrompt) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl p-6 w-full">
        <h3 className="text-xl font-bold mb-4">Install Ocean PULSE</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">1️⃣</span>
            <p>Tap the Share button <span className="inline-block">📤</span></p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">2️⃣</span>
            <p>Scroll down and tap "Add to Home Screen"</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">3️⃣</span>
            <p>Tap "Add" in the top right corner</p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="w-full bg-cyan-500 text-white py-3 rounded-lg font-semibold"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
```

---

## 8. PERFORMANCE OPTIMIZATION FOR MOBILE

### 8.1 Image Optimization

```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  }
}
```

```typescript
// Usage
import Image from 'next/image'

<Image
  src="/mpa-photo.jpg"
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  quality={75}
  sizes="(max-width: 640px) 100vw, 640px"
/>
```

### 8.2 Code Splitting

```typescript
// Dynamic imports for mobile
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/Charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})

const CameraCapture = dynamic(() => import('@/components/CameraCapture'), {
  loading: () => <div>Loading camera...</div>,
  ssr: false
})
```

### 8.3 Data Prefetching Strategy

```typescript
// Prefetch likely next actions on mobile
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function usePrefetch() {
  const router = useRouter()
  
  useEffect(() => {
    // Prefetch nearby page when user is on map
    router.prefetch('/nearby')
    
    // Prefetch observe page (likely next action)
    router.prefetch('/observe')
  }, [router])
}
```

---

## 9. TESTING ON MOBILE DEVICES

### 9.1 Local Testing Setup

```bash
# Test on physical devices

# 1. Get local IP
ipconfig getifaddr en0  # macOS
ifconfig | grep "inet " # Linux

# 2. Start dev server
npm run dev -- -H 0.0.0.0

# 3. Access from mobile
# Open: http://YOUR_IP:3000

# 4. Test PWA features
# Chrome DevTools > Application > Manifest
# Chrome DevTools > Application > Service Workers
```

### 9.2 Lighthouse CI for Mobile

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - build
  - test
  - deploy

variables:
  LIGHTHOUSE_CI_VERSION: "latest"

cache:
  paths:
    - node_modules/

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - .next/
      - out/
    expire_in: 1 hour

lighthouse:
  stage: test
  dependencies:
    - build
  script:
    - npm install -g @lhci/cli@$LIGHTHOUSE_CI_VERSION
    - npm run start &
    - sleep 10
    - lhci autorun --config=lighthouserc.json
  artifacts:
    reports:
      performance: lighthouse-report.json
    paths:
      - .lighthouseci/
    expire_in: 30 days
  only:
    - merge_requests
    - main

deploy:staging:
  stage: deploy
  script:
    - npm run deploy:staging
  environment:
    name: staging
    url: https://staging.oceanpulse.app
  only:
    - develop

deploy:production:
  stage: deploy
  script:
    - npm run deploy:production
  environment:
    name: production
    url: https://oceanpulse.app
  only:
    - main
  when: manual
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "emulatedFormFactor": "mobile",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:pwa": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## 10. DEPLOYMENT & DISTRIBUTION

### 10.1 Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure custom domain
vercel domains add oceanpulse.app

# Enable PWA in production
vercel env add NEXT_PUBLIC_PWA_ENABLED true
```

### 10.2 Alternative: Cloudflare Pages

```bash
# Build command
npm run build

# Output directory
out/

# Environment variables
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.oceanpulse.app
```

### 10.3 App Store Listing (Optional via TWA)

For users who prefer app stores, you can wrap the PWA as a Trusted Web Activity:

```
Android (Google Play):
- Use Bubblewrap to create TWA
- No additional code needed
- Automatic updates from web

iOS (App Store):
- Requires wrapper app (more complex)
- Consider PWA-first, App Store later
```

---

## 11. COST COMPARISON: PWA vs NATIVE

### 11.1 Development Costs

```
APPROACH          INITIAL      MAINTENANCE    TOTAL (YEAR 1)
────────────────────────────────────────────────────────────
PWA (Single)      €15,000      €3,000/year    €18,000
iOS Native        €25,000      €8,000/year    €33,000
Android Native    €20,000      €7,000/year    €27,000
All Native        €45,000      €15,000/year   €60,000

PWA SAVINGS: €42,000 in year 1 (70% reduction)
```

### 11.2 Feature Parity

```
FEATURE                PWA      iOS      Android
─────────────────────────────────────────────────
Offline Mode           ✓        ✓        ✓
Push Notifications     Partial  ✓        ✓
Camera Access          ✓        ✓        ✓
Geolocation           ✓        ✓        ✓
Background Sync        Limited  ✓        ✓
Bluetooth              ✓        ✓        ✓
Install Experience     Good     Best     Best
Update Speed           Instant  Delayed  Delayed
Development Speed      Fast     Slow     Slow
Cross-platform         ✓        ✗        ✗
```

**Recommendation:** Start with PWA, add native wrappers only if needed

---

## 12. IMPLEMENTATION CHECKLIST

### Phase 1: PWA Basics (Week 1-2)
- [ ] Install next-pwa
- [ ] Create manifest.json
- [ ] Design app icons (all sizes)
- [ ] Configure service worker
- [ ] Test installability
- [ ] Add offline indicator

### Phase 2: Mobile UI (Week 3-4)
- [ ] Bottom navigation
- [ ] Touch-optimized controls
- [ ] Mobile-first layouts
- [ ] Gesture support
- [ ] Pull-to-refresh
- [ ] Responsive breakpoints

### Phase 3: Offline Features (Week 5-6)
- [ ] IndexedDB setup
- [ ] Cache MPA data
- [ ] Offline species viewing
- [ ] Background sync
- [ ] Network status handling

### Phase 4: Mobile Features (Week 7-8)
- [ ] Geolocation integration
- [ ] Camera capture
- [ ] Photo upload
- [ ] Nearby MPAs finder
- [ ] Share functionality

### Phase 5: Testing & Launch
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Lighthouse audit (PWA score >90)
- [ ] Performance testing (3G)
- [ ] Install prompt testing
- [ ] Production deployment

---

## 13. MOBILE USER JOURNEY

### Scenario 1: Tourist at Beach
1. Opens Ocean PULSE on phone
2. App asks for location permission
3. Shows nearby MPAs
4. Selects closest MPA
5. Views species list offline (cached)
6. Takes photo of fish
7. Adds observation (saved locally)
8. Returns to hotel WiFi
9. Observations auto-sync

### Scenario 2: Marine Researcher on Boat
1. Installs PWA before trip
2. Downloads 5 target MPAs for offline use
3. No internet on boat for 3 days
4. Records 50 observations with photos
5. Views cached species data
6. Compares MPA health scores
7. Returns to port
8. All data syncs automatically
9. Generates report from observations

### Scenario 3: Diver Exploring Reef
1. Opens app underwater (in waterproof case)
2. App works offline
3. Views MPA boundaries on map
4. Identifies species using cached data
5. Takes underwater photos
6. Logs sightings with location tags
7. Surfaces and data syncs
8. Shares observations with dive center

---

## CONCLUSION

**Ocean PULSE as a PWA is the optimal choice because:**

✅ **Single codebase** = iOS + Android + Desktop  
✅ **€42,000 savings** vs building 3 native apps  
✅ **Instant updates** without app store approval  
✅ **Works offline** for remote marine locations  
✅ **No installation friction** for first-time users  
✅ **Camera, GPS, storage** all supported  
✅ **Progressive enhancement** from web to app-like  

**Next Steps:**
1. Review this guide with technical team
2. Set up Next.js PWA project (Day 1)
3. Test install on iOS and Android (Day 2)
4. Begin mobile-first UI development (Week 1)
5. Deploy testable PWA (Week 2)

The PWA approach allows you to launch quickly, iterate based on user feedback, and scale efficiently while maintaining a single codebase. Perfect for your €25K pilot budget!

---

**Document Version:** 1.0  
**Last Updated:** December 16, 2024  
**Next Review:** After Phase 1 completion
