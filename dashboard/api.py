"""
api.py — Flask prediction API for PM2.5 forecast dashboard
Run: python3 api.py
Serves on: http://localhost:5050
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import xgboost as xgb
import os
from audit_logger import log_action, get_recent_logs
from scenario_manager import (
    create_scenario, list_scenarios, get_scenario,
    add_comment, delete_scenario
)

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB (LLD requirement)
REQUIRED_SCHEMA = ['lat', 'lon', 'pm25']  # expected columns for full validation

# ── Simple Role-Based Access (LLD: User roles) ─────────────────────────────
# Role is passed via X-User-Role header (defaults to 'Viewer')
# Roles: Admin > Planner > Viewer
ROLE_HIERARCHY = {'Admin': 3, 'Planner': 2, 'Viewer': 1}

def get_user_role():
    return request.headers.get('X-User-Role', 'Viewer')

def get_user_name():
    return request.headers.get('X-User-Name', 'Anonymous')

def require_role(min_role):
    """Check if current user has at least the required role level."""
    current = get_user_role()
    if ROLE_HIERARCHY.get(current, 0) < ROLE_HIERARCHY.get(min_role, 0):
        return False
    return True

app = Flask(__name__)
CORS(app)

# Robust Path Handling for Local and Render.com
# Find project root (one level up from dashboard/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR     = os.path.join(PROJECT_ROOT, 'models')
CSV_PATH     = os.path.join(PROJECT_ROOT, 'data', 'final_land_dataset.csv')

# Load full dataset into memory at startup for fast /snapshot queries
print("📂 Loading full dataset for time slider...")
_DF = None
_MONTHS = []

try:
    if os.path.exists(CSV_PATH):
        # Use low_memory=False for speed on Render
        _DF = pd.read_csv(CSV_PATH, usecols=['lat','lon','year','month','pm25'], low_memory=False)
        _DF['pm25'] = pd.to_numeric(_DF['pm25'], errors='coerce')
        _DF = _DF.dropna(subset=['pm25'])
        _DF['pm25'] = _DF['pm25'].clip(0, 999).round(2)
        # Available months meta
        _MONTHS = sorted(_DF[['year','month']].drop_duplicates().values.tolist())
        print(f"✅ Dataset loaded: {len(_DF)} rows, {len(_MONTHS)} months ({_MONTHS[0]} → {_MONTHS[-1]})")
    else:
        print(f"❌ CSV File not found at {CSV_PATH}")
except Exception as e:
    print(f"⚠️  Could not load full dataset ({e}). /snapshot will be unavailable.")
    _DF = None
    _MONTHS = []



CATS = [
    (0,   5,   "Good",                        "#22d3ee", "WHO Safe"),
    (5,   15,  "Moderate",                    "#facc15", "Acceptable"),
    (15,  25,  "Unhealthy for Sensitive",     "#fb923c", "Limit outdoor activity"),
    (25,  50,  "Unhealthy",                   "#f87171", "Avoid prolonged outdoor exposure"),
    (50,  150, "Very Unhealthy",              "#c084fc", "Stay indoors"),
    (150, 999, "Hazardous",                   "#ff4444", "Emergency conditions"),
]

def get_cat(pm):
    for lo, hi, label, color, advice in CATS:
        if lo <= pm < hi:
            return label, color, advice
    return "Hazardous", "#ff4444", "Emergency conditions"

# Load all 3 models on startup
MODELS = {}
for h in ['24h', '48h', '72h']:
    m = xgb.XGBRegressor()
    m.load_model(os.path.join(BASE_DIR, f'pm25_model_{h}.json'))
    MODELS[h] = m
print("✅ Models loaded: 24h, 48h, 72h")

FEATURES = ['lat', 'lon', 'month_sin', 'month_cos', 'day_sin', 'day_cos',
            'temperature_celsius', 'relative_humidity', 'wind_speed', 'wind_direction',
            'surface_pressure', 'aod', 'cloud_fraction', 'elevation',
            'pm25_lag_1d', 'pm25_lag_2d', 'pm25_lag_3d', 'pm25_lag_7d',
            'pm25_roll_3d', 'pm25_roll_7d', 'pm25_roll_14d']

# Validated RMSE from training (used for confidence intervals)
MODEL_RMSE = {'24h': 5.8, '48h': 7.2, '72h': 8.5}

# Human-readable feature names for explainability
FEATURE_LABELS = {
    'pm25_lag_1d': 'Yesterday PM2.5', 'pm25_lag_2d': '2-Day Ago PM2.5',
    'pm25_lag_3d': '3-Day Ago PM2.5', 'pm25_lag_7d': '7-Day Ago PM2.5',
    'pm25_roll_3d': '3-Day Rolling Avg', 'pm25_roll_7d': '7-Day Rolling Avg',
    'pm25_roll_14d': '14-Day Rolling Avg', 'temperature_celsius': 'Temperature',
    'relative_humidity': 'Humidity', 'wind_speed': 'Wind Speed',
    'wind_direction': 'Wind Direction', 'surface_pressure': 'Surface Pressure',
    'aod': 'Aerosol Depth (AOD)', 'cloud_fraction': 'Cloud Cover',
    'elevation': 'Elevation', 'lat': 'Latitude', 'lon': 'Longitude',
    'month_sin': 'Season (sin)', 'month_cos': 'Season (cos)',
    'day_sin': 'Day of Year (sin)', 'day_cos': 'Day of Year (cos)',
}

# Cache last successful prediction for fallback
_last_prediction = {}

@app.route('/predict', methods=['POST'])
def predict():
    global _last_prediction
    d = request.json
    lat   = float(d['lat'])
    lon   = float(d['lon'])
    month = int(d.get('month', 12))
    doy   = int(d.get('day_of_year', 345))
    pm0   = float(d['pm_today'])
    pm1   = float(d['pm_1d'])
    pm2   = float(d['pm_2d'])
    pm3   = float(d['pm_3d'])
    pm7   = float(d.get('pm_7d', pm3))
    temp  = float(d.get('temp_c', 22))
    hum   = float(d.get('humidity', 55))
    wind  = float(d.get('wind_speed', 3))
    aod   = float(d.get('aod', 0.3))
    pres  = float(d.get('pressure', 101325))
    cloud = float(d.get('cloud', 0.4))
    elev  = float(d.get('elevation', 200))

    row = {
        'lat': lat, 'lon': lon,
        'month_sin':  np.sin(2 * np.pi * month / 12),
        'month_cos':  np.cos(2 * np.pi * month / 12),
        'day_sin':    np.sin(2 * np.pi * doy / 365),
        'day_cos':    np.cos(2 * np.pi * doy / 365),
        'temperature_celsius': temp,
        'relative_humidity':   hum,
        'wind_speed':          wind,
        'wind_direction':      180.0,
        'surface_pressure':    pres,
        'aod':         aod,
        'cloud_fraction': cloud,
        'elevation':   elev,
        'pm25_lag_1d': pm1,
        'pm25_lag_2d': pm2,
        'pm25_lag_3d': pm3,
        'pm25_lag_7d': pm7,
        'pm25_roll_3d':  np.mean([pm0, pm1, pm2]),
        'pm25_roll_7d':  np.mean([pm0, pm1, pm2, pm3, pm7, pm7, pm7]),
        'pm25_roll_14d': np.mean([pm0, pm1, pm2, pm3] + [pm7]*10),
    }
    X = pd.DataFrame([row])[FEATURES]

    try:
        results = {}
        for h, model in MODELS.items():
            pred = max(0.0, float(model.predict(X)[0]))
            rmse = MODEL_RMSE.get(h, 7.0)
            lbl, col, adv = get_cat(pred)
            results[h] = {
                'pm25': round(pred, 1),
                'label': lbl, 'color': col, 'advice': adv,
                'confidence': {
                    'lower': round(max(0.0, pred - rmse), 1),
                    'upper': round(pred + rmse, 1),
                    'rmse': rmse,
                },
            }
        # Determine top influencing factors for this prediction
        top_factors = []
        ref_model = MODELS.get('24h')
        if hasattr(ref_model, 'feature_importances_'):
            imp = ref_model.feature_importances_
            top_idx = np.argsort(imp)[::-1][:5]
            for i in top_idx:
                fname = FEATURES[i]
                direction = '↑' if row.get(fname, 0) > 0 else '↓'
                top_factors.append({
                    'feature': FEATURE_LABELS.get(fname, fname),
                    'importance': round(float(imp[i]) * 100, 1),
                    'direction': direction,
                })
        _last_prediction = results  # cache for fallback
    except Exception as e:
        # Fallback: return last known prediction
        if _last_prediction:
            log_action('PREDICTION_FALLBACK', f'Error: {str(e)}, using cached prediction')
            return jsonify({'status': 'ok', 'forecasts': _last_prediction, 'current': pm0,
                           'fallback': True, 'top_factors': []})
        log_action('PREDICTION_ERROR', str(e))
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

    log_action('PREDICTION', f'lat={lat}, lon={lon}, pm_today={pm0}, 24h={results["24h"]["pm25"]}')
    return jsonify({'status': 'ok', 'forecasts': results, 'current': pm0,
                   'top_factors': top_factors, 'fallback': False})

@app.route('/evaluate', methods=['POST'])
def evaluate():
    rows = request.json.get('rows', [])
    if not rows:
        return jsonify({'error': 'No rows provided'}), 400

    results = []
    for d in rows:
        lat   = float(d['lat']);   lon   = float(d['lon'])
        month = int(d.get('month', 12));  doy = int(d.get('day_of_year', 345))
        pm0 = float(d['pm_today']); pm1 = float(d['pm_1d'])
        pm2 = float(d['pm_2d']);    pm3 = float(d['pm_3d'])
        pm7 = float(d.get('pm_7d', pm3))
        row = {
            'lat': lat, 'lon': lon,
            'month_sin': np.sin(2*np.pi*month/12), 'month_cos': np.cos(2*np.pi*month/12),
            'day_sin':   np.sin(2*np.pi*doy/365),  'day_cos':   np.cos(2*np.pi*doy/365),
            'temperature_celsius': float(d.get('temp_c', 22)),
            'relative_humidity':   float(d.get('humidity', 55)),
            'wind_speed':          float(d.get('wind_speed', 3)),
            'wind_direction':      180.0,
            'surface_pressure':    float(d.get('pressure', 101325)),
            'aod':          float(d.get('aod', 0.3)),
            'cloud_fraction': float(d.get('cloud', 0.4)),
            'elevation':    float(d.get('elevation', 200)),
            'pm25_lag_1d': pm1, 'pm25_lag_2d': pm2, 'pm25_lag_3d': pm3, 'pm25_lag_7d': pm7,
            'pm25_roll_3d':  np.mean([pm0, pm1, pm2]),
            'pm25_roll_7d':  np.mean([pm0, pm1, pm2, pm3, pm7, pm7, pm7]),
            'pm25_roll_14d': np.mean([pm0, pm1, pm2, pm3] + [pm7]*10),
        }
        X = pd.DataFrame([row])[FEATURES]
        preds = {}
        for h, model in MODELS.items():
            pred = max(0.0, float(model.predict(X)[0]))
            lbl, col, adv = get_cat(pred)
            preds[h] = {'pm25': round(pred, 1), 'label': lbl, 'color': col}

        entry = {'lat': lat, 'lon': lon, 'pm_today': pm0, 'forecasts': preds}
        for h in ['24h','48h','72h']:
            k = f'actual_{h}'
            if k in d and d[k] not in (None, ''):
                actual = float(d[k])
                entry[f'actual_{h}'] = actual
                entry[f'err_{h}'] = round(abs(preds[h]['pm25'] - actual), 2)
        results.append(entry)

    # Compute accuracy metrics if actuals provided
    metrics = {}
    for h in ['24h','48h','72h']:
        ak = f'actual_{h}'
        rows_with_actual = [r for r in results if ak in r]
        if rows_with_actual:
            y_true = np.array([r[ak] for r in rows_with_actual])
            y_pred = np.array([r['forecasts'][h]['pm25'] for r in rows_with_actual])
            ss_res = np.sum((y_true - y_pred)**2)
            ss_tot = np.sum((y_true - np.mean(y_true))**2)
            r2   = 1 - ss_res/ss_tot if ss_tot > 0 else 0.0
            rmse = float(np.sqrt(np.mean((y_true - y_pred)**2)))
            mae  = float(np.mean(np.abs(y_true - y_pred)))
            metrics[h] = {'r2': round(r2, 4), 'rmse': round(rmse, 2), 'mae': round(mae, 2), 'n': len(rows_with_actual)}

    return jsonify({'status': 'ok', 'results': results, 'metrics': metrics})

@app.route('/months')
def months():
    if _DF is None:
        return jsonify({'error': 'Dataset not loaded'}), 503
    return jsonify({'months': _MONTHS})  # [[year,month], ...]

@app.route('/snapshot')
def snapshot():
    if _DF is None:
        return jsonify({'error': 'Dataset not loaded'}), 503
    try:
        year  = int(request.args.get('year',  2021))
        month = int(request.args.get('month', 12))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid year/month'}), 400

    sub = _DF[(_DF['year'] == year) & (_DF['month'] == month)][['lat','lon','pm25']]
    if sub.empty:
        return jsonify({'error': f'No data for {year}-{month:02d}'}), 404

    points = sub.to_dict('records')
    mean_pm = round(float(sub['pm25'].mean()), 2)
    hazard  = int((sub['pm25'] > 50).sum())
    safe    = int((sub['pm25'] <= 5).sum())
    top10   = sub.nlargest(10, 'pm25').to_dict('records')
    return jsonify({
        'year': year, 'month': month,
        'snapshot': points,
        'stats': {'mean': mean_pm, 'hazard_zones': hazard, 'safe_zones': safe, 'total_points': len(points)},
        'top10': top10
    })

@app.route('/health')
def health():
    return jsonify({'status': 'running', 'models': list(MODELS.keys()), 'months_available': len(_MONTHS)})


# ── CSV Upload Endpoint (LLD: DataUploadHandler) ────────────────────────────
@app.route('/upload', methods=['POST'])
def upload_csv():
    """Accept a CSV file, validate schema/size, detect anomalies, and return summary."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided. Use key "file" in form-data.'}), 400

    file = request.files['file']

    # ── Validation: File type ──
    if not file.filename.endswith('.csv'):
        log_action('UPLOAD_REJECTED', f'Invalid file type: {file.filename}')
        return jsonify({'error': 'Invalid file type. Only .csv files are accepted.'}), 400

    # ── Validation: File size (LLD: < 10 GB, we enforce 10 MB for demo) ──
    file.seek(0, 2)  # seek to end
    file_size = file.tell()
    file.seek(0)     # seek back to start
    if file_size > MAX_UPLOAD_SIZE:
        size_mb = round(file_size / (1024 * 1024), 2)
        log_action('UPLOAD_REJECTED', f'File too large: {size_mb} MB (max {MAX_UPLOAD_SIZE // (1024*1024)} MB)')
        return jsonify({'error': f'File too large ({size_mb} MB). Maximum allowed size is {MAX_UPLOAD_SIZE // (1024*1024)} MB.'}), 400

    # ── Validation: Parse CSV ──
    try:
        df = pd.read_csv(file)
    except Exception as e:
        log_action('UPLOAD_ERROR', f'CSV parse failed: {str(e)}')
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    if df.empty:
        return jsonify({'error': 'CSV file is empty.'}), 400

    # ── Validation: Schema check (LLD requirement) ──
    missing_cols = [c for c in REQUIRED_SCHEMA if c not in df.columns]
    schema_warning = None
    if missing_cols:
        schema_warning = f"Missing recommended columns: {', '.join(missing_cols)}. Some features may be limited."

    # ── Validation: Range check on pm25 (LLD: range verification) ──
    range_warnings = []
    if 'pm25' in df.columns:
        pm_vals = pd.to_numeric(df['pm25'], errors='coerce')
        neg_count = int((pm_vals < 0).sum())
        extreme_count = int((pm_vals > 999).sum())
        if neg_count > 0:
            range_warnings.append(f'{neg_count} negative PM2.5 values detected')
        if extreme_count > 0:
            range_warnings.append(f'{extreme_count} extreme values (>999 µg/m³) detected')

    # Check for pm25 column
    has_pm25 = 'pm25' in df.columns
    summary = {
        'filename': file.filename,
        'rows': len(df),
        'columns': list(df.columns),
        'has_pm25': has_pm25,
    }

    anomalies = []
    if has_pm25:
        pm_vals = pd.to_numeric(df['pm25'], errors='coerce').dropna()
        summary['pm25_mean'] = round(float(pm_vals.mean()), 2)
        summary['pm25_max'] = round(float(pm_vals.max()), 2)
        summary['pm25_min'] = round(float(pm_vals.min()), 2)

        # Anomaly detection (2-sigma)
        mean = float(pm_vals.mean())
        std = float(pm_vals.std())
        if std > 0:
            anomaly_mask = (pm_vals - mean).abs() > 2 * std
            anomaly_rows = df.loc[pm_vals.index[anomaly_mask]]
            for _, row in anomaly_rows.iterrows():
                entry = {'pm25': round(float(row['pm25']), 2)}
                if 'lat' in df.columns and 'lon' in df.columns:
                    entry['lat'] = float(row['lat'])
                    entry['lon'] = float(row['lon'])
                anomalies.append(entry)
            summary['anomaly_count'] = len(anomalies)
            summary['anomaly_threshold'] = round(mean + 2 * std, 2)

    log_action('CSV_UPLOAD', f'{file.filename} | {len(df)} rows | {len(anomalies)} anomalies')

    # Return first 100 rows for preview
    preview = df.head(100).to_dict('records')

    return jsonify({
        'status': 'ok',
        'summary': summary,
        'anomalies': anomalies,
        'preview': preview,
        'validation': {
            'schema_warning': schema_warning if schema_warning else None,
            'range_warnings': range_warnings if range_warnings else [],
            'file_size_mb': round(file_size / (1024 * 1024), 2),
        },
    })


