// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
let selectedStyle = 'classic';
let selectedLang = 'auto';
let selectedQuality = '1080';
let generatedBlob = null;
let keyVisible = false;

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────
function toggleKey() {
    const inp = document.getElementById('apiKey');
    const btn = document.getElementById('toggleBtn');
    keyVisible = !keyVisible;
    inp.type = keyVisible ? 'text' : 'password';
    btn.textContent = keyVisible ? 'HIDE' : 'SHOW';
}

function setStyle(el) {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    selectedStyle = el.dataset.style;
}

function setLang(el) {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    selectedLang = el.dataset.lang;
}

function setQuality(el) {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    selectedQuality = el.dataset.quality;
}

// ─────────────────────────────────────────────────────────────
//  FILE UPLOAD UI
// ─────────────────────────────────────────────────────────────
const fileInput = document.getElementById('audioFile');
const fileZone = document.getElementById('fileZone');

fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    document.getElementById('fileIcon').textContent = '✓';
    document.getElementById('fzText').textContent = 'File selected:';
    document.getElementById('fzName').textContent = f.name;
    const mb = (f.size / 1024 / 1024).toFixed(1);
    document.getElementById('fzSub').textContent = mb + ' MB';
    document.getElementById('fileErr').style.display = 'none';
    fileZone.style.borderColor = 'var(--accent)';
    fileZone.style.background = 'rgba(200,245,96,.04)';
});

fileZone.addEventListener('dragover', e => { e.preventDefault();
    fileZone.classList.add('dragover'); });
