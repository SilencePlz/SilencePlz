'use strict';

// ============================================================
// Home Assistant Monitor - Simulated Dashboard
// ============================================================

// ── Device Data ─────────────────────────────────────────────
const DEVICES = [
  // Lights
  { id: 'light_living',      name: 'Living Room Light',    type: 'light',      room: 'Living Room',  icon: '\u{1F4A1}', state: true,  brightness: 80,  favorite: true },
  { id: 'light_bedroom',     name: 'Bedroom Light',        type: 'light',      room: 'Bedroom',      icon: '\u{1F4A1}', state: false, brightness: 0,   favorite: true },
  { id: 'light_kitchen',     name: 'Kitchen Light',        type: 'light',      room: 'Kitchen',      icon: '\u{1F4A1}', state: true,  brightness: 100, favorite: true },
  { id: 'light_bathroom',    name: 'Bathroom Light',       type: 'light',      room: 'Bathroom',     icon: '\u{1F4A1}', state: false, brightness: 0,   favorite: false },
  { id: 'light_office',      name: 'Office Desk Lamp',     type: 'light',      room: 'Office',       icon: '\u{1F4A1}', state: true,  brightness: 65,  favorite: true },
  { id: 'light_porch',       name: 'Porch Light',          type: 'light',      room: 'Outdoor',      icon: '\u{1F4A1}', state: true,  brightness: 100, favorite: false },
  { id: 'light_garage',      name: 'Garage Light',         type: 'light',      room: 'Garage',       icon: '\u{1F4A1}', state: false, brightness: 0,   favorite: false },

  // Thermostats
  { id: 'thermo_main',       name: 'Main Thermostat',      type: 'thermostat', room: 'Living Room',  icon: '\u{1F321}', state: true,  target: 72, current: 71, mode: 'heat', favorite: true },
  { id: 'thermo_bedroom',    name: 'Bedroom Thermostat',   type: 'thermostat', room: 'Bedroom',      icon: '\u{1F321}', state: true,  target: 68, current: 67, mode: 'cool', favorite: false },

  // Locks
  { id: 'lock_front',        name: 'Front Door Lock',      type: 'lock',       room: 'Entryway',     icon: '\u{1F512}', state: true,  favorite: true },
  { id: 'lock_back',         name: 'Back Door Lock',       type: 'lock',       room: 'Kitchen',      icon: '\u{1F512}', state: true,  favorite: false },
  { id: 'lock_garage',       name: 'Garage Door Lock',     type: 'lock',       room: 'Garage',       icon: '\u{1F512}', state: false, favorite: true },

  // Sensors
  { id: 'sensor_front_door', name: 'Front Door Sensor',    type: 'sensor',     room: 'Entryway',     icon: '\u{1F6AA}', state: false, sensorType: 'door',   favorite: false },
  { id: 'sensor_motion_lr',  name: 'Motion Sensor',        type: 'sensor',     room: 'Living Room',  icon: '\u{1F440}', state: true,  sensorType: 'motion', favorite: false },
  { id: 'sensor_smoke',      name: 'Smoke Detector',       type: 'sensor',     room: 'Kitchen',      icon: '\u{1F6A8}', state: false, sensorType: 'smoke',  favorite: false },
  { id: 'sensor_water',      name: 'Water Leak Sensor',    type: 'sensor',     room: 'Bathroom',     icon: '\u{1F4A7}', state: false, sensorType: 'water',  favorite: false },
  { id: 'sensor_humidity',   name: 'Humidity Sensor',      type: 'sensor',     room: 'Bathroom',     icon: '\u{1F4A7}', state: true,  value: 45, unit: '%', favorite: false },

  // Cameras
  { id: 'cam_front',         name: 'Front Camera',         type: 'camera',     room: 'Outdoor',      icon: '\u{1F4F7}', state: true,  recording: true, favorite: true },
  { id: 'cam_back',          name: 'Backyard Camera',      type: 'camera',     room: 'Outdoor',      icon: '\u{1F4F7}', state: true,  recording: true, favorite: false },
  { id: 'cam_garage',        name: 'Garage Camera',        type: 'camera',     room: 'Garage',       icon: '\u{1F4F7}', state: true,  recording: false, favorite: false },

  // Switches
  { id: 'switch_fan_lr',     name: 'Ceiling Fan',          type: 'switch',     room: 'Living Room',  icon: '\u{1F300}', state: true,  favorite: false },
  { id: 'switch_fan_bed',    name: 'Bedroom Fan',          type: 'switch',     room: 'Bedroom',      icon: '\u{1F300}', state: false, favorite: false },
  { id: 'switch_sprinkler',  name: 'Sprinkler System',     type: 'switch',     room: 'Outdoor',      icon: '\u{1F4A6}', state: false, favorite: false },
  { id: 'switch_coffee',     name: 'Coffee Machine',       type: 'switch',     room: 'Kitchen',      icon: '\u2615',    state: false, favorite: true },
];

