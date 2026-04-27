// Ultimate System Monitoring Card
// Version: 1.0.0
// Author: Sven2410
// GitHub: https://github.com/Sven2410/ultimate-system-monitoring-card

const CARD_TAG    = 'ultimate-system-monitoring-card';
const EDITOR_TAG  = 'ultimate-system-monitoring-card-editor';
const VERSION     = '1.0.0';

console.info(
  `%c ULTIMATE-SYSTEM-MONITORING-CARD %c v${VERSION} `,
  'background:#026FA1;color:#fff;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#1c1c1c;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0'
);

// ─── Editor ────────────────────────────────────────────────────────────────────

class UltimateSystemMonitoringCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._ready  = false;
  }

  set hass(h) {
    this._hass = h;
    if (this._ready) {
      const f = this.querySelector('ha-form');
      if (f) f.hass = h;
    } else {
      this._init();
    }
  }

  setConfig(c) {
    this._config = { ...c };
    if (this._ready) {
      const f = this.querySelector('ha-form');
      if (f) f.data = this._data();
    } else {
      this._init();
    }
  }

  _data() {
    return {
      title:            this._config.title             ?? 'Systeem Monitor',
      entity_disk_free: this._config.entity_disk_free  ?? '',
      entity_disk_used: this._config.entity_disk_used  ?? '',
      entity_memory:    this._config.entity_memory     ?? '',
      entity_ip:        this._config.entity_ip         ?? '',
      entity_cpu_usage: this._config.entity_cpu_usage  ?? '',
      entity_cpu_temp:  this._config.entity_cpu_temp   ?? '',
    };
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true,
    }));
  }

  _init() {
    if (!this._hass || this._ready) return;
    this._ready = true;

    this.innerHTML = `<ha-form></ha-form>`;
    const form = this.querySelector('ha-form');
    form.hass = this._hass;
    form.schema = [
      {
        name: 'title',
        label: 'Kaarttitel',
        selector: { text: {} },
      },
      {
        type: 'grid',
        name: '',
        schema: [
          { name: 'entity_disk_free', label: 'Schijfruimte vrij',     selector: { entity: {} } },
          { name: 'entity_disk_used', label: 'Schijfruimte gebruikt', selector: { entity: {} } },
          { name: 'entity_memory',    label: 'Geheugengebruik',        selector: { entity: {} } },
          { name: 'entity_ip',        label: 'IP-adres',               selector: { entity: {} } },
          { name: 'entity_cpu_usage', label: 'Processorgebruik',       selector: { entity: {} } },
          { name: 'entity_cpu_temp',  label: 'Processortemperatuur',   selector: { entity: {} } },
        ],
      },
    ];
    form.data = this._data();

    // Slechts ÉÉN listener — nooit opnieuw registreren
    form.addEventListener('value-changed', e => {
      const v = e.detail.value || {};
      const keys = [
        'title',
        'entity_disk_free', 'entity_disk_used',
        'entity_memory', 'entity_ip',
        'entity_cpu_usage', 'entity_cpu_temp',
      ];
      let changed = false;
      for (const k of keys) {
        if (v[k] !== undefined && v[k] !== this._config[k]) {
          this._config[k] = v[k];
          changed = true;
        }
      }
      if (changed) this._fire();
    });
  }
}

// ─── Main Card ─────────────────────────────────────────────────────────────────

class UltimateSystemMonitoringCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config   = {};
    this._hass     = null;
    this._domBuilt = false;
  }

  // ── HA integration ──────────────────────────────────────────────────────────

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title:            'Systeem Monitor',
      entity_disk_free: '',
      entity_disk_used: '',
      entity_memory:    '',
      entity_ip:        '',
      entity_cpu_usage: '',
      entity_cpu_temp:  '',
    };
  }

  setConfig(config) {
    if (!config) throw new Error('Geen configuratie opgegeven.');
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 3; }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _state(id)   { return (id && this._hass) ? (this._hass.states[id] || null) : null; }
  _unit(id)    { const s = this._state(id); return s?.attributes?.unit_of_measurement ?? ''; }
  _num(id)     { const s = this._state(id); if (!s) return null; const n = parseFloat(s.state); return isNaN(n) ? null : n; }

  _fmt(id) {
    const s = this._state(id);
    if (!s) return '—';
    const { state } = s;
    if (state === 'unavailable') return 'N/B';
    if (state === 'unknown')     return '?';
    const n = Number(state);          // strict: '192.168.1.229' → NaN (geen false positive)
    const unit = this._unit(id);
    if (!isNaN(n)) {
      const rounded = Math.round(n * 10) / 10;
      return unit ? `${rounded} ${unit}` : `${rounded}`;
    }
    return unit ? `${state} ${unit}` : state;
  }

  /**
   * Returns a 0–100 percentage for the progress bar.
   * For disk_free: inverted — more free = higher bar = good.
   */
  _pct(id, type) {
    const n    = this._num(id);
    const unit = this._unit(id);
    if (n === null) return 0;

    if (unit === '%') return Math.min(Math.max(n, 0), 100);

    if (type === 'disk_free') {
      // Assume max 2 TB (2048 GB) as reference
      return Math.min((n / 2048) * 100, 100);
    }
    if (type === 'disk_used') {
      return Math.min((n / 2048) * 100, 100);
    }
    if (type === 'memory') {
      // MB fallback
      return Math.min((n / 8192) * 100, 100);
    }
    if (type === 'temp') {
      return Math.min((n / 100) * 100, 100);
    }
    return Math.min(Math.max(n, 0), 100);
  }

  _color(id, type) {
    const n = this._num(id);
    if (n === null) return 'var(--secondary-text-color)';

    if (type === 'disk_free') {
      // More free = better
      const pct = this._pct(id, type);
      if (pct > 30) return '#4CAF50';
      if (pct > 10) return '#FF9800';
      return 'var(--error-color)';
    }
    if (type === 'temp') {
      if (n < 50) return '#4CAF50';
      if (n < 70) return '#FF9800';
      return 'var(--error-color)';
    }
    // Usage-type: higher = worse
    const pct = this._pct(id, type);
    if (pct < 60) return '#4CAF50';
    if (pct < 80) return '#FF9800';
    return 'var(--error-color)';
  }

  _isOk(id) {
    const s = this._state(id);
    return s && s.state !== 'unavailable' && s.state !== 'unknown';
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────

  _buildDOM() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card {
          padding: 16px 16px 14px;
          box-sizing: border-box;
          font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 14px;
        }
        .header-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: rgba(var(--rgb-primary-color, 2,111,161), 0.14);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .header-icon ha-icon {
          --mdc-icon-size: 20px;
          color: var(--primary-color);
        }
        .header-title {
          flex: 1;
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4CAF50;
          box-shadow: 0 0 5px #4CAF50;
          transition: background 0.3s, box-shadow 0.3s;
        }

        /* ── Grid ── */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        /* ── Tile ── */
        .tile {
          background: rgba(255,255,255,0.045);
          border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
          border-radius: 16px;
          padding: 11px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 82px;
          box-sizing: border-box;
          cursor: default;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.2s;
        }
        .tile:active { background: rgba(255,255,255,0.08); }

        .tile-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
        }
        .tile-icon {
          width: 30px; height: 30px;
          border-radius: 9px;
          background: rgba(var(--rgb-primary-color, 2,111,161), 0.14);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .tile-icon ha-icon {
          --mdc-icon-size: 16px;
          color: var(--primary-color);
        }
        .tile-value {
          flex: 1;
          text-align: right;
          font-size: 1.08rem;
          font-weight: 700;
          color: var(--primary-text-color);
          line-height: 1.25;
          word-break: break-all;
        }
        .tile-value.small { font-size: 0.82rem; font-weight: 600; }
        .tile-value.dim   { color: var(--secondary-text-color); font-style: italic; font-size: 0.8rem; font-weight: 400; }

        .tile-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.045em;
        }

        /* ── Progress bar ── */
        .bar-track {
          height: 4px;
          border-radius: 2px;
          background: var(--divider-color, rgba(255,255,255,0.1));
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 2px;
          width: 0%;
          transition: width 0.6s ease, background-color 0.4s ease;
        }

        /* ── IP tile: no bar, vertically centered ── */
        .tile.no-bar {
          justify-content: center;
        }
        .tile.no-bar .tile-label { margin-top: 2px; }
      </style>

      <ha-card>
        <div class="header">
          <div class="header-icon">
            <ha-icon icon="mdi:server-network"></ha-icon>
          </div>
          <div class="header-title" id="hdr-title">Systeem Monitor</div>
          <div class="status-badge">
            <div class="status-dot" id="status-dot"></div>
            <span id="status-text">Online</span>
          </div>
        </div>

        <div class="grid">

          <!-- Schijf vrij -->
          <div class="tile" id="tile-disk-free">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:harddisk"></ha-icon></div>
              <div class="tile-value" id="val-disk-free">—</div>
            </div>
            <div class="tile-label">Schijf vrij</div>
            <div class="bar-track"><div class="bar-fill" id="bar-disk-free"></div></div>
          </div>

          <!-- Schijf gebruikt -->
          <div class="tile" id="tile-disk-used">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:database"></ha-icon></div>
              <div class="tile-value" id="val-disk-used">—</div>
            </div>
            <div class="tile-label">Schijf gebruik</div>
            <div class="bar-track"><div class="bar-fill" id="bar-disk-used"></div></div>
          </div>

          <!-- Geheugen -->
          <div class="tile" id="tile-memory">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:memory"></ha-icon></div>
              <div class="tile-value" id="val-memory">—</div>
            </div>
            <div class="tile-label">Geheugen</div>
            <div class="bar-track"><div class="bar-fill" id="bar-memory"></div></div>
          </div>

          <!-- IP-adres -->
          <div class="tile no-bar" id="tile-ip">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:ip-network-outline"></ha-icon></div>
              <div class="tile-value small" id="val-ip">—</div>
            </div>
            <div class="tile-label">IP-adres</div>
          </div>

          <!-- Processorgebruik -->
          <div class="tile" id="tile-cpu-usage">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:cpu-64-bit"></ha-icon></div>
              <div class="tile-value" id="val-cpu-usage">—</div>
            </div>
            <div class="tile-label">Processor</div>
            <div class="bar-track"><div class="bar-fill" id="bar-cpu-usage"></div></div>
          </div>

          <!-- Temperatuur -->
          <div class="tile" id="tile-cpu-temp">
            <div class="tile-top">
              <div class="tile-icon"><ha-icon icon="mdi:thermometer-chevron-up"></ha-icon></div>
              <div class="tile-value" id="val-cpu-temp">—</div>
            </div>
            <div class="tile-label">Temperatuur</div>
            <div class="bar-track"><div class="bar-fill" id="bar-cpu-temp"></div></div>
          </div>

        </div>
      </ha-card>
    `;
  }

  _updateDOM() {
    if (!this._domBuilt) return;
    const r = this.shadowRoot;

    // Kaarttitel
    const titleEl = r.getElementById('hdr-title');
    if (titleEl) titleEl.textContent = this._config.title || 'Systeem Monitor';

    const metrics = [
      { id: 'disk-free',  entity: this._config.entity_disk_free, type: 'disk_free', bar: true },
      { id: 'disk-used',  entity: this._config.entity_disk_used, type: 'disk_used', bar: true },
      { id: 'memory',     entity: this._config.entity_memory,    type: 'memory',    bar: true },
      { id: 'ip',         entity: this._config.entity_ip,        type: 'text',      bar: false },
      { id: 'cpu-usage',  entity: this._config.entity_cpu_usage, type: 'usage',     bar: true },
      { id: 'cpu-temp',   entity: this._config.entity_cpu_temp,  type: 'temp',      bar: true },
    ];

    let allOnline = true;

    for (const m of metrics) {
      const valEl = r.getElementById(`val-${m.id}`);
      if (!valEl) continue;

      if (!m.entity) {
        // Niet geconfigureerd
        valEl.className = 'tile-value dim';
        valEl.textContent = 'Niet ingesteld';
        if (m.bar) {
          const bar = r.getElementById(`bar-${m.id}`);
          if (bar) { bar.style.width = '0%'; bar.style.background = 'var(--secondary-text-color)'; }
        }
        allOnline = false;
        continue;
      }

      const s = this._state(m.entity);
      const ok = this._isOk(m.entity);

      if (!ok) {
        valEl.className = 'tile-value dim';
        valEl.textContent = s ? (s.state === 'unavailable' ? 'Niet beschikbaar' : 'Onbekend') : '—';
        if (m.bar) {
          const bar = r.getElementById(`bar-${m.id}`);
          if (bar) { bar.style.width = '0%'; bar.style.background = 'var(--secondary-text-color)'; }
        }
        allOnline = false;
        continue;
      }

      // IP-adres: kleine weergave
      if (m.type === 'text') {
        valEl.className = 'tile-value small';
      } else {
        valEl.className = 'tile-value';
      }
      valEl.textContent = this._fmt(m.entity);

      if (m.bar) {
        const bar = r.getElementById(`bar-${m.id}`);
        if (bar) {
          const pct   = this._pct(m.entity, m.type);
          const color = this._color(m.entity, m.type);
          bar.style.width      = `${pct.toFixed(1)}%`;
          bar.style.background = color;
        }
      }
    }

    // Status indicator
    const dot  = r.getElementById('status-dot');
    const txt  = r.getElementById('status-text');
    const col  = allOnline ? '#4CAF50' : '#FF9800';
    const lbl  = allOnline ? 'Online'  : 'Gedeeltelijk';
    if (dot) { dot.style.background = col; dot.style.boxShadow = `0 0 5px ${col}`; }
    if (txt) txt.textContent = lbl;
  }

  _render() {
    if (!this._domBuilt) {
      this._buildDOM();
      this._domBuilt = true;
    }
    this._updateDOM();
  }
}

// ─── Registratie ───────────────────────────────────────────────────────────────

if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, UltimateSystemMonitoringCardEditor);
if (!customElements.get(CARD_TAG))   customElements.define(CARD_TAG,   UltimateSystemMonitoringCard);

window.customCards = window.customCards || [];
const _alreadyRegistered = window.customCards.some(c => c.type === CARD_TAG);
if (!_alreadyRegistered) {
  window.customCards.push({
    type:             CARD_TAG,
    name:             'Ultimate System Monitoring Card',
    description:      'Compacte systeem­monitoring: schijf­ruimte, geheugen, IP-adres, CPU-gebruik en temperatuur.',
    preview:          false,
    documentationURL: 'https://github.com/Sven2410/ultimate-system-monitoring-card',
  });
}
