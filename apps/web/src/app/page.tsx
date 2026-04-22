'use client';

import Link from 'next/link';

const FEATURES = [
  {
    icon: 'notifications_active',
    title: 'Real-Time Alerts',
    desc: 'Passengers get instant WhatsApp / SMS alerts when their bus is 2 km away — no more waiting at the stop.',
  },
  {
    icon: 'gps_fixed',
    title: 'Live GPS Tracking',
    desc: 'Conductors share live location continuously. Operators monitor every route from one dashboard.',
  },
  {
    icon: 'phone_in_talk',
    title: 'Automated Voice Calls',
    desc: 'Critical alerts are delivered via Exotel voice calls, ensuring no passenger misses the bus.',
  },
  {
    icon: 'bar_chart',
    title: 'Fleet Analytics',
    desc: 'Owners get route performance reports, delay heatmaps, and driver punctuality scores.',
  },
  {
    icon: 'shield',
    title: 'Role-Based Security',
    desc: 'Admin → Owner → Operator → Driver → Conductor — every action is scoped and audit-logged.',
  },
  {
    icon: 'offline_bolt',
    title: 'Offline GPS Mode',
    desc: 'Conductor app keeps tracking even without internet. Data syncs automatically when back online.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Operator sets up route', desc: 'Define stops, schedule, and assign drivers & conductors.' },
  { step: '02', title: 'Passenger subscribes', desc: 'Select your bus route and preferred stop via WhatsApp.' },
  { step: '03', title: 'Conductor starts trip', desc: 'One tap on the mobile app begins live GPS broadcasting.' },
  { step: '04', title: 'Alert fires at 2 km', desc: 'Passenger receives a WhatsApp / SMS / call automatically.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0d1117]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0b3c5d] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#a3cbf2] text-xl">directions_bus</span>
          </div>
          <span className="font-black text-lg text-[#a3cbf2] tracking-tight">THE SENTINEL</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-[#c2c7ce] hover:text-white transition-colors px-4 py-2"
          >
            Log In
          </Link>
          <Link
            href="/login?tab=signup"
            className="text-sm font-bold bg-[#a3cbf2] text-[#003353] px-5 py-2 rounded-xl hover:brightness-110 transition-all"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#0b3c5d]/40 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-[#1a5276]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[#a3cbf2] bg-[#0b3c5d]/50 border border-[#a3cbf2]/20 px-4 py-1.5 rounded-full mb-6">
            Gujarat State Bus Network
          </span>

          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 text-white">
            Never Miss Your Bus<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a3cbf2] to-[#5ba3d9]">
              Ever Again.
            </span>
          </h1>

          <p className="text-lg text-[#8c9198] max-w-xl mx-auto mb-10 leading-relaxed">
            THE SENTINEL is a real-time bus alert platform for Gujarat. Passengers get notified when
            their bus is 2 km away. Operators manage fleets from one control room.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login?tab=signup"
              className="flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold px-8 py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Get Started Free
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-[#c2c7ce] font-semibold px-6 py-4 rounded-xl border border-[#42474e] hover:border-[#a3cbf2]/40 hover:text-white transition-all text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
            {[
              { value: '2 km', label: 'Alert Radius' },
              { value: '< 5s', label: 'Notification Delay' },
              { value: '6 Roles', label: 'Access Control' },
            ].map((s) => (
              <div key={s.label} className="bg-[#181c20] border border-[#42474e]/30 rounded-2xl py-4 px-3">
                <div className="text-2xl font-black text-[#a3cbf2]">{s.value}</div>
                <div className="text-xs text-[#8c9198] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem Statement ── */}
      <section className="py-20 px-6 bg-[#101418]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#e07b39]">The Problem</span>
              <h2 className="text-3xl font-black mt-3 mb-5 text-white leading-snug">
                Passengers wait blindly.<br />Buses run without visibility.
              </h2>
              <p className="text-[#8c9198] leading-relaxed mb-4">
                In Gujarat's state bus network, passengers have no way of knowing when their bus will arrive.
                They wait 20–40 minutes at stops with zero information.
              </p>
              <p className="text-[#8c9198] leading-relaxed">
                Operators have no real-time view of their fleet. Delays cascade. Drivers get no feedback.
                The result: frustrated passengers and inefficient operations.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: 'schedule', text: 'Average wait time uncertainty: 25 minutes' },
                { icon: 'visibility_off', text: 'Zero real-time fleet visibility for operators' },
                { icon: 'sms_failed', text: 'No automated passenger communication system' },
                { icon: 'trending_down', text: 'No performance data for route optimization' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#e07b39]/20 rounded-xl p-4">
                  <span className="material-symbols-outlined text-[#e07b39]">{item.icon}</span>
                  <span className="text-sm text-[#c2c7ce]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services / Features ── */}
      <section className="py-20 px-6" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a3cbf2]">Our Solution</span>
            <h2 className="text-3xl font-black mt-3 text-white">Everything You Need, Built In</h2>
            <p className="text-[#8c9198] mt-3 max-w-lg mx-auto">
              A full-stack platform connecting passengers, conductors, drivers, operators, and agency owners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-[#181c20] border border-[#42474e]/30 rounded-2xl p-6 hover:border-[#a3cbf2]/30 hover:bg-[#1a2028] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0b3c5d]/60 flex items-center justify-center mb-4 group-hover:bg-[#0b3c5d] transition-all">
                  <span className="material-symbols-outlined text-[#a3cbf2]">{f.icon}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#8c9198] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 bg-[#101418]" id="how-it-works">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a3cbf2]">The Flow</span>
            <h2 className="text-3xl font-black mt-3 text-white">How It Works</h2>
          </div>

          <div className="relative">
            {/* connecting line */}
            <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-[#a3cbf2]/40 via-[#a3cbf2]/20 to-transparent hidden md:block" />

            <div className="space-y-6">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#0b3c5d] border border-[#a3cbf2]/20 flex items-center justify-center">
                    <span className="text-lg font-black text-[#a3cbf2]">{step.step}</span>
                  </div>
                  <div className="bg-[#181c20] border border-[#42474e]/30 rounded-2xl p-5 flex-1">
                    <h3 className="font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-[#8c9198]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#0b3c5d] flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[#a3cbf2] text-3xl">directions_bus</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-[#8c9198] mb-8">
            Join the platform already transforming Gujarat's bus network operations.
          </p>
          <Link
            href="/login?tab=signup"
            className="inline-flex items-center gap-2 bg-[#a3cbf2] text-[#003353] font-bold px-10 py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
          >
            Create Free Account
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <p className="text-xs text-[#8c9198] mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-[#a3cbf2] hover:underline">Log In</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#42474e]/30 py-8 px-6 text-center">
        <p className="text-xs text-[#8c9198]">
          © 2025 THE SENTINEL · Bus Alert System · Gujarat, India ·{' '}
          <Link href="/login" className="text-[#a3cbf2] hover:underline">Operations Portal</Link>
        </p>
      </footer>
    </div>
  );
}