const AUTOMATIONS = [
  { id: 'auto_sunset',     name: 'Sunset Lights',           desc: 'Turn on porch & living lights at sunset',      icon: '\u{1F305}', enabled: true,  lastRun: '6:42 PM' },
  { id: 'auto_morning',    name: 'Morning Routine',         desc: 'Coffee machine on, lights to 50% at 6:30 AM', icon: '\u2615',    enabled: true,  lastRun: '6:30 AM' },
  { id: 'auto_away',       name: 'Away Mode',               desc: 'Lock all doors, arm cameras when nobody home', icon: '\u{1F512}', enabled: true,  lastRun: '9:15 AM' },
  { id: 'auto_night',      name: 'Goodnight',               desc: 'All lights off, doors locked, temp to 68\u00B0F',   icon: '\u{1F319}', enabled: true,  lastRun: '10:30 PM' },
  { id: 'auto_motion',     name: 'Motion Alert',            desc: 'Notify on outdoor motion after 11 PM',         icon: '\u{1F6A8}', enabled: true,  lastRun: '1:22 AM' },
  { id: 'auto_leak',       name: 'Water Leak Alert',        desc: 'Emergency alert on water leak detection',      icon: '\u{1F4A7}', enabled: true,  lastRun: 'Never' },
  { id: 'auto_temp',       name: 'High Temp Alert',         desc: 'Alert when indoor temp exceeds 85\u00B0F',          icon: '\u{1F321}', enabled: false, lastRun: 'Never' },
  { id: 'auto_garage',     name: 'Garage Door Reminder',    desc: 'Alert if garage open after 9 PM',              icon: '\u{1F6AA}', enabled: true,  lastRun: '9:05 PM' },
];

const ROOMS = [
  { name: 'Living Room',  icon: '\u{1F6CB}',  temp: 71, humidity: 42 },
  { name: 'Bedroom',      icon: '\u{1F6CF}',  temp: 67, humidity: 38 },
  { name: 'Kitchen',      icon: '\u{1F373}',  temp: 73, humidity: 48 },
  { name: 'Bathroom',     icon: '\u{1F6BF}',  temp: 70, humidity: 62 },
  { name: 'Office',       icon: '\u{1F4BB}',  temp: 70, humidity: 40 },
  { name: 'Entryway',     icon: '\u{1F6AA}',  temp: 69, humidity: 44 },
  { name: 'Garage',       icon: '\u{1F697}',  temp: 58, humidity: 52 },
  { name: 'Outdoor',      icon: '\u{1F333}',  temp: 55, humidity: 65 },
];

// ── Activity Log ────────────────────────────────────────────
const activityLog = [];
const MAX_LOG = 100;

function addLog(icon, text) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  activityLog.unshift({ time, icon, text, timestamp: now });
  if (activityLog.length > MAX_LOG) activityLog.pop();
}

// Seed initial log entries
(function seedLog() {
  const entries = [
    ['\u{1F4A1}', '<strong>Kitchen Light</strong> turned on'],
    ['\u{1F512}', '<strong>Front Door</strong> locked'],
    ['\u{1F321}', '<strong>Main Thermostat</strong> set to 72\u00B0F'],
    ['\u2615',    '<strong>Morning Routine</strong> automation triggered'],
    ['\u{1F4F7}', '<strong>Front Camera</strong> motion detected'],
    ['\u{1F300}', '<strong>Ceiling Fan</strong> turned on'],
    ['\u{1F512}', '<strong>Garage Door Lock</strong> unlocked'],
    ['\u{1F305}', '<strong>Sunset Lights</strong> automation triggered'],
    ['\u{1F440}', '<strong>Motion Sensor</strong> activity in Living Room'],
    ['\u{1F6AA}', '<strong>Front Door</strong> opened'],
  ];
  entries.forEach(([icon, text]) => addLog(icon, text));
})();