fileZone.addEventListener('dragleave', () => fileZone.classList.remove('dragover'));
fileZone.addEventListener('drop', e => {
    e.preventDefault();
    fileZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f) {
        const dt = new DataTransfer();
        dt.items.add(f);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

// ─────────────────────────────────────────────────────────────
//  LOG & PROGRESS
// ─────────────────────────────────────────────────────────────
function log(msg, type = 'info') {
    const box = document.getElementById('logBox');
    box.style.display = 'block';
    const d = document.createElement('div');
    d.className = 'log-line' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    d.innerHTML = `<span class="ts">${ts}</span>${msg}`;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

function setProgress(pct, label) {
    document.getElementById('progressCard').style.display = 'block';
    document.getElementById('progFill').style.width = pct + '%';
    document.getElementById('progLabel').textContent = label;
    document.getElementById('progPct').textContent = pct + '%';
}

// ─────────────────────────────────────────────────────────────
//  TRANSLITERATION: Devanagari → Romanized Hindi (Hinglish)
// ─────────────────────────────────────────────────────────────
function transliterateDevanagariToRoman(text) {
    // Comprehensive mapping for common Devanagari → Romanized Hindi
    const map = {
        // Vowels
        'अ': 'a',
        'आ': 'aa',
        'इ': 'i',
        'ई': 'ee',
        'उ': 'u',
        'ऊ': 'oo',
        'ए': 'e',
        'ऐ': 'ai',
        'ओ': 'o',
        'औ': 'au',
        'ऋ': 'ri',
        'ॠ': 'rii',
        'ऌ': 'li',
        'ॡ': 'lii',
        'अं': 'an',
        'अः': 'ah',

        // Consonants
        'क': 'k',
        'ख': 'kh',
        'ग': 'g',
        'घ': 'gh',
        'ङ': 'ng',
        'च': 'ch',
        'छ': 'chh',
        'ज': 'j',
        'झ': 'jh',
        'ञ': 'ny',
        'ट': 't',
        'ठ': 'th',
        'ड': 'd',
        'ढ': 'dh',
        'ण': 'n',
        'त': 't',
        'थ': 'th',
        'द': 'd',
        'ध': 'dh',
        'न': 'n',
        'प': 'p',
        'फ': 'ph',
        'ब': 'b',
        'भ': 'bh',
        'म': 'm',
        'य': 'y',
        'र': 'r',
        'ल': 'l',
        'व': 'v',
        'श': 'sh',
        'ष': 'sh',
        'स': 's',
        'ह': 'h',
        'क्ष': 'ksh',
        'त्र': 'tr',
        'ज्ञ': 'gny',

        // Vowel signs (matras)
        'ा': 'aa',
        'ि': 'i',
        'ी': 'ee',
        'ु': 'u',
        'ू': 'oo',
        'े': 'e',
        'ै': 'ai',
        'ो': 'o',
        'ौ': 'au',
        'ृ': 'ri',
        'ॄ': 'rii',
        'ॅ': 'e',
        'ॆ': 'e',
        'ं': 'n',
        'ः': 'h',

        // Other
        '।': '.',
        '॥': '.',
        '्': '',
        '़': '',
        'ऽ': '',
        '०': '0',
        '१': '1',
        '२': '2',
        '३': '3',
        '४': '4',
        '५': '5',
        '६': '6',
        '७': '7',
        '८': '8',
        '९': '9',

        // Common conjuncts (simplified)
        'क्क': 'kk',
        'क्ट': 'kt',
        'क्ट्र': 'ktr',
        'क्न': 'kn',
        'क्म': 'km',
        'क्य': 'ky',
        'क्र': 'kr',
        'क्ल': 'kl',
        'क्व': 'kv',
        'क्ष': 'ksh',
        'ग्ग': 'gg',
        'ग्य': 'gy',
        'ग्र': 'gr',
        'ग्ल': 'gl',
        'घ्र': 'ghr',
        'ङ्क': 'ngk',
        'ङ्ग': 'ngg',
        'च्च': 'chch',
        'च्छ': 'chchh',
        'च्य': 'chy',
        'च्र': 'chr',
        'ज्ज': 'jj',
        'ज्य': 'jy',
        'ज्र': 'jr',
        'झ्झ': 'jhh',
        'ञ्च': 'nch',
        'ञ्ज': 'nj',
        'ट्ट': 'tt',
        'ट्ठ': 'tth',
        'ट्य': 'ty',
        'ट्र': 'tr',
        'ड्ड': 'dd',
        'ड्य': 'dy',
        'ड्र': 'dr',
        'ण्ट': 'nt',
        'ण्ठ': 'nth',
        'ण्ड': 'nd',
        'ण्ढ': 'ndh',
        'ण्य': 'ny',
        'ण्र': 'nr',
        'त्त': 'tt',
        'त्थ': 'tth',
        'त्य': 'ty',
        'त्र': 'tr',
        'त्व': 'tv',
        'थ्य': 'thy',
        'द्द': 'dd',
        'द्ध': 'ddh',
        'द्य': 'dy',
        'द्र': 'dr',
        'द्व': 'dv',
        'ध्य': 'dhy',
        'न्न': 'nn',
        'न्य': 'ny',
        'न्र': 'nr',
        'न्व': 'nv',
        'प्प': 'pp',
        'प्य': 'py',
        'प्र': 'pr',
        'प्ल': 'pl',
        'प्व': 'pv',
        'फ्र': 'phr',
        'ब्ब': 'bb',
        'ब्य': 'by',
        'ब्र': 'br',
        'भ्य': 'bhy',
        'भ्र': 'bhr',
        'म्म': 'mm',
        'म्य': 'my',
        'म्र': 'mr',
        'म्ल': 'ml',
        'य्य': 'yy',
        'य्र': 'yr',
        'य्व': 'yv',
        'ल्ल': 'll',
        'ल्य': 'ly',
        'ल्र': 'lr',
        'ल्व': 'lv',
        'व्व': 'vv',
        'व्य': 'vy',
        'व्र': 'vr',
        'श्च': 'shch',
        'श्न': 'shn',
        'श्य': 'shy',
        'श्र': 'shr',
        'श्व': 'shv',
        'ष्ट': 'sht',
        'ष्ठ': 'shth',
        'ष्ण': 'shn',
        'ष्य': 'shy',
        'ष्र': 'shr',
        'स्क': 'sk',
        'स्ट': 'st',
        'स्थ': 'sth',
        'स्न': 'sn',
        'स्य': 'sy',
        'स्र': 'sr',
        'स्व': 'sv',
        'ह्य': 'hy',
        'ह्र': 'hr',
        'ह्व': 'hv',
    };

    // Sort keys by length descending to handle multi-character matches first
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);

    let result = '';
    let i = 0;
    while (i < text.length) {
        let matched = false;
        for (const key of keys) {
            if (text.substring(i, i + key.length) === key) {
                result += map[key];
                i += key.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Preserve punctuation, numbers, and English characters
            const ch = text[i];
            if (/[a-zA-Z0-9\s.,!?;:'"()\-]/.test(ch)) {
                result += ch;
            } else if (ch === ' ') {
                result += ' ';
            } else {
                // For any other character, just pass through
                result += ch;
            }
            i++;
        }
    }

    // Clean up: handle common patterns
    result = result.replace(/\s+/g, ' ').trim();

    // Capitalize first letter of each sentence
    result = result.replace(/(^|\.\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

    return result;
}

// ─────────────────────────────────────────────────────────────
//  AUDIO HELPERS
// ─────────────────────────────────────────────────────────────
function sliceAudioBuffer(buffer, startSec, endSec) {
    const sr = buffer.sampleRate;
    const startSample = Math.floor(startSec * sr);
    const endSample = Math.min(Math.floor(endSec * sr), buffer.length);
    const numSamples = endSample - startSample;
    if (numSamples <= 0) return null;

    const ctx = new OfflineAudioContext(buffer.numberOfChannels, numSamples, sr);
    const out = ctx.createBuffer(buffer.numberOfChannels, numSamples, sr);

    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const src = buffer.getChannelData(c);
        const dest = out.getChannelData(c);
        for (let i = 0; i < numSamples; i++) {
            dest[i] = src[startSample + i];
        }
    }
    return out;
}

async function reduceNoise(audioBuffer) {
    const offCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );
    const src = offCtx.createBufferSource();
    src.buffer = audioBuffer;

    const hp = offCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 40;
    hp.Q.value = 0.5;

    const comp = offCtx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 40;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;

    src.connect(hp);
    hp.connect(comp);
    comp.connect(offCtx.destination);
    src.start(0);
    return offCtx.startRendering();
}

function audioBufferToWav(buffer) {
    const sr = buffer.sampleRate;
    const data = buffer.getChannelData(0);
    const length = data.length;
    const arrBuf = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrBuf);

    function ws(off, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    }
    ws(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    ws(8, 'WAVE');
    ws(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ws(36, 'data');
    view.setUint32(40, length * 2, true);

    let off = 44;
    for (let i = 0; i < length; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
    }
    return new Blob([arrBuf], { type: 'audio/wav' });
}

// ─────────────────────────────────────────────────────────────
//  TRANSCRIBE
// ─────────────────────────────────────────────────────────────
async function transcribeChunk(wavBlob, apiKey, timeOffset, langOverride, attempt = 1) {
    const MAX_RETRIES = 3;
    let langParam = '';
    if (!langOverride || langOverride === 'auto') {
        langParam = '&detect_language=true';
    } else if (langOverride === 'hinglish') {
        // Hinglish: use Hindi model, we'll transliterate the result
        langParam = '&language=hi';
    } else {
        langParam = '&language=' + langOverride;
    }

    const url = 'https://api.deepgram.com/v1/listen' +
        '?model=whisper-large' +
        langParam +
        '&smart_format=true' +
        '&punctuate=true' +
        '&utterances=false';

    let resp;
    try {
        resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + apiKey,
                'Content-Type': 'audio/wav'
            },
            body: wavBlob
        });
    } catch (netErr) {
        if (attempt < MAX_RETRIES) {
            log(`  Network error, retrying (${attempt}/${MAX_RETRIES})...`, 'err');
            await new Promise(r => setTimeout(r, 1500 * attempt));
            return transcribeChunk(wavBlob, apiKey, timeOffset, langOverride, attempt + 1);
        }
        throw new Error('Network failed after ' + MAX_RETRIES + ' attempts: ' + netErr.message);
    }

    if (resp.status === 429 || resp.status >= 500) {
        if (attempt < MAX_RETRIES) {
            const wait = 2000 * attempt;
            log(`  HTTP ${resp.status} — waiting ${wait/1000}s then retrying (${attempt}/${MAX_RETRIES})...`, 'err');
            await new Promise(r => setTimeout(r, wait));
            return transcribeChunk(wavBlob, apiKey, timeOffset, langOverride, attempt + 1);
        }
    }

    if (!resp.ok) {
        const txt = await resp.text();
        log(`  Deepgram HTTP ${resp.status}: ${txt.substring(0, 200)}`, 'err');
        throw new Error('Deepgram error ' + resp.status);
    }

    const json = await resp.json();

    const detectedLang = json?.results?.channels?.[0]?.detected_language;
    if (detectedLang) log(`  Detected language: ${detectedLang}`);

    let transcript = json?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    let words = json?.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Hinglish mode: transliterate Devanagari → Romanized Hindi
    if (langOverride === 'hinglish' && transcript) {
        const original = transcript;
        transcript = transliterateDevanagariToRoman(original);
        if (transcript !== original) {
            log(`  Transliterated: "${transcript.substring(0, 60)}..."`, 'ok');
        }
        // Also transliterate each word
        if (words.length > 0) {
            words = words.map(w => ({
                word: transliterateDevanagariToRoman(w.punctuated_word || w.word),
                start: parseFloat(w.start) + timeOffset,
                end: parseFloat(w.end) + timeOffset,
                conf: w.confidence
            }));
        } else if (transcript.trim()) {
            // Fallback: split transcript into words with approximate timing
            const chunkDur = wavBlob.size / (16000 * 2);
            const wList = transcript.trim().split(/\s+/);
            const avgLen = chunkDur / Math.max(wList.length, 1);
            words = wList.map((w, i) => ({
                word: w,
                start: timeOffset + i * avgLen,
                end: timeOffset + (i + 1) * avgLen,
                conf: 0.5
            }));
        }
    } else {
        // Normal mode: use words as-is, or build from transcript if empty
        if (words.length === 0 && transcript.trim()) {
            const chunkDur = wavBlob.size / (16000 * 2);
            const wList = transcript.trim().split(/\s+/);
            const avgLen = chunkDur / Math.max(wList.length, 1);
            words = wList.map((w, i) => ({
                word: w,
                start: timeOffset + i * avgLen,
                end: timeOffset + (i + 1) * avgLen,
                conf: 0.5
            }));
        } else {
            words = words.map(w => ({
                word: w.punctuated_word || w.word,
                start: parseFloat(w.start) + timeOffset,
                end: parseFloat(w.end) + timeOffset,
                conf: w.confidence
            }));
        }
    }

    if (transcript) log(`  Preview: "${transcript.substring(0, 60)}..."`, 'ok');
    return words;
}

function fillGaps(words) {
    if (!words.length) return words;
    const out = [];
    let lastEnd = 0;
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w.start > lastEnd + 0.5 && i > 0) {
            out.push({ word: '', start: lastEnd, end: w.start, gap: true });
        }
        out.push(w);
        lastEnd = w.end;
    }
    return out;
}

