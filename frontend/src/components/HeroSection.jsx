import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, Crosshair } from 'lucide-react';

export default function HeroSection({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geocode city name using Nominatim
  const geocode = async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data.map(d => ({
        name: d.display_name,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
      })));
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocode(val), 400);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.name.split(',')[0]); // short name
    setShowSuggestions(false);
    onSearch({ lat: suggestion.lat, lon: suggestion.lon, name: suggestion.name.split(',')[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
    } else {
      // Try parsing as "lat, lon"
      const parts = query.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        onSearch({ lat: parts[0], lon: parts[1], name: `${parts[0].toFixed(2)}, ${parts[1].toFixed(2)}` });
      }
    }
  };

  // Quick access city buttons
  const quickCities = [
    { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  ];

  return (
    <section className="hero-gradient relative overflow-hidden py-20 sm:py-28 px-4">
      {/* Decorative particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-medium mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
          XGBoost-Powered · R² = 0.979 Accuracy
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-4 animate-fade-in-up">
          Global Air Quality{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Forecasting
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-1">
          Predict PM2.5 concentrations 24h, 48h, and 72h ahead for any location on Earth.
          Powered by 7 years of satellite data and ensemble ML models.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto animate-fade-in-up stagger-2" ref={wrapperRef}>
          <div className="relative flex items-center glass rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-400/40 transition-all shadow-lg shadow-black/30">
            <MapPin className="absolute left-4 w-5 h-5 text-slate-400" />
            <input
              id="location-search"
              type="text"
              placeholder="Search city or enter lat, lon..."
              value={query}
              onChange={handleInputChange}
              className="w-full bg-transparent text-white placeholder:text-slate-500 py-4 pl-12 pr-36 outline-none text-sm sm:text-base"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !query}
              className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Forecast</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden shadow-2xl shadow-black/40 z-20 animate-fade-in">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-cyan-400/10 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
                >
                  <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-xs text-slate-500 flex-shrink-0">
                    {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Quick City Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 animate-fade-in-up stagger-3">
          <span className="text-xs text-slate-500 mr-1">Quick:</span>
          {quickCities.map((city) => (
            <button
              key={city.name}
              onClick={() => {
                setQuery(city.name);
                onSearch(city);
              }}
              className="px-3 py-1 text-xs rounded-full border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