// ── System Health (simulated) ───────────────────────────────
const systemHealth = { cpu: 12, mem: 34, disk: 47, temp: 42 };

function updateSystemHealth() {
  systemHealth.cpu  = clamp(systemHealth.cpu + randInt(-5, 5), 3, 65);
  systemHealth.mem  = clamp(systemHealth.mem + randInt(-3, 3), 20, 70);
  systemHealth.disk = clamp(systemHealth.disk + randInt(-1, 1), 40, 60);
  systemHealth.temp = clamp(systemHealth.temp + randInt(-2, 2), 35, 58);

  setBar('cpu',  systemHealth.cpu,  '%');
  setBar('mem',  systemHealth.mem,  '%');
  setBar('disk', systemHealth.disk, '%');
  setBar('temp', systemHealth.temp, '\u00B0C');
}

function setBar(id, val, suffix) {
  const bar = document.getElementById(id + '-bar');
  const label = document.getElementById(id + '-val');
  if (bar) bar.style.width = val + '%';
  if (label) label.textContent = val + suffix;
}

// ── Weather (simulated) ─────────────────────────────────────
const weather = { temp: 62, desc: 'Partly Cloudy', humidity: 55, wind: 8, uv: 3, aqi: 42, icon: '\u26C5' };

function updateWeather() {
  weather.temp     = clamp(weather.temp + randInt(-2, 2), 45, 85);
  weather.humidity = clamp(weather.humidity + randInt(-3, 3), 30, 80);
  weather.wind     = clamp(weather.wind + randInt(-2, 2), 0, 25);
  weather.uv       = clamp(weather.uv + randInt(-1, 1), 0, 11);
  weather.aqi      = clamp(weather.aqi + randInt(-5, 5), 15, 100);

  const descs = [
    { min: 75, icon: '\u2600', text: 'Sunny' },
    { min: 60, icon: '\u26C5', text: 'Partly Cloudy' },
    { min: 50, icon: '\u2601', text: 'Cloudy' },
    { min: 0,  icon: '\u{1F327}', text: 'Light Rain' },
  ];
  const d = descs.find(x => weather.temp >= x.min) || descs[descs.length - 1];
  weather.desc = d.text;
  weather.icon = d.icon;

  setText('weather-icon', weather.icon);
  setText('weather-temp', weather.temp + '\u00B0F');
  setText('weather-desc', weather.desc);
  setText('weather-humidity', weather.humidity + '%');
  setText('weather-wind', weather.wind + ' mph');
  setText('weather-uv', String(weather.uv));
  setText('weather-aqi', String(weather.aqi));
}

// ── Energy Data (simulated) ─────────────────────────────────
function generateEnergyData() {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    let base;
    if (i >= 0 && i < 6)       base = 300 + Math.random() * 200;
    else if (i >= 6 && i < 9)  base = 800 + Math.random() * 400;
    else if (i >= 9 && i < 17) base = 400 + Math.random() * 300;
    else if (i >= 17 && i < 22) base = 900 + Math.random() * 500;
    else                        base = 500 + Math.random() * 200;
    hours.push({ hour: i, watts: Math.round(base) });
  }
  return hours;
}

let energyData = generateEnergyData();

const ENERGY_CONSUMERS = [
  { name: 'HVAC',            watts: 1200, color: 'var(--red)' },
  { name: 'Water Heater',    watts: 450,  color: 'var(--amber)' },
  { name: 'Lighting',        watts: 280,  color: 'var(--accent)' },
  { name: 'Entertainment',   watts: 220,  color: 'var(--violet)' },
  { name: 'Kitchen Appliances', watts: 180, color: 'var(--green)' },
  { name: 'Other',           watts: 120,  color: 'var(--cyan)' },
];

// ── Uptime ──────────────────────────────────────────────────
const startTime = Date.now() - (3 * 86400000 + 7 * 3600000 + 22 * 60000);

