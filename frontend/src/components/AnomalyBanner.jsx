import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export default function AnomalyBanner({ anomalyData, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (!anomalyData || anomalyData.anomalies.length === 0 || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-slide-down">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 animate-pulse-glow">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/80 via-red-900/60 to-orange-950/80" />

        <div className="relative flex items-start sm:items-center gap-4 p-4 sm:p-5">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-red-300 mb-0.5">
              ⚠️ Anomaly Detected — Unusual PM2.5 Levels
            </h4>
            <p className="text-xs text-red-200/70 leading-relaxed">
              {anomalyData.anomalies.length} forecast value{anomalyData.anomalies.length > 1 ? 's' : ''}{' '}
              exceed{anomalyData.anomalies.length === 1 ? 's' : ''} the 2-sigma threshold
              (±{anomalyData.std?.toFixed(1)} µg/m³ from mean {anomalyData.mean?.toFixed(1)}).
              This may indicate a pollution spike event.
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 rounded-lg text-red-300/60 hover:text-red-200 hover:bg-red-500/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
