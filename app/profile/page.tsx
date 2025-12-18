import { Card, CardTitle, CardContent, Badge } from '@/components/ui';
import Link from 'next/link';

export default function ProfilePage() {
  return (
    <main className="min-h-screen p-6 pb-24 bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold text-navy-600 mb-2">
          👤 Profile
        </h1>
        <p className="text-gray-600 mb-6">
          Your marine conservation activity
        </p>

        <Card className="mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-navy-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              U
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-600">User</h2>
              <p className="text-gray-600 text-sm">Marine Observer</p>
              <Badge variant="info" size="sm">Member since 2024</Badge>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <CardTitle>Activity Stats</CardTitle>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-cyan-600">0</p>
                <p className="text-sm text-gray-600">Observations</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-navy-600">0</p>
                <p className="text-sm text-gray-600">MPAs Visited</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-ocean-500">0</p>
                <p className="text-sm text-gray-600">Species Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Settings</CardTitle>
          <CardContent>
            <div className="space-y-3">
              <Link href="/offline" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="font-medium">💾 Offline Data</span>
                <span className="text-gray-500 text-sm block">Manage cached MPAs</span>
              </Link>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="font-medium">🔔 Notifications</span>
                <span className="text-gray-500 text-sm block">Alert preferences</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="font-medium">ℹ️ About</span>
                <span className="text-gray-500 text-sm block">Version & info</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Ocean PULSE v1.0.0</p>
        </div>
      </div>
    </main>
  );
}
