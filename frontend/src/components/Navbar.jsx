import { useState } from 'react';
import { Wind, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="glass sticky top-0 z-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
              AirSight <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase leading-none mt-0.5">
              PM2.5 Forecast Platform
            </p>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#forecast" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
            Dashboard
          </a>
          <a href="#chart" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
            Trends
          </a>
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden pb-4 px-2 animate-fade-in">
          <a href="#forecast" className="block py-2 px-3 text-sm text-slate-300 hover:text-cyan-400 rounded-lg hover:bg-slate-800/50 transition-colors">
            Dashboard
          </a>
          <a href="#chart" className="block py-2 px-3 text-sm text-slate-300 hover:text-cyan-400 rounded-lg hover:bg-slate-800/50 transition-colors">
            Trends
          </a>
        </div>
      )}
    </nav>
  );
}
