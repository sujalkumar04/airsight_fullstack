import { Wind, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-300">
              AirSight <span className="text-cyan-400">AI</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/bytebender77/airsight-ai-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              aria-label="GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="text-[10px] text-slate-600">v2.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
