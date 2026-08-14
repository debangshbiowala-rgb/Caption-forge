// ─────────────────────────────────────────────────────────────
//  STATE  (language and style are tracked independently)
// ─────────────────────────────────────────────────────────────
let selectedStyle   = 'classic';   // Step 4 — font style, self-contained
let selectedLang    = 'auto';      // Step 3 — language, self-contained
let selectedQuality = 'full';
let hinglishOn      = false;
let generatedBlob   = null;        // webm result
let mp4Blob         = null;
let ffmpegInstance  = null;
let keyVisible      = false;

const QUALITY = {
  full: { w: 1080, h: 1920 },
  lite: { w: 720,  h: 1280 },
  mini: { w: 480,  h: 854  }
};

// ─────────────────────────────────────────────────────────────
//  CINEMATIC FONT STYLES (config-driven — add a style by adding an entry)
// ─────────────────────────────────────────────────────────────
const FONT_STYLES = {
  classic: { font: 'bold 72px "Arial Black", Arial, sans-serif', fill: '#FFFFFF', stroke: '#000000', lineWidth: 6 },
  neon:    { font: 'bold 68px "Arial Black", Arial, sans-serif', fill: '#f8aaff', stroke: '#9b00d3', lineWidth: 3, shadowColor: '#e040fb', shadowBlur: 24 },
  fire:    { font: 'bold italic 72px "Arial Black", Arial, sans-serif', fill: '#ffaa00', stroke: '#ff4400', lineWidth: 4, shadowColor: '#ff2200', shadowBlur: 20 },
  clean:   { font: '300 56px "Syne", Arial, sans-serif', fill: '#e0f7fa' },
  retro:   { font: 'bold italic 68px Georgia, serif', fill: '#f5c518', stroke: '#8b6914', lineWidth: 4, shadowColor: 'rgba(0,0,0,.9)', shadowOffsetX: 3, shadowOffsetY: 3 },
  bold:    { font: '900 80px "Arial Black", Arial, sans-serif', fill: '#ffffff', stroke: '#ff5c72', lineWidth: 6 },
  epic:    { font: '900 66px Cinzel, serif', fill: '#e8c874', stroke: '#3a2a0a', lineWidth: 4, shadowColor: '#000', shadowBlur: 10 },
  poster:  { font: '400 84px "Bebas Neue", Arial, sans-serif', fill: '#ffffff', stroke: '#000', lineWidth: 5 },
  impact:  { font: '400 80px Anton, Arial, sans-serif', fill: '#ffcc00', stroke: '#000', lineWidth: 6, shadowColor: '#000', shadowBlur: 6 },
  elegant: { font: 'italic 700 60px "Playfair Display", serif', fill: '#f5e6d3', stroke: '#000', lineWidth: 2, shadowColor: 'rgba(0,0,0,.7)', shadowBlur: 8 },
  noir:    { font: '400 54px "Special Elite", monospace', fill: '#e8e8e8', stroke: '#000', lineWidth: 2 },
  scifi:   { font: '700 58px Orbitron, sans-serif', fill: '#00e5ff', stroke: '#003b44', lineWidth: 3, shadowColor: '#00e5ff', shadowBlur: 18 },
  horror:  { font: '400 66px Creepster, cursive', fill: '#c40000', stroke: '#000', lineWidth: 4, shadowColor: '#600', shadowBlur: 14 },
  action:  { font: '400 70px Bangers, cursive', fill: '#ff5c00', stroke: '#1a0900', lineWidth: 5, shadowColor: '#000', shadowBlur: 6 }
};

// MIX mode: two font families on screen at once, like a professional lyric-video layout —
// a big/bold current line on top and a smaller preview line underneath. Both rotate every
// MIX_INTERVAL seconds through a curated cinematic pairing.
const MIX_BIG   = ['impact', 'poster', 'fire', 'epic', 'action'];
const MIX_SMALL = ['elegant', 'noir', 'scifi', 'clean', 'retro'];
const MIX_INTERVAL = 3;

