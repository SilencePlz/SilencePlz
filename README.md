# HA Monitor

A [Home Assistant](https://www.home-assistant.io/) monitoring dashboard powered by [AppDaemon](https://appdaemon.readthedocs.io/).

## What it does

| Feature | Details |
|---------|---------|
| Entity tracking | Watches every `light`, `switch`, `sensor`, `binary_sensor`, `climate`, `cover`, `lock`, `fan`, `media_player`, and `device_tracker` |
| Battery alerts | Raises a warning when battery ≤ 20 % (configurable) and a critical alert at ≤ 10 % |
| Offline detection | Flags any entity that transitions to `unavailable` or `unknown` |
| REST API | Four endpoints consumed by the dashboard (status, entities, events, alerts) |
| Web dashboard | Dark-theme single-page app; auto-refreshes every 5 s |
| Notifications | Optional push notification via any HA `notify.*` service |

---

## Quick start

### 1. Install AppDaemon

```bash
pip install appdaemon
```

### 2. Configure AppDaemon

Edit **`appdaemon.yaml`** and set your HA URL and long-lived access token:

```yaml
plugins:
  HASS:
    type: hass
    ha_url: http://homeassistant.local:8123
    token: YOUR_LONG_LIVED_ACCESS_TOKEN
```

Or export environment variables instead:

```bash
export HA_URL=http://homeassistant.local:8123
export HA_TOKEN=<your token>
```

### 3. Deploy the app

Copy the `apps/` directory into your AppDaemon `apps/` folder (or point AppDaemon at this repo's `apps/` directory via `app_dir` in `appdaemon.yaml`).

### 4. (Optional) Tune the app

Edit **`apps/ha_monitor/ha_monitor.yaml`**:

```yaml
ha_monitor:
  battery_threshold: 20        # alert below this %
  check_interval: 60           # health sweep period (seconds)
  notification_target: notify.mobile_app_my_phone
```

### 5. Run AppDaemon

```bash
appdaemon -c .
```

AppDaemon starts its HTTP server on **port 5050** by default.

### 6. Open the dashboard

Open `dashboard/index.html` in a browser. Click **⚙ Settings** if the AppDaemon host differs from `http://localhost:5050`.

---

## REST API reference

All endpoints are served by AppDaemon at `http://<host>:5050`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/appdaemon/ha_monitor` | Summary + alerts + last 20 events |
| `GET` | `/api/appdaemon/ha_monitor_entities[?domain=light]` | All tracked entities |
| `GET` | `/api/appdaemon/ha_monitor_events[?limit=50]` | Recent state-change events |
| `GET` | `/api/appdaemon/ha_monitor_alerts` | Active alerts |

---

## Project layout

```
.
├── appdaemon.yaml               # AppDaemon daemon config
├── requirements.txt
├── apps/
│   └── ha_monitor/
│       ├── ha_monitor.py        # AppDaemon app (monitoring logic + API)
│       └── ha_monitor.yaml      # App configuration
└── dashboard/
    ├── index.html               # Single-page monitoring dashboard
    ├── css/styles.css
    └── js/app.js
```