function updateClock() {
  const now = new Date();
  setText('clock', now.toLocaleTimeString('en-US', { hour12: false }));

  const diff = Date.now() - startTime;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  setText('uptime', 'Uptime: ' + d + 'd ' + h + 'h ' + m + 'm');
}

// ── Helpers ─────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function setText(id, val) { var el = $(id); if (el) el.textContent = val; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ── Render: Device Card ─────────────────────────────────────
function renderDeviceCard(device) {
  const card = document.createElement('div');
  card.className = 'device-card' + (device.state ? ' active' : '');
  card.dataset.type = device.type;
  card.dataset.id = device.id;

  const hasToggle = ['light', 'switch', 'lock', 'camera'].includes(device.type);
  let valueHtml = '';

  if (device.type === 'light' && device.state) {
    valueHtml = '<div class="device-value mono">' + device.brightness + '% brightness</div>';
  } else if (device.type === 'thermostat') {
    valueHtml = '<div class="device-value mono">' + device.current + '\u00B0F \u2192 ' + device.target + '\u00B0F (' + device.mode + ')</div>';
  } else if (device.type === 'sensor') {
    if (device.value !== undefined) {
      valueHtml = '<div class="device-value mono">' + device.value + device.unit + '</div>';
    } else {
      var label = device.state ? 'Detected' : 'Clear';
      valueHtml = '<div class="device-value">' + label + '</div>';
    }
  } else if (device.type === 'lock') {
    valueHtml = '<div class="device-value">' + (device.state ? 'Locked' : 'Unlocked') + '</div>';
  } else if (device.type === 'camera') {
    valueHtml = '<div class="device-value">' + (device.recording ? 'Recording' : 'Idle') + '</div>';
  }

  card.innerHTML =
    '<span class="device-badge online"></span>' +
    '<div class="device-top">' +
      '<span class="device-icon">' + device.icon + '</span>' +
      (hasToggle ? '<button class="device-toggle ' + (device.state ? 'on' : '') + '" data-device="' + device.id + '"></button>' : '') +
    '</div>' +
    '<div class="device-name">' + device.name + '</div>' +
    '<div class="device-room">' + device.room + '</div>' +
    valueHtml;

  var toggle = card.querySelector('.device-toggle');
  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      device.state = !device.state;
      if (device.type === 'light') {
        device.brightness = device.state ? 80 : 0;
      }
      if (device.type === 'lock') {
        addLog(device.icon, '<strong>' + device.name + '</strong> ' + (device.state ? 'locked' : 'unlocked'));
      } else {
        addLog(device.icon, '<strong>' + device.name + '</strong> ' + (device.state ? 'turned on' : 'turned off'));
      }
      renderAll();
    });
  }

  return card;
}

// ── Render: Favorites ───────────────────────────────────────
function renderFavorites() {
  var container = $('fav-devices');
  if (!container) return;
  container.innerHTML = '';
  DEVICES.filter(function(d) { return d.favorite; }).forEach(function(d) {
    container.appendChild(renderDeviceCard(d));
  });
}

// ── Render: All Devices ─────────────────────────────────────
function renderAllDevices() {
  var container = $('all-devices');
  if (!container) return;
  var activeFilter = document.querySelector('.filter-btn.active');
  var filter = activeFilter ? activeFilter.dataset.filter : 'all';
  container.innerHTML = '';
  DEVICES
    .filter(function(d) { return filter === 'all' || d.type === filter; })
    .forEach(function(d) { container.appendChild(renderDeviceCard(d)); });
}

// ── Render: Rooms ───────────────────────────────────────────
function renderRooms() {
  var container = $('rooms-grid');
  if (!container) return;
  container.innerHTML = '';

  ROOMS.forEach(function(room) {
    var roomDevices = DEVICES.filter(function(d) { return d.room === room.name; });
    var card = document.createElement('div');
    card.className = 'room-card';

    var miniDevicesHtml = roomDevices.map(function(d) {
      return '<span class="mini-device ' + (d.state ? 'on' : '') + '">' + d.icon + ' ' + d.name.split(' ').pop() + '</span>';
    }).join('');

    card.innerHTML =
      '<div class="room-header">' +
        '<span class="room-name">' + room.icon + ' ' + room.name + '</span>' +
        '<span class="room-count">' + roomDevices.length + ' devices</span>' +
      '</div>' +
      '<div class="room-climate">' +
        '<div class="room-climate-item"><span class="rc-icon">\u{1F321}</span> ' + room.temp + '\u00B0F</div>' +
        '<div class="room-climate-item"><span class="rc-icon">\u{1F4A7}</span> ' + room.humidity + '%</div>' +
      '</div>' +
      '<div class="room-devices-mini">' + miniDevicesHtml + '</div>';

    container.appendChild(card);
  });
}