// ─────────────────────────────────────────────────────────────
//  UI CONTROLS
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
  selectedQuality = el.dataset.q;
}

function toggleHinglish() {
  hinglishOn = !hinglishOn;
  document.getElementById('hinglishSwitch').classList.toggle('on', hinglishOn);
}

// ─────────────────────────────────────────────────────────────
//  FILE UPLOAD UI
// ─────────────────────────────────────────────────────────────
const fileInput = document.getElementById('audioFile');
const fileZone  = document.getElementById('fileZone');

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  document.getElementById('fileIcon').textContent = '✓';
  document.getElementById('fzText').textContent   = 'File selected:';
  document.getElementById('fzName').textContent   = f.name;
  document.getElementById('fzSub').textContent    = (f.size / 1024 / 1024).toFixed(1) + ' MB';
  document.getElementById('fileErr').style.display = 'none';
  fileZone.style.borderColor = 'var(--accent)';
  fileZone.style.background  = 'rgba(200,245,96,.04)';
});

fileZone.addEventListener('dragover',  e => { e.preventDefault(); fileZone.classList.add('dragover'); });
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
//  LOG / PROGRESS
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
  document.getElementById('progPct').textContent   = pct + '%';
}

// ─────────────────────────────────────────────────────────────
//  AUDIO PROCESSING
// ─────────────────────────────────────────────────────────────
function sliceAudioBuffer(buffer, startSec, endSec) {
  const sr          = buffer.sampleRate;
  const startSample = Math.floor(startSec * sr);
  const endSample   = Math.min(Math.floor(endSec * sr), buffer.length);
  const numSamples  = endSample - startSample;
  if (numSamples <= 0) return null;

  const ctx = new OfflineAudioContext(buffer.numberOfChannels, numSamples, sr);
  const out = ctx.createBuffer(buffer.numberOfChannels, numSamples, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src  = buffer.getChannelData(c);
    const dest = out.getChannelData(c);
    for (let i = 0; i < numSamples; i++) dest[i] = src[startSample + i];
  }
  return out;
}

async function reduceNoise(audioBuffer) {
  const offCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
  const src = offCtx.createBufferSource();
  src.buffer = audioBuffer;

  const hp = offCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 40;
  hp.Q.value = 0.5;

  const comp = offCtx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value       = 40;
  comp.ratio.value      = 3;
  comp.attack.value     = 0.01;
  comp.release.value    = 0.3;

  src.connect(hp);
  hp.connect(comp);
  comp.connect(offCtx.destination);
  src.start(0);
  return offCtx.startRendering();
}

function audioBufferToWav(buffer) {
  const sr     = buffer.sampleRate;
  const data   = buffer.getChannelData(0);
  const length = data.length;
  const arrBuf = new ArrayBuffer(44 + length * 2);
  const view   = new DataView(arrBuf);

  const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  ws(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
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

// ── transcribeChunk: whisper-large + auto language + 3 retries ──
async function transcribeChunk(wavBlob, apiKey, timeOffset, langOverride, attempt = 1) {
  const MAX_RETRIES = 3;
  const langParam = (!langOverride || langOverride === 'auto') ? '&detect_language=true' : '&language=' + langOverride;
  const url = 'https://api.deepgram.com/v1/listen?model=whisper-large' + langParam + '&smart_format=true&punctuate=true&utterances=false';

  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Token ' + apiKey, 'Content-Type': 'audio/wav' },
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
      log(`  HTTP ${resp.status} — retrying in ${wait / 1000}s (${attempt}/${MAX_RETRIES})...`, 'err');
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

  const transcript = json?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  const words = json?.results?.channels?.[0]?.alternatives?.[0]?.words || [];

  if (words.length === 0 && transcript.trim()) {
    const chunkDur = wavBlob.size / (16000 * 2);
    const wList = transcript.trim().split(/\s+/);
    const avgLen = chunkDur / Math.max(wList.length, 1);
    return wList.map((w, i) => ({ word: w, start: timeOffset + i * avgLen, end: timeOffset + (i + 1) * avgLen, conf: 0.5 }));
  }

  return words.map(w => ({
    word:  w.punctuated_word || w.word,
    start: parseFloat(w.start) + timeOffset,
    end:   parseFloat(w.end)   + timeOffset,
    conf:  w.confidence
  }));
}

function fillGaps(words) {
  if (!words.length) return words;
  const out = [];
  let lastEnd = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.start > lastEnd + 0.5 && i > 0) out.push({ word: '', start: lastEnd, end: w.start, gap: true });
    out.push(w);
    lastEnd = w.end;
  }
  return out;
}

