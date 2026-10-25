/**
 * SourceFix — Magic Bytes & Deep Signature Detection Module
 * Resilient detection supporting truncated, shifted, or zero-wiped file headers.
 */

const STANDARD_SIGNATURES = [
    {
        ext: 'mp4',
        label: 'MP4 / MOV Видео (ISO Base Media)',
        test: u => (u[4] === 0x66 && u[5] === 0x74 && u[6] === 0x79 && u[7] === 0x70) || // ftyp at 4
                   (u[0] === 0x00 && u[1] === 0x00 && u[4] === 0x66 && u[5] === 0x74)
    },
    {
        ext: 'png',
        label: 'PNG Изображение',
        test: u => u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47 &&
                   u[4] === 0x0D && u[5] === 0x0A && u[6] === 0x1A && u[7] === 0x0A
    },
    {
        ext: 'jpg',
        label: 'JPEG Изображение',
        test: u => u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF
    },
    {
        ext: 'zip',
        label: 'ZIP Архив / Office Документ',
        test: u => u[0] === 0x50 && u[1] === 0x4B && (u[2] === 0x03 || u[2] === 0x05 || u[2] === 0x07)
    },
    {
        ext: 'mp3',
        label: 'MP3 Аудио',
        test: u => (u[0] === 0x49 && u[1] === 0x33 && u[2] === 0x33) || // ID3
                   (u[0] === 0xFF && (u[1] & 0xE0) === 0xE0)
    }
];

function hasMp4Boxes(u8, limit) {
    for (let i = 0; i <= Math.min(u8.length - 8, limit); i++) {
        if ((u8[i+4] === 0x6D && u8[i+5] === 0x6F && u8[i+6] === 0x6F && u8[i+7] === 0x76) || // moov
            (u8[i+4] === 0x6D && u8[i+5] === 0x64 && u8[i+6] === 0x61 && u8[i+7] === 0x74) || // mdat
            (u8[i+4] === 0x74 && u8[i+5] === 0x72 && u8[i+6] === 0x61 && u8[i+7] === 0x6B) || // trak
            (u8[i+4] === 0x6D && u8[i+5] === 0x64 && u8[i+6] === 0x69 && u8[i+7] === 0x61) || // mdia
            (u8[i+4] === 0x66 && u8[i+5] === 0x74 && u8[i+6] === 0x79 && u8[i+7] === 0x70)) { // ftyp
            return true;
        }
    }
    return false;
}

function hasZipHeaders(u8, limit, lowerName) {
    for (let i = 0; i <= Math.min(u8.length - 30, limit); i++) {
        if (u8[i] === 0x50 && u8[i+1] === 0x4B && u8[i+2] === 0x03 && u8[i+3] === 0x04) {
            const fnLen = u8[i+26] | (u8[i+27] << 8);
            if (fnLen > 0 && fnLen < 256 && i + 30 + fnLen <= u8.length) {
                const fn = new TextDecoder('utf-8', { fatal: false }).decode(u8.subarray(i + 30, i + 30 + fnLen));
                if (fn.includes('word/') || lowerName.endsWith('.docx')) {
                    return { ext: 'docx', label: 'Поврежденный документ Word (DOCX)' };
                }
                if (fn.includes('xl/') || lowerName.endsWith('.xlsx')) {
                    return { ext: 'xlsx', label: 'Поврежденная таблица Excel (XLSX)' };
                }
                if (fn.includes('ppt/') || lowerName.endsWith('.pptx')) {
                    return { ext: 'pptx', label: 'Поврежденная презентация PowerPoint (PPTX)' };
                }
            }
            if (lowerName.endsWith('.docx')) return { ext: 'docx', label: 'Поврежденный документ Word (DOCX)' };
            if (lowerName.endsWith('.xlsx')) return { ext: 'xlsx', label: 'Поврежденная таблица Excel (XLSX)' };
            if (lowerName.endsWith('.pptx')) return { ext: 'pptx', label: 'Поврежденная презентация PowerPoint (PPTX)' };
            return { ext: 'zip', label: 'Поврежденный ZIP архив' };
        }
    }
    return null;
}

