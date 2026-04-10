import ForecastCard from './ForecastCard';
import { MapPin, Activity } from 'lucide-react';

export default function ForecastDashboard({ forecasts, current, locationName, isLoading }) {
  const horizons = ['24h', '48h', '72h'];

  // Skeleton loading state
  if (isLoading) {
    return (
      <section id="forecast" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="skeleton h-8 w-64 mx-auto mb-3" />
          <div className="skeleton h-4 w-48 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="forecast-card p-6">
              <div className="skeleton h-4 w-24 mb-4" />
              <div className="skeleton h-10 w-32 mb-3" />
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!forecasts) return null;

  return (
    <section id="forecast" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 text-cyan-400 mb-2">
          <Activity className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Forecast Results</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          PM2.5 Prediction for{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {locationName}
          </span>
        </h3>
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <MapPin className="w-4 h-4" />
          <span>Current PM2.5: <strong className="text-white">{current} µg/m³</strong></span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {horizons.map((h, i) => (
          <ForecastCard key={h} horizon={h} data={forecasts[h]} index={i} />
        ))}
      </div>
    </section>
  );
}
