import { Card, CardTitle, CardContent } from '@/components/ui';

export default function ObservePage() {
  return (
    <main className="min-h-screen p-6 pb-24">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">
          📷 Add Observation
        </h1>
        <p className="text-gray-600 mb-6">
          Log species sightings and contribute to marine research
        </p>

        <Card className="mb-4">
          <CardTitle>Quick Capture</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-4xl mb-2">📸</p>
                  <p className="text-sm">Camera preview</p>
                </div>
              </div>
              <button className="w-full bg-cyan-500 text-white px-4 py-3 rounded-lg font-semibold">
                Start Camera
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">🚧 Phase 5: Camera Integration</p>
          <p className="text-sm">Coming soon...</p>
        </div>
      </div>
    </main>
  );
}
