/**
 * Bunker Workout Tracker — app.js
 * Reads data/treinos.json and data/wearable.json and renders the UI
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DATA_URL = './data/treinos.json';
const WEARABLE_URL = './data/wearable.json';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const loading = $('loading');
const emptyState = $('empty-state');
const statsGrid = $('stats-grid');
const wearableSection = $('wearable-section');
const wearableGrid = $('wearable-grid');
const wearableSyncTime = $('wearable-sync-time');
const latestSection = $('latest-section');
const historySection = $('history-section');
const headerStats = $('header-stats');

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDayCell(iso) {
  if (!iso) return 'Treino sem data';
  const d = new Date(iso);
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemana = dias[d.getDay()];
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${diaSemana} - ${data}`;
}

function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const dates = workouts
    .map(w => new Date(w.saved_at).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(d => new Date(d))
    .sort((a, b) => b - a);

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = (dates[i] - dates[i + 1]) / 86400000;
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}

function animateCounter(el, target, duration = 800) {
  const start = performance.now();
  const from = 0;
  function update(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── RENDER EXERCISE BLOCK ────────────────────────────────────────────────────
function renderExercises(exercises, label) {
  if (!exercises || !exercises.length) return '';

  const items = exercises.map((ex, i) => {
    const repsStr = ex.sets && ex.reps
      ? `${ex.sets} × ${ex.reps}`
      : ex.duration ? ex.duration : '';
    const rest = ex.rest ? ` · Descanso ${ex.rest}` : '';
    const cal = ex.calories_per_set ? ` · ~${ex.calories_per_set} kcal/série` : '';
    const instruction = ex.instruction || '';

    return `
      <div class="exercise-item" style="animation-delay:${i * 0.06}s">
        <div class="exercise-header">
          <div class="exercise-info">
            <div class="exercise-name">${ex.exercise}</div>
            <div class="exercise-detail">${repsStr}${rest}${cal}</div>
          </div>
          <button class="exercise-play-btn" onclick="openVideoModal('${encodeURIComponent(ex.exercise)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        </div>
        ${instruction ? `<div class="exercise-body"><div class="exercise-instruction">${instruction}</div></div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="exercises-section">
      <div class="exercises-title">${label}</div>
      ${items}
    </div>`;
}

function toggleExercise(el) {
  el.classList.toggle('expanded');
}

// ─── RENDER WORKOUT CARD (CÉLULA) ───────────────────────────────────────────
function renderWorkoutCell(w, index, isLatest = false) {
  const workout = w.workout || w;
  const title = workout.title || 'Treino';
  const goal = w.goal || workout.goal || '';
  const dur = w.duration || workout.duration || '';
  const cal = workout.estimated_calories || '';
  const level = w.level || workout.level || '';
  const cellDate = formatDayCell(w.saved_at);
  const overview = workout.overview || '';

  const main = workout.main_block || [];
  const warmup = workout.warmup || [];
  const finisher = workout.finisher || [];

  const pills = [
    goal ? `<span class="pill pill-goal">${goal}</span>` : '',
    dur ? `<span class="pill pill-dur">${dur} min</span>` : '',
    cal ? `<span class="pill pill-cal">${cal} kcal</span>` : '',
    level ? `<span class="pill pill-level">${level}</span>` : '',
  ].filter(Boolean).join('');

  // Se for o último treino (mais recente), ele já vem expandido por padrão
  const expandedClass = isLatest ? 'expanded' : '';

  return `
    <div class="workout-cell ${expandedClass}" style="animation-delay:${index * 0.05}s">
      <div class="workout-cell-header" onclick="toggleWorkout(this.parentElement)">
        <div class="cell-info">
          <div class="cell-date">📅 ${cellDate}</div>
          <div class="cell-title">${title}</div>
          <div class="cell-pills">${pills}</div>
        </div>
        <div class="cell-action">
          <span class="workout-chevron">▼</span>
        </div>
      </div>
      <div class="workout-cell-content">
        ${overview ? `<div class="workout-overview">${overview}</div>` : ''}
        ${renderExercises(warmup, '🔥 Aquecimento')}
        ${renderExercises(main, '💪 Treino Principal')}
        ${renderExercises(finisher, '⚡ Finisher')}
      </div>
    </div>`;
}

function toggleWorkout(el) {
  el.classList.toggle('expanded');
}

// ─── RENDER HISTORY LIST ────────────────────────────────────────────────────
function renderHistoryList(workouts) {
  if (!workouts || workouts.length === 0) return '';
  return workouts.map((w, i) => renderWorkoutCell(w, i, false)).join('');
}

// ─── WEARABLE LOGIC (Supabase Real-Time) ──────────
const SUPABASE_URL = 'https://cweogtaoetfbttzrmfsk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WlcKbl-tR-SF7rjZqBFtMQ_wkmQT2eM';

function renderWearableData(wearable) {
  if (!wearable) {
    wearableGrid.innerHTML = `
      <div class="wearable-no-data" style="padding: 24px; text-align: center;">
        <p style="margin-bottom: 12px; font-weight: 500;">Banco de Dados Vazio.</p>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          O seu Bunker local ainda não enviou nenhum dado de pulso para este novo Supabase.<br>
          Gere uma sincronização no app local primeiro.
        </p>
        <button class="pill pill-goal" onclick="forceSyncWearable()" style="cursor: pointer; padding: 10px 20px; font-size: 13px;">
          🔄 Tentar Novamente
        </button>
      </div>`;
    wearableSection.style.display = 'block';

    // Mostra o botão flutuante se houver
    const btnNav = document.getElementById('btn-sync-smartwatch');
    if (btnNav) btnNav.style.display = 'block';

    return;
  }

  const w = wearable;
  wearableSyncTime.innerHTML = `
    Sincronizado hoje, ${formatTime(w.synced_at)}
    <button class="pill pill-goal" onclick="forceSyncWearable()" style="margin-left: 10px; cursor: pointer; background: transparent; padding: 4px 8px;">🔄 Atualizar</button>
  `;

  const s = w.steps || {};
  const hr = w.heart_rate || {};
  const cal = w.calories || {};
  const slp = w.sleep?.lastNight || {};
  const weight = w.weight || {};

  const cards = [
    {
      id: 'w-steps', icon: '👣', label: 'Passos Hoje', val: s.today || 0, unit: '/ ' + (s.goal || 10000),
      pct: s.progress || 0
    },
    {
      id: 'w-cal', icon: '🔥', label: 'Kcal Queimadas', val: cal.burned || 0, unit: 'kcal',
      pct: cal.progress || 0
    },
    {
      id: 'w-hr', icon: '❤️', label: 'BPM Atual(méd)', val: hr.current || 0, unit: 'bpm',
      pct: hr.current ? Math.min((hr.current / 180) * 100, 100) : 0
    },
    {
      id: 'w-sleep', icon: '😴', label: 'Sono Anter.', val: slp.total_hours || 0, unit: 'h',
      pct: slp.score || 0
    },
    {
      id: 'w-weight', icon: '⚖️', label: 'Peso Atual', val: weight.current || 0, unit: 'kg',
      pct: 0 // sem progress bar para peso
    },
    {
      id: 'w-vo2', icon: '🫁', label: 'VO2 Max', val: w.vo2max?.current || 0, unit: '',
      pct: w.vo2max?.current ? Math.min((w.vo2max.current / 60) * 100, 100) : 0
    }
  ];

  wearableGrid.innerHTML = cards.map((c, i) => `
    <div class="wearable-card" style="animation-delay:${i * 0.05}s">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span class="wearable-label">${c.label}</span>
        <span class="wearable-icon">${c.icon}</span>
      </div>
      <div>
        <span class="wearable-value">${c.val}</span>
        <span class="wearable-unit">${c.unit}</span>
      </div>
      ${c.pct > 0 ? `
      <div class="wearable-bar-wrap">
        <div class="wearable-bar" style="width: ${c.pct}%"></div>
      </div>
      ` : '<div style="height:8px"></div>'}
    </div>
  `).join('');

  wearableSection.style.display = 'block';
  wearableSection.style.display = 'block';
}

async function forceSyncWearable() {
  wearableSyncTime.innerHTML = `<span style="color:var(--accent)">⏳ Consultando Supabase Live...</span>`;

  try {
    const query = `${SUPABASE_URL}/rest/v1/wearable_sync?select=*&order=synced_at.desc&limit=1`;
    const res = await fetch(query, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        renderWearableData(data[0]);
      } else {
        renderWearableData(null);
      }
    } else {
      throw new Error(`Falha HTTP Supabase: ${res.status}`);
    }
  } catch (e) {
    alert('Erro ao buscar wearable do Supabase: ' + e);
    wearableSyncTime.innerHTML = `Falha na sincronização`;
  }
}

// ─── MAIN INIT ────────────────────────────────────────────────────────────────
async function init() {
  try {
    const [resTreinos, resWearable] = await Promise.allSettled([
      fetch(`${DATA_URL}?t=${Date.now()}`),
      fetch(`${SUPABASE_URL}/rest/v1/wearable_sync?select=*&order=synced_at.desc&limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
    ]);

    // Handle treinos
    if (resTreinos.status === 'fulfilled' && resTreinos.value.ok) {
      const data = await resTreinos.value.json();
      const workouts = (data.workouts || []).slice().reverse(); // newest first

      loading.style.display = 'none';

      if (!workouts.length) {
        emptyState.style.display = 'block';
      } else {
        // ── Stats ──
        const totalCal = workouts.reduce((s, w) => s + ((w.workout || w).estimated_calories || 0), 0);
        const totalDur = workouts.reduce((s, w) => s + (w.duration || (w.workout || w).duration || 0), 0);
        const streak = calcStreak(workouts.filter(w => w.saved_at));

        statsGrid.style.display = 'grid';
        latestSection.style.display = 'block';
        historySection.style.display = workouts.length > 1 ? 'block' : 'none';

        animateCounter($('val-total'), workouts.length);
        animateCounter($('val-streak'), streak);
        animateCounter($('val-calories'), totalCal);
        animateCounter($('val-duration'), totalDur);

        // Header badge
        headerStats.innerHTML = `
              <span class="header-badge">🔥 ${streak} dias</span>
              <span class="header-badge">📋 ${workouts.length} treinos</span>`;

        // ── Render Cells (1st is expanded) ──
        $('latest-workout').innerHTML = renderWorkoutCell(workouts[0], 0, true);

        // ── Rest of History Cells ──
        if (workouts.length > 1) {
          $('history-list').innerHTML = renderHistoryList(workouts.slice(1));
        }
      }
    } else {
      throw new Error("Erro de rede nas APIs");
    }

    // Handle wearable Supabase
    if (resWearable.status === 'fulfilled' && resWearable.value.ok) {
      const wearData = await resWearable.value.json();
      if (wearData && wearData.length > 0) {
        renderWearableData(wearData[0]);
      } else {
        renderWearableData(null);
      }
    } else {
      renderWearableData(null);
    }

  } catch (err) {
    loading.innerHTML = `
      <div class="empty-icon">⚠️</div>
      <p style="color: #6b7280">Erro ao carregar treinos.<br><small>${err.message}</small></p>`;
  }
}

// ─── VIDEO MODAL LOGIC ────────────────────────────────────────────────────────
const modal = document.getElementById('video-modal');
const modalTitle = document.getElementById('modal-title');
const iframe = document.getElementById('video-iframe');
const loader = document.getElementById('video-loader');
const closeBtn = document.getElementById('modal-close-btn');
const extLink = document.getElementById('video-external-link');
const durationEl = document.getElementById('video-duration');

async function openVideoModal(exerciseNameEnc) {
  const exerciseName = decodeURIComponent(exerciseNameEnc);
  modalTitle.textContent = exerciseName;
  iframe.src = '';
  iframe.style.display = 'none';
  loader.style.display = 'flex';
  loader.textContent = 'Carregando vídeo...';
  extLink.href = '#';
  durationEl.textContent = '--:--';
  modal.classList.add('active');

  try {
    const response = await fetch(`/api/youtube?query=${exerciseNameEnc}`);
    if (!response.ok) throw new Error('Falha ao buscar vídeo');

    const data = await response.json();
    if (data.id) {
      iframe.src = `https://www.youtube.com/embed/${data.id}?autoplay=1`;
      iframe.style.display = 'block';
      extLink.href = `https://www.youtube.com/watch?v=${data.id}`;
      durationEl.textContent = data.duration ? `Duração: ${data.duration}` : '';
      loader.style.display = 'none';
    } else {
      throw new Error('Vídeo não encontrado');
    }
  } catch (error) {
    console.error(error);
    loader.textContent = 'Vídeo não encontrado.';
    extLink.href = `https://www.youtube.com/results?search_query=${exerciseNameEnc}+execução+correta+academia`;
    extLink.textContent = 'Pesquisar no YouTube';
  }
}

closeBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  iframe.src = ''; // stop video playback
});

// Close modal when clicking on background overlay
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
    iframe.src = '';
  }
});

// ─── EXPOSE globals to inline onclick ────────────────────────────────────────
window.openVideoModal = openVideoModal;
window.toggleWorkout = toggleWorkout;
window.connectWearable = connectWearable;
window.forceSyncWearable = forceSyncWearable;

init();
