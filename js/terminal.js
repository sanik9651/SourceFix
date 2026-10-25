/**
 * SourceFix — Terminal Logger & Progress Management Module
 * Handles glitch terminal logging, hex dump stream, and real progress metrics.
 */

export function formatBytes(b) {
    if (!b || b <= 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3);
    return (b / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + s[i];
}

export class TerminalLogger {
    constructor(terminalContainerId = 'terminal-content', wrapperId = 'glitch-terminal') {
        this.content = document.getElementById(terminalContainerId);
        this.wrapper = document.getElementById(wrapperId);
        this.streamId = null;
    }

    log(text, cls = 'log-info') {
        if (!this.content) return;
        const d = document.createElement('div');
        const ts = new Date().toISOString().slice(11, 23);
        let styled = text;

        if (text.startsWith('[SCAN]')) {
            styled = `<span class="log-scan">[SCAN]</span> ${text.slice(6)}`;
        } else if (text.startsWith('[FOUND]')) {
            styled = `<span class="log-found">[FOUND]</span> ${text.slice(7)}`;
        } else if (text.startsWith('[BUILD]')) {
            styled = `<span class="log-build">[BUILD]</span> ${text.slice(7)}`;
        } else if (text.startsWith('[REMUX]')) {
            styled = `<span class="log-remux">[REMUX]</span> ${text.slice(7)}`;
        } else if (text.startsWith('[PREVIEW]')) {
            styled = `<span class="log-ok font-bold">[PREVIEW]</span> ${text.slice(9)}`;
        } else if (text.startsWith('[OK]')) {
            styled = `<span class="log-ok font-bold">[OK]</span> ${text.slice(4)}`;
        } else if (text.startsWith('[WARN]')) {
            styled = `<span class="log-warn font-bold">[WARN]</span> ${text.slice(6)}`;
        } else if (text.startsWith('[ERROR]')) {
            styled = `<span class="log-err font-bold">[ERROR]</span> ${text.slice(7)}`;
        }

        d.innerHTML = `<span class="log-ts">[${ts}]</span> <span class="${cls}">${styled}</span>`;
        this.content.appendChild(d);
        if (this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
    }

    hexLine(u8, off, len = 16) {
        if (!u8 || u8.length === 0 || !this.content) return;
        const chunk = Array.from(u8.slice(off, Math.min(off + len, u8.length)));
        const h = chunk.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        const a = chunk.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
        const d = document.createElement('div');
        d.innerHTML = `<span class="log-ts">0x${off.toString(16).padStart(8, '0').toUpperCase()}</span>  <span class="log-hex">${h.padEnd(47, ' ')}</span>  <span style="color:#38bdf8;opacity:.6">${a}</span>`;
        this.content.appendChild(d);
        if (this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
    }

    startStream(u8) {
        this.stopStream();
        if (!u8 || u8.length < 16) return;
        this.streamId = setInterval(() => {
            const o = Math.floor(Math.random() * Math.max(1, u8.length - 16));
            this.hexLine(u8, o);
        }, 120);
    }

    stopStream() {
        if (this.streamId) {
            clearInterval(this.streamId);
            this.streamId = null;
        }
    }

    clear() {
        if (this.content) {
            this.content.innerHTML = '';
        }
    }
}

export class ProgressController {
    constructor() {
        this.fill   = document.getElementById('progress-fill');
        this.pctEl  = document.getElementById('percentText');
        this.stEl   = document.getElementById('statusText');
        this.subEl  = document.getElementById('substep-text');
        this.cB     = document.getElementById('cnt-bytes');
        this.cF     = document.getElementById('cnt-frames');
        this.cFx    = document.getElementById('cnt-fixes');
        this.cntB = 0;
        this.cntF = 0;
        this.cntFx = 0;
    }

    setProgress(pct, txt = '', sub = '') {
        if (this.fill)  this.fill.style.width = pct + '%';
        if (this.pctEl) this.pctEl.textContent = pct + '%';
        if (this.stEl && txt)  this.stEl.textContent = txt;
        if (this.subEl && sub !== undefined) this.subEl.textContent = sub;
    }

    updateCounters(bytes, frames, fixes) {
        if (this.cB)  this.cB.textContent  = formatBytes(bytes);
        if (this.cF)  this.cF.textContent  = frames;
        if (this.cFx) this.cFx.textContent = fixes;
    }

    animateCounters(tb, tf, tfx, dur = 350) {
        const t0 = performance.now();
        const sb = this.cntB, sf = this.cntF, sfx = this.cntFx;
        const tick = now => {
            const p = Math.min((now - t0) / dur, 1);
            const e = 1 - Math.pow(1 - p, 3);
            this.cntB = Math.round(sb + (tb - sb) * e);
            this.cntF = Math.round(sf + (tf - sf) * e);
            this.cntFx = Math.round(sfx + (tfx - sfx) * e);
            this.updateCounters(this.cntB, this.cntF, this.cntFx);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    reset() {
        this.setProgress(0, 'Инициализация…', '');
        this.cntB = 0;
        this.cntF = 0;
        this.cntFx = 0;
        this.updateCounters(0, 0, 0);
    }
}
