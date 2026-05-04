"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowRight, FaCheck } from "react-icons/fa";
import {
  RiLayoutLine, RiCalendarCheckLine, RiTicketLine,
  RiBarChartLine, RiTeamLine, RiShieldCheckLine,
  RiVipCrownLine
} from "react-icons/ri";
import RestaurantOwnerLoginModal from "@/components/RestaurantOwnerLoginModal";
import RestaurantOwnerSignupModal from "@/components/RestaurantOwnerSignupModal";
import DemoVideoModal from "@/components/DemoVideoModal";
import EnhancedSubscriptionPlans from "@/components/EnhancedSubscriptionPlans";

const V = {
  black: '#0C0B10',
  surface: '#161520',
  border: '#1E1D2A',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  cream: '#F5F0E8',
  muted: '#9B96A8',
};

const FEATURES = [
  {
    icon: RiLayoutLine,
    title: "3D Interactive Floor Plan",
    desc: "Guests browse your venue in 3D and pick exactly where they want to sit — before they arrive.",
  },
  {
    icon: RiCalendarCheckLine,
    title: "Real-Time Reservations",
    desc: "Live seat availability, instant booking confirmations, and automatic conflict prevention.",
  },
  {
    icon: RiTicketLine,
    title: "Event & Ticket Management",
    desc: "Create DJ nights, galas, wine tastings and sell tickets directly through your venue page.",
  },
  {
    icon: RiBarChartLine,
    title: "Revenue Intelligence",
    desc: "Track guest loyalty, average yield per table, and booking growth — all from one dashboard.",
  },
  {
    icon: RiTeamLine,
    title: "Staff Management",
    desc: "Invite and manage your team with role-based access. Everyone sees only what they need.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Zone-Based Pricing",
    desc: "Set different prices for VIP booths, terrace tables, or bar seating — automatically applied at checkout.",
  },
];

const STATS = [
  { value: "3D", label: "Interactive Floor Plans" },
  { value: "Live", label: "Seat Availability" },
  { value: "Zero", label: "Commission Fees" },
  { value: "24/7", label: "Booking Engine" },
];

