"""
HA Monitor — AppDaemon App
Monitors Home Assistant entity states, battery levels, and device availability.
Exposes a REST API consumed by the web dashboard.
"""

from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timezone
from typing import Any

import appdaemon.plugins.hass.hassapi as hass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _battery_from_attributes(attributes: dict) -> int | None:
    """Extract battery level (0-100) from entity attributes, or None."""
    for key in ("battery_level", "battery"):
        val = attributes.get(key)
        if val is not None:
            try:
                return int(float(val))
            except (ValueError, TypeError):
                pass
    return None


# ---------------------------------------------------------------------------
# Main App
# ---------------------------------------------------------------------------

class HAMonitor(hass.Hass):
    """AppDaemon application that monitors every Home Assistant entity."""

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def initialize(self) -> None:
        # Config from ha_monitor.yaml
        self.battery_threshold: int = int(self.args.get("battery_threshold", 20))
        self.domains_to_track: list[str] = self.args.get("domains_to_track", [
            "binary_sensor", "climate", "cover", "device_tracker",
            "fan", "light", "lock", "media_player", "sensor", "switch",
        ])
        self.check_interval: int = int(self.args.get("check_interval", 60))
        self.max_events: int = int(self.args.get("max_events", 200))
        self.notification_target: str | None = self.args.get("notification_target")

        # Runtime state
        self._entities: dict[str, dict] = {}
        self._events: deque[dict] = deque(maxlen=self.max_events)
        self._alerts: dict[str, dict] = {}

        # Boot
        self._load_initial_states()
        self.listen_state(self._on_state_change)
        self.run_every(self._periodic_check, "now+5", self.check_interval)

        # REST endpoints exposed via AppDaemon's built-in HTTP server
        self.register_endpoint(self._api_status, "ha_monitor")
        self.register_endpoint(self._api_entities, "ha_monitor_entities")
        self.register_endpoint(self._api_events, "ha_monitor_events")
        self.register_endpoint(self._api_alerts, "ha_monitor_alerts")

        self.log(
            f"HA Monitor started — tracking {len(self.domains_to_track)} domains, "
            f"battery threshold {self.battery_threshold}%",
            level="INFO",
        )

    # ------------------------------------------------------------------
    # State management
    # ------------------------------------------------------------------

    def _load_initial_states(self) -> None:
        """Snapshot all current HA states into local cache."""
        all_states: dict = self.get_state() or {}
        for entity_id, data in all_states.items():
            domain = entity_id.split(".")[0]
            if domain in self.domains_to_track:
                self._upsert_entity(
                    entity_id,
                    state=data.get("state", "unknown"),
                    attributes=data.get("attributes", {}),
                    last_changed=data.get("last_changed", _now_iso()),
                )
        self.log(f"Loaded {len(self._entities)} entities from HA", level="INFO")

    def _upsert_entity(
        self,
        entity_id: str,
        state: str,
        attributes: dict,
        last_changed: str,
    ) -> None:
        domain = entity_id.split(".")[0]
        battery = _battery_from_attributes(attributes)

        self._entities[entity_id] = {
            "entity_id": entity_id,
            "domain": domain,
            "friendly_name": attributes.get("friendly_name", entity_id),
            "state": state,
            "battery": battery,
            "last_changed": last_changed,
            "attributes": {
                k: v for k, v in attributes.items()
                if k not in ("friendly_name",) and not isinstance(v, (list, dict))
            },
        }

    # ------------------------------------------------------------------
    # State-change listener
    # ------------------------------------------------------------------

    def _on_state_change(
        self,
        entity: str,
        attribute: str,
        old: Any,
        new: Any,
        kwargs: dict,
    ) -> None:
        if attribute != "state":
            return

        domain = entity.split(".")[0]
        if domain not in self.domains_to_track:
            return

        full = self.get_state(entity, attribute="all") or {}
        attrs = full.get("attributes", {})
        last_changed = full.get("last_changed", _now_iso())

        self._upsert_entity(entity, str(new), attrs, last_changed)

        # Record event
        self._events.appendleft({
            "timestamp": _now_iso(),
            "entity_id": entity,
            "domain": domain,
            "friendly_name": attrs.get("friendly_name", entity),
            "old_state": str(old) if old is not None else None,
            "new_state": str(new),
        })

        self._evaluate_alerts(entity, str(new), attrs)

        if new in ("unavailable", "unknown"):
            self.log(f"{entity} → {new}", level="WARNING")

    # ------------------------------------------------------------------
    # Alert evaluation
    # ------------------------------------------------------------------

    def _evaluate_alerts(self, entity_id: str, state: str, attrs: dict) -> None:
        name = attrs.get("friendly_name", entity_id)

        # --- Offline / unavailable ---
        offline_key = f"offline|{entity_id}"
        if state in ("unavailable", "unknown"):
            self._alerts[offline_key] = {
                "id": offline_key,
                "type": "offline",
                "severity": "warning",
                "entity_id": entity_id,
                "friendly_name": name,
                "message": f"{name} is {state}",
                "timestamp": _now_iso(),
            }
        else:
            self._alerts.pop(offline_key, None)

        # --- Battery level from attributes ---
        batt = _battery_from_attributes(attrs)
        batt_key = f"battery|{entity_id}"
        if batt is not None:
            if batt <= self.battery_threshold:
                self._alerts[batt_key] = {
                    "id": batt_key,
                    "type": "battery",
                    "severity": "critical" if batt <= 10 else "warning",
                    "entity_id": entity_id,
                    "friendly_name": name,
                    "message": f"{name} battery at {batt}%",
                    "value": batt,
                    "timestamp": _now_iso(),
                }
            else:
                self._alerts.pop(batt_key, None)

        # --- Battery sensor entity (sensor.*_battery) ---
        if entity_id.startswith("sensor.") and "battery" in entity_id:
            batt_sens_key = f"batt_sensor|{entity_id}"
            try:
                level = int(float(state))
                if level <= self.battery_threshold:
                    self._alerts[batt_sens_key] = {
                        "id": batt_sens_key,
                        "type": "battery",
                        "severity": "critical" if level <= 10 else "warning",
                        "entity_id": entity_id,
                        "friendly_name": name,
                        "message": f"{name}: {level}%",
                        "value": level,
                        "timestamp": _now_iso(),
                    }
                else:
                    self._alerts.pop(batt_sens_key, None)
            except (ValueError, TypeError):
                pass

        # Notify on new critical alert
        if self.notification_target:
            alert = self._alerts.get(batt_key) or self._alerts.get(offline_key)
            if alert and alert.get("severity") == "critical":
                self.call_service(
                    self.notification_target.replace(".", "/"),
                    message=alert["message"],
                    title="HA Monitor Alert",
                )

    # ------------------------------------------------------------------
    # Periodic health sweep
    # ------------------------------------------------------------------

    def _periodic_check(self, kwargs: dict) -> None:
        """Re-evaluate alerts for every tracked entity."""
        for entity_id, data in list(self._entities.items()):
            self._evaluate_alerts(entity_id, data["state"], data.get("attributes", {}))

        offline = sum(1 for e in self._entities.values() if e["state"] in ("unavailable", "unknown"))
        low_batt = sum(1 for a in self._alerts.values() if a["type"] == "battery")
        if offline or low_batt:
            self.log(
                f"Health check — offline: {offline}, low battery: {low_batt}",
                level="WARNING",
            )

    # ------------------------------------------------------------------
    # Summary helper
    # ------------------------------------------------------------------

    def _summary(self) -> dict:
        total = len(self._entities)
        offline = sum(1 for e in self._entities.values() if e["state"] in ("unavailable", "unknown"))
        domain_counts: dict[str, int] = {}
        for e in self._entities.values():
            domain_counts[e["domain"]] = domain_counts.get(e["domain"], 0) + 1

        return {
            "total_entities": total,
            "online": total - offline,
            "offline": offline,
            "total_alerts": len(self._alerts),
            "battery_alerts": sum(1 for a in self._alerts.values() if a["type"] == "battery"),
            "offline_alerts": sum(1 for a in self._alerts.values() if a["type"] == "offline"),
            "domain_counts": domain_counts,
            "last_updated": _now_iso(),
        }

    # ------------------------------------------------------------------
    # REST API endpoints
    # ------------------------------------------------------------------

    async def _api_status(self, request, kwargs: dict):
        """GET /api/appdaemon/ha_monitor"""
        return {
            "summary": self._summary(),
            "alerts": sorted(self._alerts.values(), key=lambda a: a["timestamp"], reverse=True),
            "recent_events": list(self._events)[:20],
        }, 200

    async def _api_entities(self, request, kwargs: dict):
        """GET /api/appdaemon/ha_monitor_entities[?domain=light]"""
        domain_filter = request.rel_url.query.get("domain")
        entities = list(self._entities.values())
        if domain_filter:
            entities = [e for e in entities if e["domain"] == domain_filter]
        entities.sort(key=lambda e: (e["domain"], e["friendly_name"].lower()))
        return {"entities": entities, "count": len(entities)}, 200

    async def _api_events(self, request, kwargs: dict):
        """GET /api/appdaemon/ha_monitor_events[?limit=50]"""
        limit = min(int(request.rel_url.query.get("limit", 50)), self.max_events)
        return {"events": list(self._events)[:limit]}, 200

    async def _api_alerts(self, request, kwargs: dict):
        """GET /api/appdaemon/ha_monitor_alerts"""
        alerts = sorted(self._alerts.values(), key=lambda a: a["timestamp"], reverse=True)
        return {"alerts": alerts, "count": len(alerts)}, 200
