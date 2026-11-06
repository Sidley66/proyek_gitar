let audioCtx = null;
let currentOscillator = null;
let currentGainNode = null;
let analyser = null;
let animId = null;

// Preset Tuning Data
const tuningPresets = {
  standard: [
    { freq: 329.63, name: 'Senar 1 (E4)' },
    { freq: 246.94, name: 'Senar 2 (B3)' },
    { freq: 196.00, name: 'Senar 3 (G3)' },
    { freq: 146.83, name: 'Senar 4 (D3)' },
    { freq: 110.00, name: 'Senar 5 (A2)' },
    { freq: 82.41,  name: 'Senar 6 (E2)' }
  ],
  dropD: [
    { freq: 329.63, name: 'Senar 1 (E4)' },
    { freq: 246.94, name: 'Senar 2 (B3)' },
    { freq: 196.00, name: 'Senar 3 (G3)' },
    { freq: 146.83, name: 'Senar 4 (D3)' },
    { freq: 110.00, name: 'Senar 5 (A2)' },
    { freq: 73.42,  name: 'Senar 6 (D2)' }
  ],
  halfStep: [
    { freq: 311.13, name: 'Senar 1 (D#4)' },
    { freq: 233.08, name: 'Senar 2 (A#3)' },
    { freq: 185.00, name: 'Senar 3 (F#3)' },
    { freq: 138.59, name: 'Senar 4 (C#3)' },
    { freq: 103.83, name: 'Senar 5 (G#2)' },
    { freq: 77.78,  name: 'Senar 6 (D#2)' }
  ]
};

let currentStrings = tuningPresets.standard;

// Initialize Web Audio
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    drawVisualizer();
  }
}

// Render Tuner Grid Buttons
function renderTunerGrid() {
  const grid = document.getElementById('tuner-grid');
  grid.innerHTML = '';
  currentStrings.forEach((str) => {
    const btn = document.createElement('button');
    btn.className = 'string-btn';
    btn.onclick = function () { playTone(str.freq, str.name, this); };
    btn.innerHTML = `<span class="string-title">${str.name}</span><span class="string-freq">${str.freq.toFixed(2)} Hz</span>`;
    grid.appendChild(btn);
  });
}

function changeTuningPreset(presetKey) {
  currentStrings = tuningPresets[presetKey] || tuningPresets.standard;
  renderTunerGrid();
}

// Play Reference Tone
function playTone(frequency, stringName, buttonElement) {
  initAudio();

  if (currentOscillator && currentGainNode) {
    try {
      currentGainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      currentOscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  const volumeInput = parseFloat(document.getElementById('volume-control').value);
  let safeVolume = (frequency < 200) ? volumeInput * 0.7 : volumeInput;

  currentOscillator = audioCtx.createOscillator();
  currentGainNode = audioCtx.createGain();

  const waveSelect = document.getElementById('wave-select').value;
  currentOscillator.type = (frequency < 200) ? 'sine' : waveSelect;
  currentOscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  const now = audioCtx.currentTime;
  currentGainNode.gain.setValueAtTime(0, now);
  currentGainNode.gain.linearRampToValueAtTime(safeVolume, now + 0.05);

  currentOscillator.connect(currentGainNode);
  currentGainNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  currentOscillator.start(now);

  const duration = 1.8;
  currentGainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  currentOscillator.stop(now + duration);

  document.querySelectorAll('.string-btn').forEach(btn => btn.classList.remove('active'));
  if (buttonElement) buttonElement.classList.add('active');

  const statusBadge = document.getElementById('status-indicator');
  statusBadge.textContent = `Menyetel: ${stringName}`;
  statusBadge.classList.add('playing');

  setTimeout(() => {
    if (buttonElement) buttonElement.classList.remove('active');
    statusBadge.textContent = "Siap Digunakan";
    statusBadge.classList.remove('playing');
  }, duration * 1000);
}

// Play Polyphonic Chord Audio
function playChordAudio(freqArray) {
  initAudio();
  freqArray.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  });
}

// Visualizer Canvas
function drawVisualizer() {
  const canvas = document.getElementById('visualizer-canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderFrame() {
    animId = requestAnimationFrame(renderFrame);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#181825';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94e2d5';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  renderFrame();
}

// Auto Play All Strings
function playAllStrings() {
  const buttons = document.querySelectorAll('.string-btn');
  currentStrings.forEach((str, index) => {
    setTimeout(() => {
      playTone(str.freq, str.name, buttons[index]);
    }, index * 2000);
  });
}

// --- MIC REAL-TIME PITCH DETECTOR LOGIC ---
let isMicActive = false;
let micStream = null;

function toggleMicTuner() {
  if (isMicActive) {
    stopMicTuner();
  } else {
    startMicTuner();
  }
}

async function startMicTuner() {
  initAudio();
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
    isMicActive = true;

    document.getElementById('mic-status').textContent = "Mikrofon Aktif";
    document.getElementById('mic-status').style.borderColor = "#94e2d5";
    document.getElementById('mic-toggle-btn').textContent = "Hentikan Tuner Mic";
    
    detectPitch();
  } catch (err) {
    alert("Izin akses mikrofon ditolak atau tidak ditemukan.");
  }
}