# ── Anomaly Detection Endpoint ───────────────────────────────────────────────
@app.route('/anomalies', methods=['POST'])
def detect_anomalies():
    """Detect PM2.5 anomalies using 2-standard-deviation method."""
    data = request.json
    values = data.get('values', [])
    if not values:
        return jsonify({'error': 'No values provided.'}), 400

    arr = np.array(values, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr))

    if std == 0:
        return jsonify({'status': 'ok', 'anomalies': [], 'mean': mean, 'std': 0})

    anomaly_indices = [i for i, v in enumerate(arr) if abs(v - mean) > 2 * std]
    anomaly_values = [{'index': i, 'value': round(float(arr[i]), 2)} for i in anomaly_indices]

    log_action('ANOMALY_DETECTION', f'{len(values)} values | {len(anomaly_values)} anomalies found')

    return jsonify({
        'status': 'ok',
        'mean': round(mean, 2),
        'std': round(std, 2),
        'threshold_upper': round(mean + 2 * std, 2),
        'threshold_lower': round(mean - 2 * std, 2),
        'anomalies': anomaly_values,
    })


# ── Audit Log Viewer ─────────────────────────────────────────────────────────
@app.route('/audit-log')
def audit_log():
    """Return recent audit log entries."""
    n = int(request.args.get('n', 50))
    entries = get_recent_logs(n)
    return jsonify({'status': 'ok', 'entries': entries, 'count': len(entries)})