export default function RestaurantOwnerHome() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleLoginSuccess = () => {
    router.push('/restaurant-owner/setup');
  };

  return (
    <div className="min-h-screen" style={{ background: V.black }}>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(12,11,16,0.88)', borderColor: V.border, backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${V.gold}, ${V.goldLight})` }}>
              <span className="font-black text-sm" style={{ color: V.black, fontFamily: 'serif' }}>V</span>
            </div>
            <span className="font-black text-xl tracking-tight" style={{ color: V.cream, fontFamily: 'serif' }}>Velvet</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: `${V.gold}20`, color: V.gold, border: `1px solid ${V.gold}40` }}>for Hotels</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: V.muted }}
            >
              Sign In
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSignupModal(true)}
              className="text-sm font-semibold px-5 py-2 rounded-xl"
              style={{ background: V.gold, color: V.black }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(to right, ${V.black} 45%, rgba(12,11,16,0.65) 100%)` }} />
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 28, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0"
          >
            <img
              src="/images/body-images/alexander-fae-TivEEYzzhik-unsplash (1).jpg"
              alt="Luxury Venue"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center right' }}
            />
          </motion.div>
        </div>

        <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full blur-[120px] z-10 pointer-events-none" style={{ background: `${V.gold}07` }} />

        <div className="relative z-20 max-w-7xl mx-auto px-6 py-32 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
              style={{ background: `${V.gold}18`, color: V.gold, border: `1px solid ${V.gold}35` }}
            >
              <RiVipCrownLine />
              Venue Management Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.02]"
              style={{ fontFamily: 'serif', color: V.cream }}
            >
              Turn Your Floor Plan
              <span className="block mt-2" style={{ color: V.gold }}>
                Into Revenue.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed max-w-lg"
              style={{ color: V.muted }}
            >
              Velvet gives hotels and premium venues an interactive 3D booking system — so guests choose their exact table before they walk in the door.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 mt-10"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSignupModal(true)}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base"
                style={{ background: V.gold, color: V.black, boxShadow: `0 8px 32px ${V.gold}30` }}
              >
                Start Free Trial
                <FaArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDemoModal(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base"
                style={{ background: `${V.cream}08`, color: V.cream, border: `1px solid ${V.border}` }}
              >
                Watch Demo
              </motion.button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 text-xs"
              style={{ color: V.muted }}
            >
              No credit card required · Setup in under 10 minutes · Cancel anytime
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-y" style={{ borderColor: V.border, background: V.surface }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="py-8 px-6 text-center border-r last:border-r-0"
                style={{ borderColor: V.border }}
              >
                <p className="text-3xl font-black" style={{ color: V.gold, fontFamily: 'serif' }}>{s.value}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: V.muted }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="py-28 px-6" style={{ background: V.black }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={{ color: V.gold }}>Everything You Need</p>
            <h2 className="text-4xl lg:text-5xl font-black" style={{ color: V.cream, fontFamily: 'serif' }}>
              One platform. Every tool<br />your venue requires.
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: V.muted }}>
              From the first table booking to the last event ticket — Velvet handles it all.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-6 rounded-2xl"
                style={{ background: V.surface, border: `1px solid ${V.border}` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${V.gold}15` }}>
                  <f.icon size={22} style={{ color: V.gold }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: V.cream }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: V.muted }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t" style={{ background: V.surface, borderColor: V.border }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={{ color: V.gold }}>Simple Setup</p>
            <h2 className="text-4xl font-black" style={{ color: V.cream, fontFamily: 'serif' }}>Live in three steps.</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Build Your Floor Plan", desc: "Upload your layout or use our drag-and-drop builder. Place tables, zones, and VIP areas." },
              { n: "02", title: "Set Zones & Pricing", desc: "Assign pricing tiers to different areas. Happy hour discounts, event markups — all automated." },
              { n: "03", title: "Start Accepting Bookings", desc: "Share your venue link. Guests browse in 3D, pick a table, and confirm instantly." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: `${V.gold}15`, border: `1px solid ${V.gold}30` }}>
                  <span className="text-2xl font-black" style={{ color: V.gold, fontFamily: 'serif' }}>{step.n}</span>
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: V.cream }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: V.muted }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-28 px-6 border-t" style={{ background: V.black, borderColor: V.border }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={{ color: V.gold }}>Pricing</p>
            <h2 className="text-4xl font-black" style={{ color: V.cream, fontFamily: 'serif' }}>Simple, transparent plans.</h2>
            <p className="mt-3 text-sm" style={{ color: V.muted }}>Start free. Upgrade when you're ready.</p>
          </motion.div>
          <EnhancedSubscriptionPlans />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 border-t" style={{ background: V.surface, borderColor: V.border }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl lg:text-5xl font-black mb-6" style={{ color: V.cream, fontFamily: 'serif' }}>
            Ready to elevate<br />your venue?
          </h2>
          <p className="text-base mb-10" style={{ color: V.muted }}>
            Join hotels and premium venues already using Velvet to deliver a seamless guest experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSignupModal(true)}
              className="group flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-base"
              style={{ background: V.gold, color: V.black, boxShadow: `0 8px 32px ${V.gold}30` }}
            >
              Get Started Free
              <FaArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-sm font-medium px-6 py-4 rounded-xl"
              style={{ color: V.muted, border: `1px solid ${V.border}` }}
            >
              Already have an account? Sign in
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: V.border }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${V.gold}, ${V.goldLight})` }}>
              <span className="font-black text-xs" style={{ color: V.black, fontFamily: 'serif' }}>V</span>
            </div>
            <span className="font-black text-sm" style={{ color: V.cream, fontFamily: 'serif' }}>Velvet</span>
          </div>
          <p className="text-xs" style={{ color: V.muted }}>© 2025 Velvet. All rights reserved.</p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="text-xs font-medium"
            style={{ color: V.muted }}
          >
            Owner Sign In →
          </button>
        </div>
      </footer>

      {/* Modals */}
      {showLoginModal && (
        <RestaurantOwnerLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onOpenSignupModal={() => { setShowLoginModal(false); setShowSignupModal(true); }}
        />
      )}
      {showSignupModal && (
        <RestaurantOwnerSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          onOpenLoginModal={() => { setShowSignupModal(false); setShowLoginModal(true); }}
        />
      )}
      <DemoVideoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </div>
  );
}