function stopMicTuner() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
  }
  isMicActive = false;
  document.getElementById('mic-status').textContent = "Mikrofon Nonaktif";
  document.getElementById('mic-status').style.borderColor = "#a6e3a1";
  document.getElementById('mic-toggle-btn').textContent = "Mulai Tuner Mic";
  document.getElementById('detected-note').textContent = "--";
  document.getElementById('detected-freq').textContent = "0.00 Hz";
  document.getElementById('pitch-feedback').textContent = "Tekan 'Mulai Tuner Mic' & petik gitar Anda";
}

function detectPitch() {
  if (!isMicActive) return;

  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);

  const freq = autoCorrelate(buffer, audioCtx.sampleRate);

  if (freq !== -1 && freq > 50 && freq < 1000) {
    document.getElementById('detected-freq').textContent = `${freq.toFixed(2)} Hz`;
    
    // Nearest Note Detection
    let closest = currentStrings[0];
    let minDiff = Math.abs(freq - currentStrings[0].freq);

    currentStrings.forEach(str => {
      let diff = Math.abs(freq - str.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = str;
      }
    });

    document.getElementById('detected-note').textContent = closest.name.split(' ')[2].replace('(', '').replace(')', '');
    
    const feedback = document.getElementById('pitch-feedback');
    if (minDiff < 1.5) {
      feedback.textContent = `✅ PAS! ${closest.name}`;
      feedback.className = "pitch-feedback in-tune";
    } else if (freq < closest.freq) {
      feedback.textContent = `⬆️ Terlalu Rendah (Kencangkan Senar)`;
      feedback.className = "pitch-feedback";
    } else {
      feedback.textContent = `⬇️ Terlalu Tinggi (Kendurkan Senar)`;
      feedback.className = "pitch-feedback";
    }
  }

  requestAnimationFrame(detectPitch);
}

// Auto-correlation Algorithm for Pitch Detection
function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    let val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // Sinyal terlalu lemah

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  return sampleRate / T0;
}

// --- CAPO CALCULATOR LOGIC ---
const chromaticScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function calculateCapo() {
  const chordInput = document.getElementById('capo-chord').value;
  const fretVal = parseInt(document.getElementById('capo-fret').value);
  
  let baseNote = chordInput.replace('m', '');
  let isMinor = chordInput.includes('m');

  let startIndex = chromaticScale.indexOf(baseNote);
  if (startIndex !== -1) {
    let targetIndex = (startIndex + fretVal) % 12;
    let resultChord = chromaticScale[targetIndex] + (isMinor ? 'm' : '');
    
    document.getElementById('capo-result').innerHTML = 
      `Jika Anda menekan bentuk <strong>${chordInput}</strong> di Capo Fret <strong>${fretVal}</strong>, nada asli yang terdengar adalah <strong>Kunci ${resultChord}</strong>!`;
  }
}

// --- METRONOME LOGIC ---
let metronomeInterval = null;
let bpm = 120;
let isMetronomeRunning = false;

function updateBPM(val) {
  bpm = val;
  document.getElementById('bpm-display').textContent = `${bpm} BPM`;
  if (isMetronomeRunning) {
    stopMetronome();
    startMetronome();
  }
}

function playClick() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function startMetronome() {
  const intervalMs = (60 / bpm) * 1000;
  playClick();
  metronomeInterval = setInterval(playClick, intervalMs);
  isMetronomeRunning = true;
  const btn = document.getElementById('metronome-toggle-btn');
  btn.textContent = 'Stop Metronome';
  btn.classList.add('running');
}

function stopMetronome() {
  clearInterval(metronomeInterval);
  isMetronomeRunning = false;
  const btn = document.getElementById('metronome-toggle-btn');
  btn.textContent = 'Start Metronome';
  btn.classList.remove('running');
}

function toggleMetronome() {
  if (isMetronomeRunning) stopMetronome();
  else startMetronome();
}

// --- FAVORITE & SEARCH LOGIC ---
let filterFavOnly = false;

function toggleFavorite(starElem) {
  starElem.classList.toggle('is-fav');
  filterChords();
}

function toggleFavFilter(btnElem) {
  filterFavOnly = !filterFavOnly;
  btnElem.classList.toggle('active', filterFavOnly);
  filterChords();
}

function filterChords() {
  const input = document.getElementById('chord-search').value.toLowerCase();
  const chordItems = document.querySelectorAll('.chord-item');

  chordItems.forEach(item => {
    const searchData = item.getAttribute('data-name');
    const isFav = item.querySelector('.star-icon').classList.contains('is-fav');

    const matchesSearch = searchData.includes(input);
    const matchesFav = !filterFavOnly || isFav;

    if (matchesSearch && matchesFav) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Initial Load Render
window.onload = function() {
  renderTunerGrid();
};