# ── Scenario Manager Endpoints (LLD: ScenarioManager) ───────────────────────
@app.route('/scenarios', methods=['GET'])
def scenarios_list():
    """List all saved forecast scenarios."""
    return jsonify({'status': 'ok', 'scenarios': list_scenarios()})


@app.route('/scenarios', methods=['POST'])
def scenario_create():
    """Save a new named forecast scenario."""
    if not require_role('Planner'):
        return jsonify({'error': 'Insufficient permissions. Planner or Admin role required.'}), 403
    d = request.json
    name = d.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Scenario name is required.'}), 400
    sc = create_scenario(
        name=name,
        description=d.get('description', ''),
        inputs=d.get('inputs', {}),
        forecasts=d.get('forecasts', {}),
        created_by=get_user_name(),
    )
    log_action('SCENARIO_CREATED', f'{sc["id"]} | {name} | by {get_user_name()}')
    return jsonify({'status': 'ok', 'scenario': sc})


@app.route('/scenarios/<scenario_id>', methods=['GET'])
def scenario_get(scenario_id):
    """Retrieve a single scenario."""
    sc = get_scenario(scenario_id)
    if not sc:
        return jsonify({'error': 'Scenario not found.'}), 404
    return jsonify({'status': 'ok', 'scenario': sc})


