'use client';

import { motion } from 'framer-motion';
import { VerificationFeed } from '@/components/Verification/VerificationFeed';
import { Icon } from '@/components/Icon';

export default function VerifyPage() {
  return (
    <main className="min-h-screen pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-emerald-400 pt-4 pb-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-white">Verify Observations</h1>
            <p className="text-white/80 mt-1">
              Help confirm species identifications from fellow observers
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Icon name="check-circle" className="text-balean-cyan" />
            <h2 className="font-semibold text-gray-900">Awaiting Verification</h2>
          </div>
          <VerificationFeed />
        </motion.div>
      </div>
    </main>
  );
}
