import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ForecastDashboard from './components/ForecastDashboard';
import TrendChart from './components/TrendChart';
import AnomalyBanner from './components/AnomalyBanner';
import Footer from './components/Footer';
import { getForecast, detectAnomalies } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [forecasts, setForecasts] = useState(null);
  const [current, setCurrent] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);

  const handleSearch = useCallback(async ({ lat, lon, name }) => {
    setIsLoading(true);
    setError(null);
    setForecasts(null);
    setAnomalyData(null);
    setLocationName(name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`);

    // Build payload with sensible defaults for the 21-feature model.
    // In production, these would come from a weather API.
    const now = new Date();
    const month = now.getMonth() + 1;
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

    // Baseline PM2.5 estimates by latitude band (rough global averages)
    const absLat = Math.abs(lat);
    let basePM = 25; // default moderate
    if (absLat < 15) basePM = 22;       // tropics
    else if (absLat < 30) basePM = 35;   // subtropical (Delhi, Beijing belt)
    else if (absLat < 45) basePM = 18;   // mid-latitude
    else basePM = 10;                     // higher latitudes

    // Add slight regional signal for known high-pollution areas
    if (lat > 20 && lat < 40 && lon > 70 && lon < 130) basePM = Math.max(basePM, 40); // South/East Asia
    if (lat > 25 && lat < 35 && lon > -120 && lon < -115) basePM = Math.max(basePM, 20); // LA basin

    const payload = {
      lat,
      lon,
      month,
      day_of_year: doy,
      pm_today: basePM,
      pm_1d: basePM * 0.95,
      pm_2d: basePM * 0.92,
      pm_3d: basePM * 0.90,
      pm_7d: basePM * 0.88,
      temp_c: 22,
      humidity: 55,
      wind_speed: 3.5,
      aod: 0.3,
      pressure: 101325,
      cloud: 0.4,
      elevation: 200,
    };

    try {
      const data = await getForecast(payload);

      if (data.status === 'ok') {
        setForecasts(data.forecasts);
        setCurrent(Math.round(basePM));

        // Check for anomalies using the forecast values
        const values = [
          basePM,
          data.forecasts['24h'].pm25,
          data.forecasts['48h'].pm25,
          data.forecasts['72h'].pm25,
        ];

        try {
          const anomalies = await detectAnomalies(values);
          if (anomalies.status === 'ok' && anomalies.anomalies.length > 0) {
            setAnomalyData(anomalies);
          }
        } catch {
          // Anomaly detection is non-critical, silently ignore
        }
      } else {
        setError(data.error || 'Unexpected server response');
      }
    } catch (err) {
      console.error('Forecast error:', err);
      setError(
        err.response?.data?.error ||
        err.message === 'Network Error'
          ? 'Cannot reach the API server. Make sure the Flask backend is running on port 5050.'
          : `Forecast failed: ${err.message}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection onSearch={handleSearch} isLoading={isLoading} />

        {/* Error Banner */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-slide-down">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Anomaly Alert */}
        <AnomalyBanner anomalyData={anomalyData} onDismiss={() => setAnomalyData(null)} />

        {/* Forecast Dashboard */}
        <ForecastDashboard
          forecasts={forecasts}
          current={current}
          locationName={locationName}
          isLoading={isLoading}
        />

        {/* Trend Chart */}
        {forecasts && <TrendChart forecasts={forecasts} current={current} />}
      </main>

      <Footer />
    </div>
  );
}
