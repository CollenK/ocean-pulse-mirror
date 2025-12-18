import { Card, CardTitle, CardContent } from '@/components/ui';

export default function NearbyPage() {
  return (
    <main className="min-h-screen p-6 pb-24">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">
          📍 Nearby MPAs
        </h1>
        <p className="text-gray-600 mb-6">
          Find Marine Protected Areas near your location
        </p>

        <Card className="mb-4">
          <CardTitle>Enable Location Access</CardTitle>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Allow location access to find MPAs near you
            </p>
            <button className="bg-cyan-500 text-white px-4 py-2 rounded-lg font-semibold">
              Enable Location
            </button>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">🚧 Phase 5: Geolocation Integration</p>
          <p className="text-sm">Coming soon...</p>
        </div>
      </div>
    </main>
  );
}