// ── Render: Automations ─────────────────────────────────────
function renderAutomations() {
  var container = $('auto-list');
  if (!container) return;
  container.innerHTML = '';

  AUTOMATIONS.forEach(function(auto) {
    var item = document.createElement('div');
    item.className = 'auto-item';
    item.innerHTML =
      '<div class="auto-left">' +
        '<div class="auto-icon">' + auto.icon + '</div>' +
        '<div class="auto-info">' +
          '<h4>' + auto.name + '</h4>' +
          '<p>' + auto.desc + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="auto-right">' +
        '<span class="auto-last">Last: ' + auto.lastRun + '</span>' +
        '<button class="toggle ' + (auto.enabled ? 'on' : '') + '" data-auto="' + auto.id + '"></button>' +
      '</div>';

    item.querySelector('.toggle').addEventListener('click', function() {
      auto.enabled = !auto.enabled;
      addLog(auto.icon, '<strong>' + auto.name + '</strong> ' + (auto.enabled ? 'enabled' : 'disabled'));
      renderAll();
    });

    container.appendChild(item);
  });
}

// ── Render: Activity Log ────────────────────────────────────
function renderActivity(containerId, limit) {
  var container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  var items = limit ? activityLog.slice(0, limit) : activityLog;
  items.forEach(function(entry) {
    var item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML =
      '<span class="activity-time mono">' + entry.time + '</span>' +
      '<span class="activity-icon">' + entry.icon + '</span>' +
      '<span class="activity-text">' + entry.text + '</span>';
    container.appendChild(item);
  });
}

// ── Render: Quick Stats ─────────────────────────────────────
function renderQuickStats() {
  var lightsOn = DEVICES.filter(function(d) { return d.type === 'light' && d.state; }).length;
  var doorsOpen = DEVICES.filter(function(d) { return d.type === 'sensor' && d.sensorType === 'door' && d.state; }).length;
  var activeAuto = AUTOMATIONS.filter(function(a) { return a.enabled; }).length;
  var alerts = DEVICES.filter(function(d) { return d.type === 'sensor' && (d.sensorType === 'smoke' || d.sensorType === 'water') && d.state; }).length;

  setText('stat-lights-on', String(lightsOn));
  setText('stat-doors-open', String(doorsOpen));
  setText('stat-active-auto', String(activeAuto));
  setText('stat-alerts', String(alerts));
  setText('entity-count', String(DEVICES.length));
}

