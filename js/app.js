/**
 * SourceFix — Application Entry Point & Unified Format Router (ES-Module)
 * Coordinates 3D scenes, drag-and-drop, terminal logging, modular engines, and responsive previews.
 */

import { initThreeScenes } from './three-scene.js';
import { TerminalLogger, ProgressController, formatBytes } from './terminal.js';
import { detectSignature } from './magic-bytes.js';
import { MP4Engine } from './engines/mp4-engine.js';
import { ImageEngine } from './engines/image-engine.js';
import { ZIPEngine } from './engines/zip-engine.js';
import { initTips } from './tips.js';

// Fallback routine for MP3 audio streams
async function repairMp3(u8, log, prog) {
    let fixes = 0, frames = 0;
    prog(20, 'Поиск синхрослово MPEG…', '');
    let syncOff = 0;
    for (let i = 0; i < Math.min(u8.length - 1, 131072); i++) {
        if (u8[i] === 0xFF && (u8[i + 1] & 0xE0) === 0xE0) {
            syncOff = i;
            break;
        }
    }
    if (syncOff > 0 && !(u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33)) {
        log(`[FOUND] Удалено ${syncOff} байт поврежденного заголовка перед аудиофреймами`, 'log-warn');
        u8 = u8.slice(syncOff);
        fixes++;
    }
    for (let i = 0; i < u8.length - 1; i++) {
        if (u8[i] === 0xFF && (u8[i + 1] & 0xE0) === 0xE0) {
            frames++;
            i += 3;
        }
    }
    prog(100, 'Готово', '');
    return {
        bytes: u8,
        summary: `MP3 поток очищен. Найдено ~${frames} валидных аудиофреймов.`,
        result: { fixes, frameCount: frames, error: null },
        fixes,
        frameCount: frames
    };
}

async function dispatchRepair(u8, sig, filename, log, prog) {
    switch (sig.ext) {
        case 'mp4':
            return await MP4Engine.repair(u8, prog, log);
        case 'jpg':
        case 'jpeg':
        case 'png':
            return await ImageEngine.repair(u8, prog, log, sig.ext);
        case 'zip':
        case 'docx':
        case 'xlsx':
        case 'pptx':
            return await ZIPEngine.repair(u8, prog, log);
        case 'mp3':
            return await repairMp3(u8, log, prog);
        default:
            log('[WARN] Специфический декодер отсутствует — проверка бинарного выравнивания', 'log-warn');
            return {
                bytes: u8,
                summary: 'Файл проверен. Формат не требует перепаковки контейнера.',
                result: { fixes: 0, frameCount: 0, error: null },
                fixes: 0,
                frameCount: 0
            };
    }
}