function hasPngChunks(u8, limit) {
    for (let i = 0; i <= Math.min(u8.length - 8, limit); i++) {
        if (u8[i] === 0x89 && u8[i+1] === 0x50 && u8[i+2] === 0x4E && u8[i+3] === 0x47 &&
            u8[i+4] === 0x0D && u8[i+5] === 0x0A && u8[i+6] === 0x1A && u8[i+7] === 0x0A) {
            return true;
        }
        if (u8[i] === 0x49 && u8[i+1] === 0x48 && u8[i+2] === 0x44 && u8[i+3] === 0x52) {
            return true;
        }
        if (u8[i] === 0x49 && u8[i+1] === 0x44 && u8[i+2] === 0x41 && u8[i+3] === 0x54) {
            return true;
        }
    }
    return false;
}

function hasJpegStructure(u8, limit, isJpegHint) {
    for (let i = 0; i <= Math.min(u8.length - 4, limit); i++) {
        if (u8[i] === 0x4A && u8[i+1] === 0x46 && u8[i+2] === 0x49 && u8[i+3] === 0x46) {
            return { ext: 'jpg', label: 'Поврежденное JPEG изображение (сигнатура JFIF)' };
        }
        if (u8[i] === 0x45 && u8[i+1] === 0x78 && u8[i+2] === 0x69 && u8[i+3] === 0x66) {
            return { ext: 'jpg', label: 'Поврежденное JPEG изображение (метаданные Exif)' };
        }
    }

    for (let i = 0; i <= Math.min(u8.length - 10, limit); i++) {
        if (u8[i] === 0xFF && (u8[i+1] === 0xC0 || u8[i+1] === 0xC2)) {
            const segLen = (u8[i+2] << 8) | u8[i+3];
            const precision = u8[i+4];
            const h = (u8[i+5] << 8) | u8[i+6];
            const w = (u8[i+7] << 8) | u8[i+8];
            const comps = u8[i+9];

            if (precision === 8 && segLen >= 11 && segLen <= 256 && h > 0 && w > 0 && (comps === 1 || comps === 3 || comps === 4)) {
                if (isJpegHint) {
                    return { ext: 'jpg', label: 'Поврежденное JPEG изображение (найден заголовок кадра SOF)' };
                }
                for (let j = 0; j < Math.min(u8.length - 4, limit); j++) {
                    if (u8[j] === 0xFF && u8[j+1] === 0xDB) {
                        return { ext: 'jpg', label: 'Поврежденное JPEG изображение (найдены маркеры SOF и DQT)' };
                    }
                }
            }
        }
    }

    if (isJpegHint) {
        for (let i = 0; i < Math.min(u8.length - 4, limit); i++) {
            if (u8[i] === 0xFF && (u8[i+1] === 0xDB || u8[i+1] === 0xC4)) {
                return { ext: 'jpg', label: 'Поврежденное JPEG изображение' };
            }
        }
    }

    return null;
}