// ─────────────────────────────────────────────────────────────
//  VIDEO GENERATION — with cinematic & mixed fonts
// ─────────────────────────────────────────────────────────────
function getQualityDims(quality) {
    switch (quality) {
        case '1080':
            return { w: 1080, h: 1920 };
        case '720':
            return { w: 720, h: 1280 };
        case '480':
            return { w: 480, h: 854 };
        default:
            return { w: 1080, h: 1920 };
    }
}

// ── STYLE RENDERERS ──
const STYLES = {
    classic: (ctx, text, W, H, fontPrimary) => {
        ctx.font = `bold 68px "Arial Black", Arial, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, text, W / 2, H * 0.82, W - 80, 76, true);
    },
    neon: (ctx, text, W, H, fontPrimary) => {
        ctx.font = `bold 64px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#f8aaff';
        ctx.strokeStyle = '#9b00d3';
        ctx.lineWidth = 3;
        wrapText(ctx, text, W / 2, H * 0.82, W - 80, 76, true);
        ctx.shadowBlur = 0;
    },
    fire: (ctx, text, W, H, fontPrimary) => {
        ctx.save();
        ctx.font = `bold italic 68px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffaa00';
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 4;
        wrapText(ctx, text, W / 2, H * 0.82, W - 80, 76, true);
        ctx.shadowBlur = 0;
        ctx.restore();
    },
    clean: (ctx, text, W, H, fontPrimary) => {
        ctx.font = `300 52px "Syne", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e0f7fa';
        wrapText(ctx, text, W / 2, H * 0.82, W - 100, 66, false);
    },
    retro: (ctx, text, W, H, fontPrimary) => {
        ctx.font = `bold italic 64px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f5c518';
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.shadowBlur = 0;
        wrapText(ctx, text, W / 2, H * 0.82, W - 80, 76, true);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    },
    bold: (ctx, text, W, H, fontPrimary) => {
        ctx.font = `900 76px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#ff5c72';
        ctx.lineWidth = 6;
        ctx.fillStyle = '#ffffff';
        wrapText(ctx, text, W / 2, H * 0.82, W - 80, 86, true);
    },
    cinematic: (ctx, text, W, H, fontPrimary) => {
        // Cinematic style: elegant serif with gold accent
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow / glow
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.shadowBlur = 12;

        // Main text with cinematic font
        ctx.font = `700 58px "Cinzel", "Playfair Display", serif`;
        ctx.fillStyle = '#f5d742';
        ctx.strokeStyle = '#7a5a00';
        ctx.lineWidth = 3;
        wrapText(ctx, text, W / 2, H * 0.82, W - 90, 68, true);

        // Second pass: lighter overlay for shimmer effect
        ctx.shadowBlur = 0;
        ctx.font = `700 56px "Cinzel", "Playfair Display", serif`;
        ctx.fillStyle = 'rgba(255, 240, 180, 0.3)';
        ctx.strokeStyle = 'transparent';
        wrapText(ctx, text, W / 2, H * 0.82 - 2, W - 90, 68, false);

        ctx.restore();
    },
    mixed: (ctx, text, W, H, fontPrimary) => {
        // Mixed style: multiple fonts in one video
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = text.split(' ');
        const totalWords = words.length;
        if (totalWords === 0) return;

        // Determine layout: if too many words, wrap
        const maxPerLine = Math.min(5, Math.floor((W - 80) / 120));
        const lines = [];
        let line = [];
        for (const w of words) {
            line.push(w);
            if (line.length >= maxPerLine) {
                lines.push(line);
                line = [];
            }
        }
        if (line.length) lines.push(line);

        const lineH = Math.min(72, Math.floor((H * 0.35) / Math.max(lines.length, 1)));
        const startY = H * 0.82 - (lines.length - 1) * lineH / 2;

        const fonts = [
            `700 52px "Cinzel", serif`,
            `400 48px "Bebas Neue", sans-serif`,
            `700 italic 50px "Playfair Display", serif`,
            `800 46px "Anton", sans-serif`,
            `700 48px "Oswald", sans-serif`,
            `400 44px "Abril Fatface", serif`,
        ];

        for (let li = 0; li < lines.length; li++) {
            const lineWords = lines[li];
            const totalWidth = lineWords.reduce((sum, w) => sum + ctx.measureText(w).width + 20, 0);
            const startX = (W - Math.min(totalWidth, W - 80)) / 2;
            let x = startX;

            for (let wi = 0; wi < lineWords.length; wi++) {
                const w = lineWords[wi];
                const fontIdx = (li + wi) % fonts.length;
                ctx.font = fonts[fontIdx];
                const y = startY + li * lineH;

                // Random color variation for each word
                const colors = ['#f5d742', '#e040fb', '#ff9900', '#4fc3f7', '#ff5c72', '#aed581', '#ffab40'];
                const col = colors[(li + wi * 2) % colors.length];

                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowBlur = 8;
                ctx.fillStyle = col;
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeText(w, x, y);
                ctx.fillText(w, x, y);
                x += ctx.measureText(w).width + 16;
            }
        }

        ctx.restore();
    }
};

