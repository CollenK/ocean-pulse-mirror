export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-navy-600 mb-4">
          🌊 Ocean PULSE
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Marine Protected Area Monitor
        </p>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <p className="text-gray-700 mb-4">
            Welcome to Ocean PULSE - your gateway to monitoring marine protected areas
            and tracking ocean biodiversity.
          </p>
          <div className="flex flex-col gap-3">
            <div className="bg-ocean-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                ✓ Real-time MPA health monitoring
              </p>
            </div>
            <div className="bg-ocean-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                ✓ Species tracking & observations
              </p>
            </div>
            <div className="bg-ocean-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                ✓ Works offline on boats & remote locations
              </p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Phase 1: PWA Foundation - In Progress
        </p>
      </div>
    </main>
  );
}