// ── Render: Energy ──────────────────────────────────────────
function renderEnergy() {
  var summary = $('energy-summary');
  if (!summary) return;

  var totalToday = energyData.reduce(function(s, h) { return s + h.watts; }, 0);
  var avgWatts = Math.round(totalToday / 24);
  var peakWatts = Math.max.apply(null, energyData.map(function(h) { return h.watts; }));
  var costEstimate = ((totalToday / 1000) * 0.12).toFixed(2);

  summary.innerHTML =
    '<div class="energy-stat green">' +
      '<span class="es-value mono">' + avgWatts + 'W</span>' +
      '<span class="es-label">Avg Usage</span>' +
    '</div>' +
    '<div class="energy-stat amber">' +
      '<span class="es-value mono">' + peakWatts + 'W</span>' +
      '<span class="es-label">Peak Today</span>' +
    '</div>' +
    '<div class="energy-stat red">' +
      '<span class="es-value mono">' + (totalToday / 1000).toFixed(1) + ' kWh</span>' +
      '<span class="es-label">Total Today</span>' +
    '</div>' +
    '<div class="energy-stat violet">' +
      '<span class="es-value mono">$' + costEstimate + '</span>' +
      '<span class="es-label">Est. Cost</span>' +
    '</div>';

  // Chart
  var chart = $('energy-chart');
  if (!chart) return;
  chart.innerHTML = '';
  var maxW = Math.max.apply(null, energyData.map(function(h) { return h.watts; }));

  energyData.forEach(function(h) {
    var pct = (h.watts / maxW) * 100;
    var cls = h.watts > 1000 ? 'high' : h.watts > 600 ? 'medium' : '';
    var wrap = document.createElement('div');
    wrap.className = 'energy-bar-wrap';
    wrap.innerHTML =
      '<div class="energy-bar ' + cls + '" style="height:' + pct + '%"></div>' +
      '<span class="energy-bar-label">' + String(h.hour).padStart(2, '0') + '</span>';
    chart.appendChild(wrap);
  });

  // Breakdown
  var breakdown = $('energy-breakdown');
  if (!breakdown) return;
  breakdown.innerHTML = '';
  var maxConsumer = Math.max.apply(null, ENERGY_CONSUMERS.map(function(c) { return c.watts; }));

  ENERGY_CONSUMERS.forEach(function(c) {
    var pct = (c.watts / maxConsumer) * 100;
    var item = document.createElement('div');
    item.className = 'eb-item';
    item.innerHTML =
      '<span class="eb-name">' + c.name + '</span>' +
      '<div class="eb-bar-wrap"><div class="eb-bar" style="width:' + pct + '%;background:' + c.color + '"></div></div>' +
      '<span class="eb-value mono">' + c.watts + 'W</span>';
    breakdown.appendChild(item);
  });
}

// ── Render All ──────────────────────────────────────────────
function renderAll() {
  updateSystemHealth();
  updateWeather();
  renderQuickStats();
  renderFavorites();
  renderAllDevices();
  renderRooms();
  renderAutomations();
  renderActivity('dashboard-activity', 8);
  renderActivity('full-log');
  renderEnergy();
}

// ── Navigation ──────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var view = btn.dataset.view;
      document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
      var target = $('view-' + view);
      if (target) target.classList.add('active');
    });
  });
}

// ── Device Filters ──────────────────────────────────────────
function setupFilters() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      e.target.classList.add('active');
      renderAllDevices();
    }
  });
}

// ── Random Events (simulation) ──────────────────────────────
function simulateRandomEvent() {
  var events = [
    function() {
      var lights = DEVICES.filter(function(d) { return d.type === 'light'; });
      var light = lights[randInt(0, lights.length - 1)];
      if (light) {
        light.state = !light.state;
        light.brightness = light.state ? randInt(40, 100) : 0;
        addLog(light.icon, '<strong>' + light.name + '</strong> ' + (light.state ? 'turned on' : 'turned off'));
      }
    },
    function() {
      var room = ROOMS[randInt(0, ROOMS.length - 1)];
      room.temp = clamp(room.temp + randInt(-2, 2), 55, 80);
      room.humidity = clamp(room.humidity + randInt(-3, 3), 25, 75);
    },
    function() {
      var motionSensor = DEVICES.find(function(d) { return d.id === 'sensor_motion_lr'; });
      if (motionSensor) {
        motionSensor.state = !motionSensor.state;
        if (motionSensor.state) {
          addLog('\u{1F440}', '<strong>Motion Sensor</strong> activity detected in Living Room');
        }
      }
    },
    function() {
      addLog('\u{1F4F7}', '<strong>Front Camera</strong> motion detected');
    },
    function() {
      var humidity = DEVICES.find(function(d) { return d.id === 'sensor_humidity'; });
      if (humidity) {
        humidity.value = clamp(humidity.value + randInt(-3, 3), 30, 70);
      }
    },
    function() {
      var thermos = DEVICES.filter(function(d) { return d.type === 'thermostat'; });
      var thermo = thermos[randInt(0, thermos.length - 1)];
      if (thermo) {
        thermo.current = clamp(thermo.current + randInt(-1, 1), 60, 80);
      }
    },
  ];

  events[randInt(0, events.length - 1)]();
  renderAll();
}

// ── Initialize ──────────────────────────────────────────────
function init() {
  setupNavigation();
  setupFilters();
  renderAll();
  updateClock();

  setInterval(updateClock, 1000);
  setInterval(simulateRandomEvent, 5000);
  setInterval(function() { energyData = generateEnergyData(); renderEnergy(); }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
