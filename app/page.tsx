'use client';

import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Feature data
const features = [
  {
    icon: 'fi-rr-map-marker',
    title: 'Discover MPAs',
    description: 'Explore Marine Protected Areas worldwide with real-time health monitoring and biodiversity data.',
    color: 'cyan',
  },
  {
    icon: 'fi-rr-fish',
    title: 'Track Species',
    description: 'Access comprehensive species databases powered by OBIS with occurrence data and conservation status.',
    color: 'coral',
  },
  {
    icon: 'fi-rr-camera',
    title: 'Submit Observations',
    description: 'Contribute to ocean science by recording sightings, habitat conditions, and environmental data.',
    color: 'yellow',
  },
  {
    icon: 'fi-rr-chart-line-up',
    title: 'Monitor Health',
    description: 'Track MPA health scores combining environmental metrics, species data, and community observations.',
    color: 'cyan',
  },
  {
    icon: 'fi-rr-wifi-slash',
    title: 'Works Offline',
    description: 'Full offline capability for field research. Sync your data automatically when back online.',
    color: 'coral',
  },
  {
    icon: 'fi-rr-users',
    title: 'Join Community',
    description: 'Connect with researchers, conservationists, and ocean enthusiasts worldwide.',
    color: 'yellow',
  },
];

// Stats data
const stats = [
  { value: '100+', label: 'Marine Protected Areas' },
  { value: '15K+', label: 'Species Tracked' },
  { value: '50+', label: 'Countries' },
  { value: '1M+', label: 'Observations' },
];

// Testimonials (used in commented-out section below, kept for future re-enable)
// const testimonials = [
//   {
//     quote: 'Ocean PULSE has transformed how we monitor reef health. The real-time data integration is invaluable.',
//     author: 'Dr. Sarah Chen',
//     role: 'Marine Biologist',
//     org: 'Coral Research Institute',
//   },
//   {
//     quote: 'Finally, a tool that works in the field. The offline capability means we never miss recording important sightings.',
//     author: 'Marcus Rivera',
//     role: 'Field Researcher',
//     org: 'Pacific Conservation',
//   },
//   {
//     quote: 'The community-contributed observations have helped us identify previously unknown migration patterns.',
//     author: 'Prof. Aiko Tanaka',
//     role: 'Research Director',
//     org: 'Ocean Sciences Lab',
//   },
// ];

