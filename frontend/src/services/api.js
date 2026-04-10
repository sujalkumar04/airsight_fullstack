import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Get PM2.5 forecast for a location.
 * @param {Object} params - { lat, lon, pm_today, pm_1d, pm_2d, pm_3d, ... }
 */
export async function getForecast(params) {
  const { data } = await api.post('/predict', params);
  return data;
}

/**
 * Check API health.
 */
export async function checkHealth() {
  const { data } = await api.get('/health');
  return data;
}

/**
 * Detect anomalies in a list of PM2.5 values.
 * @param {number[]} values
 */
export async function detectAnomalies(values) {
  const { data } = await api.post('/anomalies', { values });
  return data;
}

export default api;
