import { TrendingUp, TrendingDown, Shield, Clock } from 'lucide-react';

const HORIZON_META = {
  '24h': { label: '24 Hour', icon: Clock, description: 'Tomorrow' },
  '48h': { label: '48 Hour', icon: TrendingUp, description: '2 Days' },
  '72h': { label: '72 Hour', icon: TrendingDown, description: '3 Days' },
};

export default function ForecastCard({ horizon, data, index = 0 }) {
  if (!data) return null;

  const meta = HORIZON_META[horizon];
  const Icon = meta.icon;

  // Map backend color to Tailwind classes for the accent stripe
  const colorMap = {
    '#22d3ee': { bg: 'bg-cyan-400', text: 'text-cyan-400', glow: 'shadow-cyan-400/20' },
    '#facc15': { bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/20' },
    '#fb923c': { bg: 'bg-orange-400', text: 'text-orange-400', glow: 'shadow-orange-400/20' },
    '#f87171': { bg: 'bg-red-400', text: 'text-red-400', glow: 'shadow-red-400/20' },
    '#c084fc': { bg: 'bg-purple-400', text: 'text-purple-400', glow: 'shadow-purple-400/20' },
    '#ff4444': { bg: 'bg-red-500', text: 'text-red-500', glow: 'shadow-red-500/20' },
  };

  const colors = colorMap[data.color] || colorMap['#22d3ee'];

  return (
    <div
      className={`forecast-card relative overflow-hidden p-6 opacity-0 animate-fade-in-up stagger-${index + 1}`}
    >
      {/* Accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.bg}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center ${colors.glow} shadow-lg`}>
            <Icon className={`w-4 h-4 ${colors.text}`} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{meta.label}</p>
            <p className="text-[10px] text-slate-500">{meta.description}</p>
          </div>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide`}
          style={{
            backgroundColor: `${data.color}18`,
            color: data.color,
            border: `1px solid ${data.color}30`,
          }}
        >
          {data.label}
        </div>
      </div>

      {/* PM2.5 Value */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {data.pm25}
          </span>
          <span className="text-sm text-slate-400">µg/m³</span>
        </div>
      </div>

      {/* Confidence Interval */}
      {data.confidence && (
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">
            95% CI: {data.confidence.lower} – {data.confidence.upper} µg/m³
          </span>
        </div>
      )}

      {/* Advice */}
      <div className="pt-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-400 leading-relaxed">
          💡 {data.advice}
        </p>
      </div>
    </div>
  );
}