function LandingNav({ mobileMenuOpen, onToggleMobile }: { mobileMenuOpen: boolean; onToggleMobile: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-balean-gray-100/50">
      <div className="container-app">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-balean-cyan via-balean-coral to-balean-yellow flex items-center justify-center shadow-lg">
              <i className="fi fi-rr-whale text-white text-lg" />
            </div>
            <div>
              <span className="font-display text-lg text-balean-navy tracking-tight">Ocean PULSE</span>
              <p className="text-xs text-balean-gray-400">by Balean</p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            <a href="https://www.balean.org/projects/68bfe9252ee300914fd4542a" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" icon={<i className="fi fi-rr-heart" />}>
                Support Us
              </Button>
            </a>
            <Link href="/ocean-pulse-app">
              <Button variant="primary" size="sm" icon={<i className="fi fi-rr-rocket-lunch" />}>
                Launch App
              </Button>
            </Link>
          </div>

          <button
            onClick={onToggleMobile}
            className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-balean-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <i className={`fi ${mobileMenuOpen ? 'fi-rr-cross-small' : 'fi-rr-menu-burger'} text-balean-navy text-lg`} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-balean-gray-100 py-4 flex flex-col gap-3">
            <a href="https://www.balean.org/projects/68bfe9252ee300914fd4542a" target="_blank" rel="noopener noreferrer" onClick={onToggleMobile}>
              <Button variant="secondary" size="sm" fullWidth icon={<i className="fi fi-rr-heart" />}>Support Us</Button>
            </a>
            <Link href="/ocean-pulse-app" onClick={onToggleMobile}>
              <Button variant="primary" size="sm" fullWidth icon={<i className="fi fi-rr-rocket-lunch" />}>Launch App</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function HeroSection({ heroRef, heroY, heroOpacity }: { heroRef: React.RefObject<HTMLDivElement | null>; heroY: MotionValue<string>; heroOpacity: MotionValue<number> }) {
  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <HeroBackground />
      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 container-app text-center text-white">
        <motion.div initial="initial" animate="animate" variants={staggerContainer} className="max-w-4xl mx-auto">
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/10">
              <span className="w-2 h-2 bg-balean-cyan rounded-full animate-pulse" />
              Powered by OBIS Ocean Data
            </span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
            Monitor Our Oceans.<br />
            <span className="bg-gradient-to-r from-balean-cyan via-balean-yellow to-balean-coral bg-clip-text text-transparent">Protect Our Future.</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Ocean PULSE connects you with real-time marine protected area data, species tracking, and community observations to drive ocean conservation.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ocean-pulse-app">
              <Button variant="yellow" size="lg" icon={<i className="fi fi-rr-rocket-lunch" />}>Get Started Free</Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white hover:text-balean-navy" icon={<i className="fi fi-rr-play" />}>See How It Works</Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-display text-balean-yellow mb-1">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <i className="fi fi-rr-angle-down text-white/40 text-2xl" />
      </motion.div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 bg-balean-navy">
      <motion.div className="absolute top-1/4 -left-20 w-96 h-96 bg-balean-cyan/20 rounded-full blur-3xl" animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-balean-coral/20 rounded-full blur-3xl" animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-balean-yellow/10 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <svg className="absolute bottom-0 left-0 right-0 w-full h-auto" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="rgba(255,255,255,0.05)" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </svg>
    </div>
  );
}

const featureColorClasses: Record<string, string> = {
  cyan: 'bg-balean-cyan/10 text-balean-cyan',
  coral: 'bg-balean-coral/10 text-balean-coral',
  yellow: 'bg-balean-yellow/20 text-balean-yellow-dark',
};

function FeaturesSection() {
  return (
    <section id="features" className="section-spacing bg-balean-off-white">
      <div className="container-app">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer} className="text-center mb-16">
          <motion.span variants={fadeInUp} className="inline-block px-4 py-1 bg-balean-cyan/10 text-balean-cyan text-sm font-medium rounded-full mb-4">Features</motion.span>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl md:text-4xl lg:text-5xl text-balean-navy mb-4">Everything You Need for<br />Ocean Conservation</motion.h2>
          <motion.p variants={fadeInUp} className="text-balean-gray-400 text-lg max-w-2xl mx-auto">A platform built for researchers, conservationists, and ocean enthusiasts to monitor and protect marine ecosystems.</motion.p>
        </motion.div>

        <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: '-50px' }} variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card variant="elevated" hover glow={feature.color as 'cyan' | 'coral' | 'yellow'} className="h-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${featureColorClasses[feature.color] || ''}`}>
                  <i className={`${feature.icon} text-2xl leading-none`} />
                </div>
                <h3 className="font-display text-xl text-balean-navy mb-2">{feature.title}</h3>
                <CardContent className="text-balean-gray-400">{feature.description}</CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const howItWorksSteps = [
  { step: '01', title: 'Explore MPAs', description: 'Browse the interactive map to discover Marine Protected Areas near you or anywhere in the world.', icon: 'fi-rr-map' },
  { step: '02', title: 'Record Observations', description: 'Document species sightings, habitat conditions, and environmental changes with photos and GPS.', icon: 'fi-rr-camera' },
  { step: '03', title: 'Track Impact', description: 'Watch health scores update with community data and see the collective impact of conservation efforts.', icon: 'fi-rr-chart-mixed' },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-spacing bg-white">
      <div className="container-app">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer} className="text-center mb-16">
          <motion.span variants={fadeInUp} className="inline-block px-4 py-1 bg-balean-coral/10 text-balean-coral text-sm font-medium rounded-full mb-4">How It Works</motion.span>
          <motion.h2 variants={fadeInUp} className="font-display text-3xl md:text-4xl lg:text-5xl text-balean-navy mb-4">Simple. Powerful. Impactful.</motion.h2>
        </motion.div>

        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer} className="grid md:grid-cols-3 gap-8 md:gap-12">
          {howItWorksSteps.map((item, index) => (
            <motion.div key={index} variants={fadeInUp} className="relative text-center">
              {index < 2 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-balean-cyan to-balean-coral opacity-20" />
              )}
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-balean-navy flex items-center justify-center relative">
                  <i className={`${item.icon} text-4xl text-white`} />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-balean-yellow rounded-full flex items-center justify-center text-balean-navy font-bold text-sm">{item.step}</span>
                </div>
                <h3 className="font-display text-xl text-balean-navy mb-3">{item.title}</h3>
                <p className="text-balean-gray-400">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="section-spacing bg-balean-off-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-balean-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-balean-coral/5 rounded-full blur-3xl" />
      </div>
      <div className="container-app relative z-10">
        <motion.div initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer} className="max-w-3xl mx-auto text-center">
          <motion.h2 variants={fadeInUp} className="font-display text-3xl md:text-4xl lg:text-5xl text-balean-navy mb-6">Ready to Make a Difference?</motion.h2>
          <motion.p variants={fadeInUp} className="text-balean-gray-400 text-lg mb-10">Join thousands of researchers, conservationists, and ocean lovers using Ocean PULSE to monitor and protect our marine ecosystems.</motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/ocean-pulse-app">
              <Button variant="primary" size="lg" icon={<i className="fi fi-rr-rocket-lunch" />}>Launch Ocean PULSE</Button>
            </Link>
            <a href="https://www.balean.org/projects/68bfe9252ee300914fd4542a" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg" icon={<i className="fi fi-rr-heart" />}>Support Us</Button>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-balean-navy text-white py-12">
      <div className="container-app">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-balean-cyan via-balean-coral to-balean-yellow flex items-center justify-center shadow-lg">
                <i className="fi fi-rr-whale text-white text-lg" />
              </div>
              <div>
                <span className="font-display text-lg tracking-tight">Ocean PULSE</span>
                <p className="text-xs text-white/50">by Balean</p>
              </div>
            </div>
            <p className="text-white/60 max-w-sm">A digital platform for ocean awareness, interaction, and impact. Built to connect the global community with marine conservation.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/ocean-pulse-app" className="hover:text-white transition-colors">App</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><span className="text-white/30 cursor-not-allowed" title="Coming Soon">API</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-white/60">
              <li><span className="text-white/30 cursor-not-allowed" title="Coming Soon">Documentation</span></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">2025 Balean. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><i className="fi fi-brands-twitter text-lg" /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><i className="fi fi-brands-instagram text-lg" /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"><i className="fi fi-brands-linkedin text-lg" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <LandingNav mobileMenuOpen={mobileMenuOpen} onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)} />
      <HeroSection heroRef={heroRef} heroY={heroY} heroOpacity={heroOpacity} />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
