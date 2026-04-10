import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{d.pm25} <span className="text-xs text-slate-400">µg/m³</span></p>
      <p className="text-xs mt-1" style={{ color: d.color }}>{d.label}</p>
    </div>
  );
}

export default function TrendChart({ forecasts, current }) {
  if (!forecasts) return null;

  const data = [
    { time: 'Now', pm25: current, color: '#22d3ee', label: 'Current' },
    { time: '+24h', pm25: forecasts['24h'].pm25, color: forecasts['24h'].color, label: forecasts['24h'].label },
    { time: '+48h', pm25: forecasts['48h'].pm25, color: forecasts['48h'].color, label: forecasts['48h'].label },
    { time: '+72h', pm25: forecasts['72h'].pm25, color: forecasts['72h'].color, label: forecasts['72h'].label },
  ];

  const maxPM = Math.max(...data.map(d => d.pm25), 20);

  return (
    <section id="chart" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      <div className="chart-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">PM2.5 Trend</h4>
              <p className="text-xs text-slate-400">72-hour forecast trajectory</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400 rounded" />
              PM2.5
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400/60 rounded border-dashed" style={{ borderTop: '1px dashed' }} />
              WHO Guideline
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="pmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, Math.ceil(maxPM * 1.3)]}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={15}
                stroke="#fbbf24"
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                label={{
                  value: 'WHO 15 µg/m³',
                  position: 'right',
                  style: { fill: '#fbbf24', fontSize: 10, opacity: 0.7 }
                }}
              />
              <Area
                type="monotone"
                dataKey="pm25"
                stroke="#06b6d4"
                strokeWidth={3}
                fill="url(#pmGradient)"
                dot={{ r: 6, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 3 }}
                activeDot={{ r: 8, fill: '#06b6d4', stroke: '#22d3ee', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