function wrapText(ctx, text, x, y, maxW, lineH, stroke) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const wrd of words) {
        const test = line ? line + ' ' + wrd : wrd;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = wrd;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);

    const totalH = lines.length * lineH;
    const startY = y - totalH / 2 + lineH / 2;

    for (let i = 0; i < lines.length; i++) {
        const ly = startY + i * lineH;
        if (stroke) ctx.strokeText(lines[i], x, ly);
        ctx.fillText(lines[i], x, ly);
    }
}

function generateVideo(words, style, durationSec, quality) {
    return new Promise((resolve, reject) => {
        const dims = getQualityDims(quality);
        const W = dims.w,
            H = dims.h;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ?
            'video/webm;codecs=vp9' :
            'video/webm';

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1500000 });
        const chunks = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        recorder.onerror = e => reject(e.error);

        recorder.start();

        const fps = 30;
        const total = Math.ceil(durationSec * fps);
        let frame = 0;

        // Pre-filter words for efficiency
        const nonGapWords = words.filter(w => !w.gap);

        const drawFrame = () => {
            if (frame >= total) {
                recorder.stop();
                return;
            }
            const t = frame / fps;

            // Green background
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(0, 0, W, H);

            // Find active words
            const active = nonGapWords.filter(w => w.start <= t && w.end >= t);

            if (active.length > 0) {
                const firstIdx = nonGapWords.indexOf(active[0]);
                const windowWords = [];
                for (let i = Math.max(0, firstIdx - 2); i < Math.min(nonGapWords.length, firstIdx + 4); i++) {
                    if (!nonGapWords[i].gap) windowWords.push(nonGapWords[i]);
                }
                const text = windowWords.map(w => w.word).join(' ');

                ctx.save();
                const styleFn = STYLES[style] || STYLES.classic;
                styleFn(ctx, text, W, H, null);
                ctx.restore();
            }

            frame++;
            requestAnimationFrame(drawFrame);
        };

        drawFrame();
    });
}