@app.route('/scenarios/<scenario_id>/comment', methods=['POST'])
def scenario_comment(scenario_id):
    """Add a comment to a scenario."""
    d = request.json
    text = d.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Comment text is required.'}), 400
    sc = add_comment(scenario_id, author=get_user_name(), text=text)
    if not sc:
        return jsonify({'error': 'Scenario not found.'}), 404
    log_action('SCENARIO_COMMENT', f'{scenario_id} | by {get_user_name()}')
    return jsonify({'status': 'ok', 'scenario': sc})


@app.route('/scenarios/<scenario_id>', methods=['DELETE'])
def scenario_delete(scenario_id):
    """Delete a scenario. Admin only."""
    if not require_role('Admin'):
        return jsonify({'error': 'Admin role required to delete scenarios.'}), 403
    ok = delete_scenario(scenario_id)
    if not ok:
        return jsonify({'error': 'Scenario not found.'}), 404
    log_action('SCENARIO_DELETED', f'{scenario_id} | by {get_user_name()}')
    return jsonify({'status': 'ok'})


# ── User Role Info Endpoint ──────────────────────────────────────────────────
@app.route('/user-info')
def user_info():
    """Return the current user's role and name."""
    return jsonify({
        'role': get_user_role(),
        'name': get_user_name(),
        'permissions': {
            'can_predict': True,
            'can_upload': require_role('Planner'),
            'can_create_scenario': require_role('Planner'),
            'can_delete_scenario': require_role('Admin'),
            'can_view_audit_log': require_role('Planner'),
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    log_action('SERVER_START', f'Port {port}')
    print(f"🚀 PM2.5 Prediction API running at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