function hasAacStream(u8, limit) {
    for (let i = 0; i <= Math.min(u8.length - 14, limit); i++) {
        if (u8[i] === 0xFF && (u8[i+1] & 0xF6) === 0xF0) {
            const frameLen = ((u8[i+3] & 0x03) << 11) | (u8[i+4] << 3) | (u8[i+5] >> 5);
            if (frameLen >= 7 && frameLen < 4096 && i + frameLen + 7 <= u8.length) {
                const next = i + frameLen;
                if (u8[next] === 0xFF && (u8[next+1] & 0xF6) === 0xF0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function deepProbe(u8, filename = '') {
    if (!u8 || u8.length < 4) return null;

    const probeLimit = Math.min(u8.length, 2 * 1024 * 1024);
    const lowerName = filename.toLowerCase();
    const isJpegHint = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
    const isMp4Hint  = lowerName.endsWith('.mp4') || lowerName.endsWith('.mov') || lowerName.endsWith('.m4v');
    const isPngHint  = lowerName.endsWith('.png');
    const isZipHint  = lowerName.endsWith('.zip') || lowerName.endsWith('.docx') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.pptx');

    // Priority 1: Check format matching the filename hint first
    if (isMp4Hint && hasMp4Boxes(u8, probeLimit)) {
        return { ext: 'mp4', label: 'Поврежденный MP4 видеофайл (найдены медиа-боксы)' };
    }

    if (isZipHint) {
        const zipRes = hasZipHeaders(u8, probeLimit, lowerName);
        if (zipRes) return zipRes;
        if (lowerName.endsWith('.docx')) return { ext: 'docx', label: 'Поврежденный документ Word (DOCX)' };
        if (lowerName.endsWith('.xlsx')) return { ext: 'xlsx', label: 'Поврежденная таблица Excel (XLSX)' };
        if (lowerName.endsWith('.pptx')) return { ext: 'pptx', label: 'Поврежденная презентация PowerPoint (PPTX)' };
        return { ext: 'zip', label: 'Поврежденный ZIP архив' };
    }

    if (isPngHint && hasPngChunks(u8, probeLimit)) {
        return { ext: 'png', label: 'Поврежденное PNG изображение (найдены чанки IHDR/IDAT)' };
    }

    if (isJpegHint) {
        const jpgRes = hasJpegStructure(u8, probeLimit, true);
        if (jpgRes) return jpgRes;
    }

    // Priority 2: Generic Deep Probe in order of specificity
    const zipRes = hasZipHeaders(u8, probeLimit, lowerName);
    if (zipRes) return zipRes;

    if (hasMp4Boxes(u8, probeLimit)) {
        return { ext: 'mp4', label: 'Поврежденный MP4 видеофайл' };
    }

    if (hasPngChunks(u8, probeLimit)) {
        return { ext: 'png', label: 'Поврежденное PNG изображение (найдены чанки IHDR/IDAT)' };
    }

    const jpgRes = hasJpegStructure(u8, probeLimit, isJpegHint);
    if (jpgRes) return jpgRes;

    // Annex-B start codes (verified)
    for (let i = 0; i < Math.min(probeLimit - 5, 262144); i++) {
        if (u8[i] === 0 && u8[i+1] === 0 && (u8[i+2] === 1 || (u8[i+2] === 0 && u8[i+3] === 1))) {
            const off = (u8[i+2] === 1) ? i + 3 : i + 4;
            const nalType = u8[off] & 0x1F;
            if ([7, 8, 5, 1, 6].includes(nalType)) {
                return {
                    ext: 'mp4',
                    label: 'Сырой H.264 / AVC поток (Annex-B)'
                };
            }
        }
    }

    // AAC ADTS stream (verified with frame length)
    if (hasAacStream(u8, probeLimit)) {
        return {
            ext: 'mp4',
            label: 'Медиапоток AAC / H.264'
        };
    }

    return null;
}

export function detectSignature(u8, filename = '') {
    if (!u8 || u8.length === 0) {
        return { ext: null, label: 'Пустой файл' };
    }

    // Fast check by first magic bytes
    for (const sig of STANDARD_SIGNATURES) {
        if (sig.test(u8)) {
            if (sig.ext === 'zip') {
                const lower = filename.toLowerCase();
                if (lower.endsWith('.docx')) return { ext: 'docx', label: 'Документ Microsoft Word (DOCX)' };
                if (lower.endsWith('.xlsx')) return { ext: 'xlsx', label: 'Таблица Microsoft Excel (XLSX)' };
                if (lower.endsWith('.pptx')) return { ext: 'pptx', label: 'Презентация Microsoft PowerPoint (PPTX)' };
            }
            return { ext: sig.ext, label: sig.label };
        }
    }

    // Deep probe for files with zeroed headers or shifted offsets
    const deep = deepProbe(u8, filename);
    if (deep) return deep;

    // Fallback to filename extension
    if (filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg'].includes(ext)) return { ext: 'jpg', label: 'Поврежденный JPEG' };
        if (ext === 'png') return { ext: 'png', label: 'Поврежденный PNG' };
        if (ext === 'zip') return { ext: 'zip', label: 'Поврежденный ZIP архив' };
        if (ext === 'docx') return { ext: 'docx', label: 'Поврежденный документ Word (DOCX)' };
        if (ext === 'xlsx') return { ext: 'xlsx', label: 'Поврежденная таблица Excel (XLSX)' };
        if (ext === 'mp4') return { ext: 'mp4', label: 'Поврежденный MP4' };
        if (ext === 'mp3') return { ext: 'mp3', label: 'Поврежденный MP3' };
    }

    return { ext: null, label: 'Бинарный поток / Неизвестный заголовок' };
}
