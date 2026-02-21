/**
 * Bunker Workout Tracker — app.js
 * Reads data/treinos.json and renders the UI
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// On Vercel: reads the file from the same repo. No external API needed.
const DATA_URL = './data/treinos.json';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const loading = $('loading');
const emptyState = $('empty-state');
const statsGrid = $('stats-grid');
const latestSection = $('latest-section');
const historySection = $('history-section');
const headerStats = $('header-stats');

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
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
      <div class="exercise-item" onclick="toggleExercise(this)" style="animation-delay:${i * 0.06}s">
        <div class="exercise-header">
          <div>
            <div class="exercise-name">${ex.exercise}</div>
            <div class="exercise-detail">${repsStr}${rest}${cal}</div>
          </div>
          <span class="exercise-chevron">▼</span>
        </div>
        ${instruction ? `<div class="exercise-instruction">${instruction}</div>` : ''}
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

// ─── RENDER WORKOUT CARD ──────────────────────────────────────────────────────
function renderWorkoutCard(w, compact = false) {
    const workout = w.workout || w;
    const title = workout.title || 'Treino';
    const goal = w.goal || workout.goal || '';
    const dur = w.duration || workout.duration || '';
    const cal = workout.estimated_calories || '';
    const level = w.level || workout.level || '';
    const date = fmtDate(w.saved_at);
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

    return `
    <div class="workout-card">
      <div class="workout-card-header">
        <div>
          <div class="workout-title">${title}</div>
          <div class="workout-meta">${pills}</div>
        </div>
        <div class="workout-date">${date}</div>
      </div>
      ${overview ? `<div class="workout-overview">${overview}</div>` : ''}
      ${renderExercises(warmup, '🔥 Aquecimento')}
      ${renderExercises(main, '💪 Treino Principal')}
      ${renderExercises(finisher, '⚡ Finisher')}
    </div>`;
}

// ─── RENDER HISTORY ITEM ──────────────────────────────────────────────────────
function renderHistoryItem(w, index) {
    const workout = w.workout || w;
    const title = workout.title || 'Treino';
    const goal = w.goal || workout.goal || '';
    const dur = w.duration || workout.duration || '';
    const cal = workout.estimated_calories || '';
    const date = fmtDate(w.saved_at);

    return `
    <div class="history-item" style="animation-delay:${index * 0.06}s">
      <div>
        <div class="history-title">${title}</div>
        <div class="history-date">${date} · ${goal} · ${dur} min</div>
      </div>
      <div class="history-right">
        ${cal ? `<div class="history-cal">${cal} kcal</div>` : ''}
        <span class="pill pill-goal" style="margin: 0;">${goal || '—'}</span>
      </div>
    </div>`;
}

// ─── MAIN INIT ────────────────────────────────────────────────────────────────
async function init() {
    try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const workouts = (data.workouts || []).slice().reverse(); // newest first

        loading.style.display = 'none';

        if (!workouts.length) {
            emptyState.style.display = 'block';
            return;
        }

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

        // ── Latest ──
        $('latest-workout').innerHTML = renderWorkoutCard(workouts[0]);

        // ── History (skip latest) ──
        if (workouts.length > 1) {
            $('history-list').innerHTML = workouts.slice(1).map(renderHistoryItem).join('');
        }

    } catch (err) {
        loading.innerHTML = `
      <div class="empty-icon">⚠️</div>
      <p style="color: #6b7280">Erro ao carregar treinos.<br><small>${err.message}</small></p>`;
    }
}

// ─── EXPOSE toggle to inline onclick ─────────────────────────────────────────
window.toggleExercise = toggleExercise;

init();
