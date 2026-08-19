/* ============================================================
   app.js — navigation, dashboard stats, toast, boot sequence
   ============================================================ */
const App = (() => {
  let toastTimer = null;

  function setupNav(){
    const tabs = document.querySelectorAll('.rail-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected','true');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
        const target = document.getElementById('view-' + tab.dataset.view);
        target.classList.remove('is-active');
        void target.offsetWidth; // restart animation
        target.classList.add('is-active');

        if (tab.dataset.view === 'dashboard') refreshDashboard();
      });
    });
  }

  function setGreetingAndDate(){
    const hour = new Date().getHours();
    const name = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    document.getElementById('greeting').textContent = name;
    document.getElementById('railDate').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });

    const quotes = [
      'Small orbits, sustained.',
      'Consistency compounds.',
      'Momentum over motivation.',
      'Do the next right thing.',
      'Progress, not perfection.',
    ];
    document.getElementById('railQuote').textContent = quotes[new Date().getDate() % quotes.length];
  }

  function countUp(el, to, suffix = ''){
    const from = parseInt(el.textContent) || 0;
    if (from === to) { el.textContent = to; return; }
    const duration = 500;
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (to - from) * eased);
      el.textContent = val;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function refreshDashboard(){
    const habits = Habits.all;
    const tasks = Tasks.all;
    const today = Store.todayStr();

    const c = Tasks.counts();
    countUp(document.getElementById('statUrgentImportant'), c.do);

    const doneToday = habits.filter(h => h.log[today]).length;
    countUp(document.getElementById('statHabitsDone'), doneToday);
    document.getElementById('statHabitsTotal').textContent = habits.length;

    const best = habits.reduce((m,h) => Math.max(m, Habits.bestStreak(h)), 0);
    countUp(document.getElementById('statBestStreak'), best);

    let weekRate = 0;
    if (habits.length){
      const rates = habits.map(h => Habits.rateOverDays(h, 7));
      weekRate = Math.round(rates.reduce((a,b)=>a+b,0) / rates.length);
    }
    countUp(document.getElementById('statWeekRate'), weekRate);

    Charts.renderAll();
  }

  function toast(msg){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  function init(){
    setGreetingAndDate();
    setupNav();
    Tasks.init();
    Habits.init();
    refreshDashboard();
  }

  return { init, refreshDashboard, toast };
})();

document.addEventListener('DOMContentLoaded', App.init);
