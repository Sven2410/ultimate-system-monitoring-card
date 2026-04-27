# Ultimate System Monitoring Card

A compact, beautiful Home Assistant Lovelace card that shows six key system metrics at a glance — all configurable through the GUI editor without touching YAML.

![Preview](https://raw.githubusercontent.com/Sven2410/ultimate-system-monitoring-card/main/preview.png)

---

## Features

- **6 configurable metrics** — each backed by any HA entity you choose
  - Free disk space
  - Used disk space
  - Memory usage
  - IP address
  - CPU usage
  - CPU temperature
- **GUI editor** — configure all entities via the built-in card editor (no YAML required)
- **Colour-coded progress bars** — green / amber / red based on thresholds
- **Live status badge** — shows *Online* or *Partially* depending on entity availability
- **Liquid Glass theme compatible** — respects your `card-mod` backdrop filters
- **Mobile & desktop friendly** — minimum 44 px tap targets, scroll-aware touch handling
- **Shadow DOM isolation** — styles never bleed into the dashboard
- **Zero external dependencies**

---

## Installation via HACS

1. Go to **HACS → Frontend → ⋮ → Custom repositories**
2. Add `https://github.com/Sven2410/ultimate-system-monitoring-card` — category **Lovelace**
3. Install **Ultimate System Monitoring Card**
4. Add the resource (HACS does this automatically for most setups)
5. Reload your browser

### Manual installation

1. Copy `dist/ultimate-system-monitoring-card.js` to `config/www/`
2. Add the resource in **Settings → Dashboards → Resources**:
   ```
   URL:  /local/ultimate-system-monitoring-card.js
   Type: JavaScript module
   ```
3. Reload your browser

---

## Configuration

### Via GUI editor

Click **+ Add card**, search for *Ultimate System Monitoring* and open the visual editor. Assign a HA entity to each of the six slots.

### Via YAML

```yaml
type: custom:ultimate-system-monitoring-card
title: Systeem Monitor          # optional, defaults to "Systeem Monitor"
entity_disk_free:  sensor.disk_free
entity_disk_used:  sensor.disk_use_percent
entity_memory:     sensor.memory_use_percent
entity_ip:         sensor.local_ip
entity_cpu_usage:  sensor.processor_use
entity_cpu_temp:   sensor.processor_temperature
```

All six entity fields are **optional** — unset slots display *"Niet ingesteld"* (Not configured).

---

## Recommended entities (Home Assistant System Monitor integration)

| Slot | Recommended entity |
|---|---|
| Disk free | `sensor.disk_free` |
| Disk used | `sensor.disk_use_percent` |
| Memory | `sensor.memory_use_percent` |
| IP address | `sensor.local_ip` *(Network integration)* |
| CPU usage | `sensor.processor_use` |
| CPU temperature | `sensor.processor_temperature` |

Enable the **System Monitor** integration under **Settings → Devices & Services → Add integration → System Monitor**.

---

## Progress bar colour thresholds

| Metric | 🟢 Green | 🟠 Amber | 🔴 Red |
|---|---|---|---|
| Disk free | > 30 % of reference | 10–30 % | < 10 % |
| Disk used | < 60 % | 60–80 % | > 80 % |
| Memory | < 60 % | 60–80 % | > 80 % |
| CPU usage | < 60 % | 60–80 % | > 80 % |
| CPU temp | < 50 °C | 50–70 °C | > 70 °C |

---

## Theming

The card uses only HA CSS variables — it automatically adapts to any theme:

| Variable | Usage |
|---|---|
| `var(--primary-color)` | Icons and accent fills |
| `var(--primary-text-color)` | Metric values |
| `var(--secondary-text-color)` | Labels and dim states |
| `var(--divider-color)` | Tile borders and bar tracks |
| `var(--error-color)` | Critical threshold colour |

---

## Repository structure

```
ultimate-system-monitoring-card/
├── hacs.json
├── README.md
└── dist/
    └── ultimate-system-monitoring-card.js
```

---

## License

MIT © [Sven2410](https://github.com/Sven2410)
