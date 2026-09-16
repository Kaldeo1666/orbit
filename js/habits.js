/* ============================================================
   habits.js — habit tracker: streaks, heatmap, drawer
   ============================================================ */
const Habits = (() => {
  let habits = Store.getHabits();
  let activeColor = 'teal';
  let openHabitId = null;

  const checkIcon = `<svg viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5L7 13L14.5 5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function persist(){ Store.setHabits(habits); if (window.App) App.refreshDashboard(); }

  const addDays = Store.addDays;

  function add(name, color){
    habits.unshift({ id: Store.uid(), name: name.trim(), color, createdAt: Date.now(), log: {} });
    persist();
    render();
  }

  function remove(id){
    habits = habits.filter(h => h.id !== id);
    persist();
    render();
    closeDrawer();
  }

  function toggleToday(id, animEl){
    const h = habits.find(x => x.id === id);
    if (!h) return;
    const today = Store.todayStr();
    const willBeDone = !h.log[today];
    if (willBeDone) h.log[today] = true; else delete h.log[today];
    persist();
    if (willBeDone && animEl){
      animEl.classList.add('is-bursting');
      setTimeout(() => animEl.classList.remove('is-bursting'), 500);
    }
    render();
    if (openHabitId === id) renderDrawer(id);
  }

  // ---- streak math ----
  function currentStreak(h){
    let streak = 0;
    let cursor = Store.todayStr();
    if (!h.log[cursor]) {
      cursor = addDays(cursor, -1);
    }
    while (h.log[cursor]){
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function bestStreak(h){
    const dates = Object.keys(h.log).sort();
    if (dates.length === 0) return 0;
    let best = 1, run = 1;
    for (let i = 1; i < dates.length; i++){
      if (addDays(dates[i-1], 1) === dates[i]) run++;
      else run = 1;
      best = Math.max(best, run);
    }
    return best;
  }

  function rateOverDays(h, days){
    let done = 0;
    let cursor = Store.todayStr();
    for (let i = 0; i < days; i++){
      if (h.log[cursor]) done++;
      cursor = addDays(cursor, -1);
    }
    return Math.round((done / days) * 100);
  }

  function last7(h){
    const arr = [];
    let cursor = Store.todayStr();
    for (let i = 0; i < 7; i++){
      arr.unshift(!!h.log[cursor]);
      cursor = addDays(cursor, -1);
    }
    return arr;
  }

  // ---- render list ----
  function buildRow(h){
    const row = document.createElement('div');
    const today = Store.todayStr();
    const doneToday = !!h.log[today];
    row.className = 'card habit-row' + (doneToday ? ' is-done-today' : '');
    row.style.setProperty('--c', colorVar(h.color));
    row.dataset.id = h.id;

    const streak = currentStreak(h);
    const spark = last7(h);

    row.innerHTML = `
      <span class="habit-check">${checkIcon}</span>
      <div class="habit-info">
        <p class="habit-name"></p>
        <p class="habit-meta">${streak > 0 ? streak + '-day streak' : 'no streak yet'}</p>
      </div>
      <div class="habit-spark">
        ${spark.map(v => `<span class="habit-spark-bar${v ? ' is-filled':''}" style="height:${v ? 28 : 10}px"></span>`).join('')}
      </div>
      <div class="habit-streak">
        <p class="habit-streak-num">${streak}</p>
        <p class="habit-streak-label">streak</p>
      </div>
    `;
    row.querySelector('.habit-name').textContent = h.name;

    const checkEl = row.querySelector('.habit-check');
    checkEl.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleToday(h.id, checkEl);
    });
    row.addEventListener('click', () => openDrawer(h.id));

    return row;
  }

  function colorVar(name){
    const map = { teal: '#5EEAD4', amber: '#F5A623', rose: '#FB7185', violet: '#A78BFA', sky: '#7DD3FC' };
    return map[name] || map.teal;
  }

  function render(){
    const list = document.getElementById('habitList');
    list.innerHTML = '';
    habits.forEach((h, i) => {
      const row = buildRow(h);
      row.style.animationDelay = (i * 0.04) + 's';
      list.appendChild(row);
    });
    document.getElementById('habitsEmptyNote').hidden = habits.length > 0;
  }

  // ---- drawer ----
  function openDrawer(id){
    openHabitId = id;
    renderDrawer(id);
    document.getElementById('habitDrawer').classList.add('is-open');
    document.getElementById('habitDrawer').setAttribute('aria-hidden', 'false');
    document.getElementById('drawerBackdrop').classList.add('is-open');
  }
  function closeDrawer(){
    openHabitId = null;
    document.getElementById('habitDrawer').classList.remove('is-open');
    document.getElementById('habitDrawer').setAttribute('aria-hidden', 'true');
    document.getElementById('drawerBackdrop').classList.remove('is-open');
  }

  function renderDrawer(id){
    const h = habits.find(x => x.id === id);
    if (!h) return;
    document.getElementById('drawerHabitName').textContent = h.name;
    document.getElementById('drawerStreak').textContent = currentStreak(h);
    document.getElementById('drawerBest').textContent = bestStreak(h);
    document.getElementById('drawerRate').textContent = rateOverDays(h, 90) + '%';

    // 14 full weeks (Sun→Sat), ending on the Saturday of the current week —
    // this makes the grid calendar-aligned so month/weekday labels line up.
    const today = Store.todayStr();
    const dow = new Date(today + 'T00:00:00').getDay(); // 0=Sun..6=Sat
    const rangeEnd = addDays(today, 6 - dow);
    const weeks = 14;
    const rangeStart = addDays(rangeEnd, -(weeks * 7 - 1));

    const heatmap = document.getElementById('heatmap');
    heatmap.innerHTML = '';
    let cursor = rangeStart;
    for (let i = 0; i < weeks * 7; i++){
      const dot = document.createElement('div');
      const isFuture = cursor > today;
      const done = !isFuture && !!h.log[cursor];
      dot.className = 'heat-dot' + (isFuture ? ' is-future' : done ? ' lvl-2' : ' lvl-1');
      if (!isFuture) dot.title = cursor + (done ? ' · done' : '');
      dot.style.background = done ? colorVar(h.color) : '';
      heatmap.appendChild(dot);
      cursor = addDays(cursor, 1);
    }

    // weekday labels (sparse — Mon/Wed/Fri only, GitHub-style)
    const weekdayEl = document.getElementById('heatmapWeekdays');
    weekdayEl.innerHTML = '';
    ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(label => {
      const span = document.createElement('span');
      span.textContent = label;
      weekdayEl.appendChild(span);
    });

    // month labels — one per week-column, only where the month changes
    const monthsEl = document.getElementById('heatmapMonths');
    monthsEl.innerHTML = '';
    let lastMonth = null;
    for (let w = 0; w < weeks; w++){
      const colDate = addDays(rangeStart, w * 7);
      const m = new Date(colDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' });
      const span = document.createElement('span');
      span.textContent = (m !== lastMonth) ? m : '';
      monthsEl.appendChild(span);
      lastMonth = m;
    }

    Charts.renderHabitTrend(h, colorVar(h.color));

    document.getElementById('drawerDelete').onclick = () => {
      if (confirm(`Delete "${h.name}"? This can't be undone.`)) remove(h.id);
    };
  }

  function setupComposer(){
    const form = document.getElementById('habitComposer');
    const input = document.getElementById('habitInput');
    const picker = document.getElementById('colorPicker');

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.cpick');
      if (!btn) return;
      picker.querySelectorAll('.cpick').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeColor = btn.dataset.color;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      add(val, activeColor);
      input.value = '';
      input.focus();
      if (window.App) App.toast('New habit: ' + val);
    });
  }

  function setupDrawer(){
    document.getElementById('drawerClose').addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  }

  function init(){
    setupComposer();
    setupDrawer();
    render();
  }

  return {
    init, render,
    get all(){ return habits; },
    currentStreak, bestStreak, rateOverDays, last7, colorVar,
  };
})();