// Roman Hindi ("Hinglish") — transliterates only non-Latin words, leaves English words untouched
// so mixed Hindi/English lyrics keep their English parts exactly as sung.
function applyHinglish(words) {
  if (typeof transliterate !== 'function') {
    log('Hinglish library unavailable — showing native script instead', 'err');
    return words;
  }
  const nonLatin = /[^\u0000-\u007F]/;
  return words.map(w => (w.word && nonLatin.test(w.word)) ? { ...w, word: transliterate(w.word) } : w);
}

// ─────────────────────────────────────────────────────────────
//  CAPTION RENDERING
// ─────────────────────────────────────────────────────────────
function applyStyleCfg(ctx, cfg) {
  ctx.font          = cfg.font;
  ctx.lineWidth     = cfg.lineWidth || 0;
  ctx.strokeStyle   = cfg.stroke || 'transparent';
  ctx.shadowColor   = cfg.shadowColor || 'transparent';
  ctx.shadowBlur    = cfg.shadowBlur || 0;
  ctx.shadowOffsetX = cfg.shadowOffsetX || 0;
  ctx.shadowOffsetY = cfg.shadowOffsetY || 0;
}

function scaleFontStr(fontStr, factor) {
  return fontStr.replace(/(\d+)px/, (m, n) => Math.max(20, Math.round(parseInt(n, 10) * factor)) + 'px');
}