// ─────────────────────────────────────────────────────────────
//  MAIN PROCESS
// ─────────────────────────────────────────────────────────────
async function processAudio() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const fileEl = document.getElementById('audioFile');
    let valid = true;

    if (!apiKey) {
        document.getElementById('keyErr').style.display = 'block';
        valid = false;
    } else {
        document.getElementById('keyErr').style.display = 'none';
    }

    if (!fileEl.files[0]) {
        document.getElementById('fileErr').style.display = 'block';
        valid = false;
    } else {
        document.getElementById('fileErr').style.display = 'none';
    }

    if (!valid) return;

    const file = fileEl.files[0];
    const btn = document.getElementById('genBtn');

    btn.disabled = true;
    document.getElementById('dlSection').style.display = 'none';
    generatedBlob = null;

    try {
        setProgress(5, 'Reading audio file...');
        log('Decoding: ' + file.name);

        const arrBuf = await file.arrayBuffer();
        const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        let buffer = await audioCtx.decodeAudioData(arrBuf);
        const totalDur = buffer.duration;
        log('Duration: ' + totalDur.toFixed(1) + 's | SR: ' + buffer.sampleRate + ' Hz');

        setProgress(15, 'Removing background noise...');
        log('Applying noise filters...');
        buffer = await reduceNoise(buffer);
        log('Noise reduction done', 'ok');

        const CHUNK = 25;
        const numChunks = Math.ceil(totalDur / CHUNK);
        let allWords = [];

        // Determine the language to send to Deepgram
        let transcribeLang = selectedLang;
        // For Hinglish, we send 'hi' and transliterate after
        if (selectedLang === 'hinglish') transcribeLang = 'hi';

        log(`Splitting into ${numChunks} chunks (${CHUNK}s each) | Lang: ${selectedLang}`);

        for (let i = 0; i < numChunks; i++) {
            const start = i * CHUNK;
            const end = Math.min(start + CHUNK, totalDur);
            const pct = Math.round(15 + (i / numChunks) * 60);

            setProgress(pct, `Transcribing chunk ${i + 1}/${numChunks}...`);
            log(`Chunk ${i + 1}/${numChunks}: ${start.toFixed(1)}s – ${end.toFixed(1)}s`);

            const chunk = sliceAudioBuffer(buffer, start, end);
            if (!chunk) { log(`Chunk ${i+1} empty, skipping`); continue; }

            const wavBlob = audioBufferToWav(chunk);
            const words = await transcribeChunk(wavBlob, apiKey, start, transcribeLang);
            log(`  Got ${words.length} words`, words.length > 0 ? 'ok' : 'err');
            allWords.push(...words);

            if (i < numChunks - 1) await new Promise(r => setTimeout(r, 600));
        }

        setProgress(78, 'Fixing timing gaps...');
        allWords = fillGaps(allWords);
        const realWords = allWords.filter(w => !w.gap);
        log(`Total words: ${realWords.length}`, 'ok');

        if (realWords.length === 0) {
            throw new Error('No words transcribed. Check API key and audio file.');
        }

        setProgress(82, `Rendering ${selectedQuality}p green screen video...`);
        log(`Generating ${selectedQuality}p video at ${getQualityDims(selectedQuality).w}×${getQualityDims(selectedQuality).h}...`);
        generatedBlob = await generateVideo(allWords, selectedStyle, totalDur, selectedQuality);
        log('Video rendered! Size: ' + (generatedBlob.size / 1024 / 1024).toFixed(1) + ' MB', 'ok');

        setProgress(100, 'Done!');
        document.getElementById('dlSection').style.display = 'block';

    } catch (err) {
        log('ERROR: ' + err.message, 'err');
        setProgress(0, 'Error — check log above');
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}

// ─────────────────────────────────────────────────────────────
//  DOWNLOAD
// ─────────────────────────────────────────────────────────────
function downloadVideo() {
    if (!generatedBlob) return;
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captionforge_' + Date.now() + '.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log('Download started', 'ok');
}

function showGreenScreenNote() {
    log('Use chroma key in CapCut / DaVinci / Premiere to remove green.', 'info');
      }