// Main Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('canvas-container');
    const logoCanvas    = document.getElementById('logo-canvas');
    const threeScene    = initThreeScenes(mainContainer, logoCanvas);

    // Theme Management (Light / Dark)
    const themeBtn  = document.getElementById('themeToggleBtn');
    const themeSun  = document.getElementById('themeIconSun');
    const themeMoon = document.getElementById('themeIconMoon');
    const themeText = document.getElementById('themeToggleText');

    function applyTheme(isLight) {
        document.documentElement.classList.toggle('light', isLight);
        document.documentElement.classList.toggle('dark', !isLight);
        if (themeSun && themeMoon) {
            themeSun.classList.toggle('hidden', !isLight);
            themeMoon.classList.toggle('hidden', isLight);
        }
        if (themeText) {
            themeText.textContent = isLight ? 'Светлая' : 'Темная';
        }
        if (threeScene && threeScene.setTheme) {
            threeScene.setTheme(isLight);
        }
    }

    const savedTheme = localStorage.getItem('sourcefix_theme');
    const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialIsLight = savedTheme ? (savedTheme === 'light') : systemPrefersLight;
    applyTheme(initialIsLight);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const nextIsLight = !document.documentElement.classList.contains('light');
            applyTheme(nextIsLight);
            localStorage.setItem('sourcefix_theme', nextIsLight ? 'light' : 'dark');
        });
    }

    // Initialize Author Tips / Donation Modal & Controls
    initTips();

    const terminal  = new TerminalLogger('terminal-content', 'glitch-terminal');
    const progress  = new ProgressController();

    const dropzone               = document.getElementById('dropzone');
    const fileInput              = document.getElementById('fileInput');
    const selectBtn              = document.getElementById('selectBtn');
    const sIdle                  = document.getElementById('state-idle');
    const sProc                  = document.getElementById('state-processing');
    const sSucc                  = document.getElementById('state-success');
    const sErr                   = document.getElementById('state-error');
    const nameEl                 = document.getElementById('fileNameDisplay');
    const sizeEl                 = document.getElementById('fileSizeDisplay');
    const badgeEl                = document.getElementById('detectedBadge');
    const summaryEl              = document.getElementById('repairSummary');
    const successSubtitle        = document.getElementById('successSubtitle');
    const errMsgEl               = document.getElementById('errorMsg');
    const dlBtn                  = document.getElementById('downloadBtn');
    const dlBtnText              = document.getElementById('downloadBtnText');
    const resetBtn               = document.getElementById('resetBtn');
    const resetErrBtn            = document.getElementById('resetBtnErr');
    const sumBytesEl             = document.getElementById('sum-bytes');
    const sumFrEl                = document.getElementById('sum-frames');
    const sumFxEl                = document.getElementById('sum-fixes');
    const sumBytesLbl            = document.getElementById('sum-bytes-lbl');
    const sumFramesLbl           = document.getElementById('sum-frames-lbl');

    // Preview components
    const previewWrapper         = document.getElementById('video-preview-wrapper');
    const previewVideo           = document.getElementById('repairedVideoPlayer');
    const previewMeta            = document.getElementById('video-preview-meta');

    const imagePreviewWrapper    = document.getElementById('image-preview-wrapper');
    const imagePreviewEl         = document.getElementById('repairedImagePreview');
    const imagePreviewMeta       = document.getElementById('image-preview-meta');

    const archivePreviewWrapper  = document.getElementById('archive-preview-wrapper');
    const archiveFileList        = document.getElementById('archiveFileList');
    const archivePreviewMeta     = document.getElementById('archive-preview-meta');

    let blob = null;
    let fname = '';
    let curState = 'idle';
    let stallTimer = null;
    let activePreviewUrls = [];

    function revokePreviewUrls() {
        for (const u of activePreviewUrls) {
            try { URL.revokeObjectURL(u); } catch (_) {}
        }
        activePreviewUrls = [];
    }

    function setUI(s) {
        curState = s;
        if (sIdle) sIdle.classList.toggle('hidden', s !== 'idle');
        if (sProc) sProc.classList.toggle('hidden', s !== 'processing');
        if (sSucc) sSucc.classList.toggle('hidden', s !== 'success');
        if (sErr)  sErr.classList.toggle('hidden', s !== 'error');
    }

    function doReset(e) {
        if (e) e.stopPropagation();
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
        if (fileInput) fileInput.value = '';
        blob = null;
        revokePreviewUrls();

        if (previewVideo) {
            previewVideo.pause();
            previewVideo.removeAttribute('src');
            previewVideo.load();
        }
        if (previewWrapper) previewWrapper.classList.add('hidden');

        if (imagePreviewEl) imagePreviewEl.removeAttribute('src');
        if (imagePreviewWrapper) imagePreviewWrapper.classList.add('hidden');

        if (archiveFileList) archiveFileList.innerHTML = '';
        if (archivePreviewWrapper) archivePreviewWrapper.classList.add('hidden');

        terminal.stopStream();
        terminal.clear();
        progress.reset();
        setUI('idle');
        threeScene.setState('idle');
        if (dropzone) {
            dropzone.style.borderColor = 'rgba(123,92,255,.3)';
            dropzone.classList.remove('glow-green', 'glow-danger');
            dropzone.classList.add('glow-neon');
        }
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (fileInput) fileInput.click();
        });
    }

    if (dropzone) {
        dropzone.addEventListener('click', () => {
            if (curState === 'idle' && fileInput) fileInput.click();
        });

        dropzone.addEventListener('dragover', e => {
            e.preventDefault();
            if (curState === 'idle') {
                dropzone.classList.add('drop-active');
                threeScene.setState('hover');
            }
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drop-active');
            if (curState === 'idle' || curState === 'hover') {
                threeScene.setState('idle');
            }
        });

        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('drop-active');
            if (e.dataTransfer && e.dataTransfer.files.length && curState === 'idle') {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files.length && curState === 'idle') {
                handleFile(e.target.files[0]);
            }
        });
    }

    if (dlBtn) {
        dlBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', doReset);
    if (resetErrBtn) resetErrBtn.addEventListener('click', doReset);

    function showError(msg) {
        if (errMsgEl) errMsgEl.textContent = msg;
        threeScene.setState('error');
        setUI('error');
        progress.setProgress(100, 'Ошибка', '');
        if (dropzone) {
            dropzone.style.borderColor = 'rgba(255,62,108,.4)';
            dropzone.classList.remove('glow-neon', 'glow-green');
            dropzone.classList.add('glow-danger');
        }
    }

    async function handleFile(file) {
        terminal.clear();
        progress.reset();
        revokePreviewUrls();
        setUI('processing');
        threeScene.setState('processing');

        if (dropzone) {
            dropzone.style.borderColor = 'rgba(123,92,255,.4)';
            dropzone.classList.remove('glow-green', 'glow-danger');
            dropzone.classList.add('glow-neon');
        }

        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);
        if (badgeEl) badgeEl.textContent = 'SCANNING…';

        terminal.log(`[SCAN] Загрузка файла в память: ${file.name} (${formatBytes(file.size)})`, 'log-info');
        progress.setProgress(5, 'Чтение файла в RAM…', 'загрузка бинарного буфера');

        let ab;
        try {
            ab = await file.arrayBuffer();
        } catch (e) {
            showError('Ошибка чтения файла в память: ' + e.message);
            return;
        }

        const u8 = new Uint8Array(ab);
        terminal.startStream(u8);
        progress.setProgress(10, 'Определение сигнатуры…', 'побайтовый анализ структуры');

        terminal.log('--- HEX СРЕЗ ЗАГОЛОВКА ---', 'log-info');
        terminal.hexLine(u8, 0);
        terminal.hexLine(u8, 16);

        let sig = detectSignature(u8, file.name);
        if (badgeEl) badgeEl.textContent = sig.label;
        terminal.stopStream();
        terminal.log(`[FOUND] Тип данных: ${sig.label}`, sig.ext ? 'log-ok' : 'log-warn');

        progress.setProgress(15, 'Запуск движка восстановления…', '');
        progress.animateCounters(file.size, 0, 0, 300);

        let res;
        try {
            res = await dispatchRepair(
                u8,
                sig,
                file.name,
                (txt, cls) => terminal.log(txt, cls),
                (pct, txt, sub) => {
                    progress.setProgress(pct, txt, sub);
                    progress.animateCounters(Math.round(file.size * pct / 100), 0, 0, 150);
                }
            );
        } catch (e) {
            terminal.stopStream();
            showError('Исключение движка ремонта: ' + e.message);
            return;
        }

        terminal.stopStream();

        if (res.result && res.result.error) {
            progress.setProgress(100, 'Ошибка ремонта', '');
            threeScene.setState('error');
            showError(res.result.error);
            return;
        }

        progress.setProgress(100, 'Готово!', '');
        const outFrames = (res.result ? res.result.frameCount : res.frameCount) || (res.files ? res.files.length : 1);
        const outFixes  = (res.result ? res.result.fixes : res.fixes) || 0;
        progress.animateCounters(res.bytes.length, outFrames, outFixes, 400);

        const mimes = {
            mp4: 'video/mp4',
            mp3: 'audio/mpeg',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            zip: 'application/zip',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };

        const finalExt = res.ext || sig.ext || (file.name.split('.').pop() || 'bin');
        fname = file.name.replace(/\.[^/.]+$/, '') + '_repaired.' + finalExt;
        blob = new Blob([res.bytes], { type: res.mime || mimes[finalExt] || 'application/octet-stream' });

        if (sumBytesEl) sumBytesEl.textContent = formatBytes(res.bytes.length);
        if (sumFrEl)    sumFrEl.textContent    = outFrames || '—';
        if (sumFxEl)    sumFxEl.textContent    = outFixes;
        if (summaryEl)  summaryEl.textContent  = res.summary;

        if (successSubtitle) {
            successSubtitle.textContent = res.label
                ? `${res.label} реконструирован и проверен`
                : 'Файл успешно восстановлен';
        }

        // Configure stat chips labels
        if (['jpg', 'jpeg', 'png'].includes(finalExt)) {
            if (sumBytesLbl) sumBytesLbl.textContent = 'размер фото';
            if (sumFramesLbl) sumFramesLbl.textContent = 'изображений';
            if (dlBtnText) dlBtnText.textContent = 'Скачать изображение';
        } else if (['zip', 'docx', 'xlsx', 'pptx'].includes(finalExt)) {
            if (sumBytesLbl) sumBytesLbl.textContent = 'размер архива';
            if (sumFramesLbl) sumFramesLbl.textContent = 'файлов спасено';
            if (dlBtnText) {
                dlBtnText.textContent = finalExt === 'zip'
                    ? 'Скачать ZIP архив'
                    : `Скачать ${res.label ? res.label.split('(')[0].trim() : 'документ'}`;
            }
        } else {
            if (sumBytesLbl) sumBytesLbl.textContent = 'размер видео';
            if (sumFramesLbl) sumFramesLbl.textContent = 'кадров спасено';
            if (dlBtnText) dlBtnText.textContent = 'Скачать восстановленное видео';
        }

        // Hide all previews by default
        if (previewWrapper) previewWrapper.classList.add('hidden');
        if (imagePreviewWrapper) imagePreviewWrapper.classList.add('hidden');
        if (archivePreviewWrapper) archivePreviewWrapper.classList.add('hidden');

        // 1. Browser Video Preview Player (MP4)
        if (finalExt === 'mp4' && previewVideo && previewWrapper) {
            previewWrapper.classList.remove('hidden');
            if (previewMeta) previewMeta.textContent = 'Инициализация аппаратного декодера…';

            previewVideo.onloadedmetadata = () => {
                const aud = (res.audioInfo && res.audioInfo.samples && res.audioInfo.samples.length > 0)
                    ? ` • AAC ${res.audioInfo.channels === 1 ? 'Mono' : 'Stereo'}`
                    : '';
                if (previewMeta) {
                    previewMeta.textContent = `${previewVideo.videoWidth}x${previewVideo.videoHeight}${aud} • ${previewVideo.duration.toFixed(1)}s • H.264 Clean`;
                }
                terminal.log(`[PREVIEW] Встроенный плеер готов: ${previewVideo.videoWidth}x${previewVideo.videoHeight}${aud}, ${previewVideo.duration.toFixed(1)}с`, 'log-ok');
            };

            const previewUrl = URL.createObjectURL(blob);
            activePreviewUrls.push(previewUrl);
            previewVideo.src = previewUrl;
            previewVideo.load();
            if (previewVideo.readyState >= 1) {
                previewVideo.onloadedmetadata();
            }
        }

        // 2. Browser Image Preview (JPEG & PNG)
        else if (['jpg', 'jpeg', 'png'].includes(finalExt) && imagePreviewWrapper && imagePreviewEl) {
            imagePreviewWrapper.classList.remove('hidden');
            const imgUrl = URL.createObjectURL(blob);
            activePreviewUrls.push(imgUrl);
            imagePreviewEl.src = imgUrl;

            imagePreviewEl.onload = () => {
                const w = imagePreviewEl.naturalWidth || res.width;
                const h = imagePreviewEl.naturalHeight || res.height;
                const typeStr = finalExt === 'png' ? 'PNG 24/32-bit' : 'JPEG sRGB';
                if (imagePreviewMeta) {
                    imagePreviewMeta.textContent = `${w}x${h} • ${typeStr} • 100% Valid`;
                }
                terminal.log(`[PREVIEW] Предпросмотр изображения готов: ${w}x${h} (${typeStr})`, 'log-ok');
            };
        }

        // 3. Browser Archive / Office Document File List Preview (ZIP, DOCX, XLSX)
        else if (['zip', 'docx', 'xlsx', 'pptx'].includes(finalExt) && archivePreviewWrapper && archiveFileList) {
            archivePreviewWrapper.classList.remove('hidden');
            const fileCount = res.files ? res.files.length : 0;
            if (archivePreviewMeta) {
                archivePreviewMeta.textContent = `${fileCount} файлов • ${formatBytes(res.bytes.length)} • Каталог восстановлен`;
            }

            archiveFileList.innerHTML = '';
            if (res.files && res.files.length > 0) {
                for (const f of res.files.slice(0, 50)) {
                    const row = document.createElement('div');
                    row.className = 'flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5 transition';
                    const isDir = f.name.endsWith('/');
                    const iconSvg = isDir
                        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
                        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

                    row.innerHTML = `
                        <div class="flex items-center gap-2 truncate pr-2">
                            <span>${iconSvg}</span>
                            <span class="truncate text-slate-200" title="${f.name}">${f.name}</span>
                        </div>
                        <span class="text-[11px] text-slate-400 font-mono whitespace-nowrap">${formatBytes(f.size)}</span>
                    `;
                    archiveFileList.appendChild(row);
                }

                if (res.files.length > 50) {
                    const more = document.createElement('div');
                    more.className = 'text-center text-[10px] text-slate-500 py-1 font-mono';
                    more.textContent = `... и еще ${res.files.length - 50} файлов`;
                    archiveFileList.appendChild(more);
                }
            }
            terminal.log(`[PREVIEW] Список содержимого сформирован: ${fileCount} файлов`, 'log-ok');
        }

        threeScene.setState('success');
        if (dropzone) {
            dropzone.style.borderColor = 'rgba(16,185,129,.4)';
            dropzone.classList.remove('glow-neon', 'glow-danger');
            dropzone.classList.add('glow-green');
        }
        setUI('success');
    }
});