function wrapWords(ctx, wordObjs, maxW) {
  const lines = [];
  let line = [], lineStr = '';
  for (const w of wordObjs) {
    const test = lineStr ? lineStr + ' ' + w.word : w.word;
    if (ctx.measureText(test).width > maxW && lineStr) {
      lines.push(line);
      line = [w]; lineStr = w.word;
    } else {
      line.push(w); lineStr = test;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

// Draws one caption row centered at cy. activeWord (if given) is drawn at full opacity;
// every other word is dimmed — a karaoke-style highlight that works with any font config.
function drawWordRow(ctx, W, cy, windowWords, activeWord, cfg, maxW) {
  if (!windowWords.length) return;
  applyStyleCfg(ctx, cfg);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const sizeMatch = cfg.font.match(/(\d+)px/);
  const lineH = Math.round((sizeMatch ? parseInt(sizeMatch[1], 10) : 50) * 1.1);
  const lines = wrapWords(ctx, windowWords, maxW);
  const totalH = lines.length * lineH;
  let ry = cy - totalH / 2 + lineH / 2;

  for (const line of lines) {
    const lineText  = line.map(w => w.word).join(' ');
    const lineWidth = ctx.measureText(lineText).width;
    let cx = W / 2 - lineWidth / 2;
    for (const w of line) {
      const isActive = w === activeWord;
      ctx.globalAlpha = activeWord ? (isActive ? 1 : 0.6) : 0.85;
      ctx.fillStyle = cfg.fill || '#ffffff';
      if (cfg.lineWidth) ctx.strokeText(w.word, cx, ry);
      ctx.fillText(w.word, cx, ry);
      cx += ctx.measureText(w.word + ' ').width;
    }
    ry += lineH;
  }
  ctx.globalAlpha = 1;
}

function buildWindow(words, startIdx, count) {
  const out = [];
  for (let i = startIdx; i < words.length && out.length < count; i++) {
    if (!words[i].gap) out.push(words[i]);
  }
  return out;
}

// Single-style rendering — one font family for the whole caption line.
function drawSingleStyle(ctx, W, H, windowWords, activeWord, style) {
  const cfg = FONT_STYLES[style] || FONT_STYLES.classic;
  ctx.save();
  drawWordRow(ctx, W, H * 0.82, windowWords, activeWord, cfg, W - 80);
  ctx.restore();
}

// MIX rendering — two font families at once: a big/bold current line on top,
// a smaller preview of the next words underneath. Both rotate every MIX_INTERVAL seconds.
function drawMixStyle(ctx, W, H, words, activeWord, activeIdx, t) {
  const bigKey   = MIX_BIG[Math.floor(t / MIX_INTERVAL) % MIX_BIG.length];
  const smallKey = MIX_SMALL[Math.floor(t / MIX_INTERVAL) % MIX_SMALL.length];
  const bigCfg   = FONT_STYLES[bigKey];
  const smallCfg = { ...FONT_STYLES[smallKey], font: scaleFontStr(FONT_STYLES[smallKey].font, 0.44) };

  const upperWindow = buildWindow(words, Math.max(0, activeIdx - 2), 5);
  const lastUpperIdx = upperWindow.length ? words.indexOf(upperWindow[upperWindow.length - 1]) : activeIdx;
  const lowerWindow = buildWindow(words, lastUpperIdx + 1, 6);

  ctx.save();
  drawWordRow(ctx, W, H * 0.76, upperWindow, activeWord, bigCfg, W - 70);
  drawWordRow(ctx, W, H * 0.87, lowerWindow, null, smallCfg, W - 100);
  ctx.restore();
}

function generateVideo(words, style, durationSec, quality) {
  return new Promise((resolve, reject) => {
    const { w: W, h: H } = QUALITY[quality] || QUALITY.full;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const bitrate = quality === 'mini' ? 1200000 : quality === 'lite' ? 2000000 : 3000000;
    const stream   = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
    const chunks   = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop  = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = e => reject(e.error);
    recorder.start();

    const fps   = 30;
    const total = Math.ceil(durationSec * fps);
    let frame   = 0;

    const drawFrame = () => {
      if (frame >= total) { recorder.stop(); return; }
      const t = frame / fps;

      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, W, H);

      const activeWord = words.find(w => !w.gap && w.start <= t && w.end >= t);
      if (activeWord) {
        const activeIdx = words.indexOf(activeWord);
        if (style === 'mix') {
          drawMixStyle(ctx, W, H, words, activeWord, activeIdx, t);
        } else {
          const windowWords = buildWindow(words, Math.max(0, activeIdx - 2), 6);
          drawSingleStyle(ctx, W, H, windowWords, activeWord, style);
        }
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

  document.getElementById('keyErr').style.display  = apiKey ? 'none' : 'block';
  document.getElementById('fileErr').style.display = fileEl.files[0] ? 'none' : 'block';
  if (!apiKey || !fileEl.files[0]) valid = false;
  if (!valid) return;

  const file = fileEl.files[0];
  const btn  = document.getElementById('genBtn');
  btn.disabled = true;
  document.getElementById('dlSection').style.display = 'none';
  generatedBlob = null;
  mp4Blob = null;

  try {
    setProgress(5, 'Reading audio file...');
    log('Decoding audio: ' + file.name);

    const arrBuf   = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let buffer     = await audioCtx.decodeAudioData(arrBuf);
    const totalDur = buffer.duration;
    log('Duration: ' + totalDur.toFixed(1) + 's | ' + buffer.sampleRate + ' Hz');

    setProgress(15, 'Removing background noise...');
    buffer = await reduceNoise(buffer);
    log('Noise reduction done', 'ok');

    const CHUNK = 25;
    const numChunks = Math.ceil(totalDur / CHUNK);
    let allWords = [];

    log(`Splitting into ${numChunks} chunks | Language: ${selectedLang}${hinglishOn ? ' | Hinglish on' : ''}`);

    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK;
      const end   = Math.min(start + CHUNK, totalDur);
      setProgress(Math.round(15 + (i / numChunks) * 55), `Transcribing chunk ${i + 1} of ${numChunks}...`);

      const chunk = sliceAudioBuffer(buffer, start, end);
      if (!chunk) continue;

      const wavBlob = audioBufferToWav(chunk);
      const wordsChunk = await transcribeChunk(wavBlob, apiKey, start, selectedLang);
      log(`Chunk ${i + 1}/${numChunks}: ${wordsChunk.length} words`, wordsChunk.length > 0 ? 'ok' : 'err');
      allWords.push(...wordsChunk);

      if (i < numChunks - 1) await new Promise(r => setTimeout(r, 600));
    }

    if (hinglishOn) {
      setProgress(72, 'Converting to Hinglish...');
      allWords = applyHinglish(allWords);
    }

    setProgress(78, 'Fixing timing gaps...');
    allWords = fillGaps(allWords);
    log(`Total words: ${allWords.filter(w => !w.gap).length}`, 'ok');

    if (allWords.filter(w => !w.gap).length === 0) {
      throw new Error('No words were transcribed. Check your API key and audio file.');
    }

    setProgress(82, 'Rendering green screen video...');
    generatedBlob = await generateVideo(allWords, selectedStyle, totalDur, selectedQuality);
    log('Video rendered! Size: ' + (generatedBlob.size / 1024 / 1024).toFixed(1) + ' MB', 'ok');

    setProgress(100, 'Done!');
    document.getElementById('dlSection').style.display = 'block';

  } catch (err) {
    log('ERROR: ' + err.message, 'err');
    setProgress(0, 'Error occurred — check log above');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────
//  DOWNLOAD — WEBM
// ─────────────────────────────────────────────────────────────
function downloadVideo() {
  if (!generatedBlob) return;
  triggerDownload(generatedBlob, 'webm');
  log('WEBM download started', 'ok');
}

function showGreenScreenNote() {
  log('Chroma-key the green background out in CapCut, Premiere, or DaVinci Resolve.', 'info');
}

function triggerDownload(blob, ext) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'captionforge_' + Date.now() + '.' + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
//  WEBM → MP4 CONVERSION (client-side, ffmpeg.wasm, single-thread — no server needed)
// ─────────────────────────────────────────────────────────────
async function loadFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = FFmpegWASM;
  const { toBlobURL } = FFmpegUtil;
  const ffmpeg = new FFmpeg();
  const progEl = document.getElementById('mp4Progress');

  ffmpeg.on('progress', ({ progress }) => {
    progEl.textContent = 'Converting... ' + Math.min(99, Math.round(progress * 100)) + '%';
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function downloadMp4() {
  if (!generatedBlob) return;
  const btn = document.getElementById('mp4Btn');
  const progEl = document.getElementById('mp4Progress');

  if (mp4Blob) { triggerDownload(mp4Blob, 'mp4'); return; }

  btn.disabled = true;
  progEl.style.display = 'block';
  progEl.textContent = 'Loading converter (first time only)...';

  try {
    const { fetchFile } = FFmpegUtil;
    const ffmpeg = await loadFfmpeg();

    progEl.textContent = 'Converting...';
    await ffmpeg.writeFile('input.webm', await fetchFile(generatedBlob));
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', 'output.mp4']);
    const data = await ffmpeg.readFile('output.mp4');

    mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
    progEl.textContent = 'MP4 ready';
    triggerDownload(mp4Blob, 'mp4');
    log('MP4 conversion done', 'ok');
  } catch (err) {
    progEl.textContent = 'Conversion failed — try WEBM instead';
    log('MP4 conversion error: ' + err.message, 'err');
  } finally {
    btn.disabled = false;
  }
}
