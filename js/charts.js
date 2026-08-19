/* ============================================================
   charts.js — Chart.js instances, themed for Orbit
   ============================================================ */
const Charts = (() => {
  let weeklyChart = null;
  let quadrantChart = null;
  let trendChart = null;

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = '#9AA1B4';

  function fmtDay(dateStr){
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  function renderWeekly(){
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    const habits = Habits.all;
    const days = [];
    let cursor = Store.todayStr();
    for (let i = 0; i < 7; i++){ days.unshift(cursor); cursor = Store.addDays(cursor, -1); }

    const counts = days.map(day => habits.filter(h => h.log[day]).length);
    const labels = days.map(fmtDay);

    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: 'rgba(94,234,212,0.55)',
          hoverBackgroundColor: '#5EEAD4',
          borderRadius: 8,
          maxBarThickness: 36,
        }]
      },
      options: {
        animation: { duration: 700, easing: 'easeOutQuint' },
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#131826', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
          titleColor: '#EDEFF5', bodyColor: '#9AA1B4', padding: 10, cornerRadius: 10,
          callbacks: { label: (ctx) => `${ctx.parsed.y} habit${ctx.parsed.y===1?'':'s'} completed` }
        }},
        scales: {
          x: { grid: { display: false }, border: { display:false } },
          y: { beginAtZero: true, ticks: { precision:0 }, grid: { color: 'rgba(255,255,255,0.06)' }, border: { display:false } }
        }
      }
    });
  }

  function renderQuadrant(){
    const ctx = document.getElementById('quadrantChart');
    if (!ctx) return;
    const c = Tasks.counts();
    const data = [c.do, c.schedule, c.delegate, c.delete];
    const hasAny = data.some(v => v > 0);

    if (quadrantChart) quadrantChart.destroy();
    quadrantChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Do First', 'Schedule', 'Delegate', 'Eliminate'],
        datasets: [{
          data: hasAny ? data : [1,1,1,1],
          backgroundColor: hasAny
            ? ['#FB7185', '#5EEAD4', '#F5A623', '#7A8199']
            : ['rgba(122,129,153,0.15)','rgba(122,129,153,0.15)','rgba(122,129,153,0.15)','rgba(122,129,153,0.15)'],
          borderColor: '#0A0E17',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        cutout: '68%',
        animation: { duration: 700, easing: 'easeOutQuint' },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth:8, boxHeight:8, usePointStyle:true, padding:14, font:{size:11.5} } },
          tooltip: {
            enabled: hasAny,
            backgroundColor: '#131826', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
            titleColor: '#EDEFF5', bodyColor: '#9AA1B4', padding: 10, cornerRadius: 10,
          }
        }
      }
    });
  }

  function renderHabitTrend(habit, color){
    const ctx = document.getElementById('habitTrendChart');
    if (!ctx) return;
    const today = Store.todayStr();
    // build 10 weekly buckets of completion rate (oldest to newest)
    const buckets = [];
    for (let w = 9; w >= 0; w--){
      let done = 0;
      for (let d = 0; d < 7; d++){
        const idx = w*7 + d;
        const ds = Store.addDays(today, -idx);
        if (habit.log[ds]) done++;
      }
      buckets.push(done);
    }

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: buckets.map((_,i) => `W${i+1}`),
        datasets: [{
          data: buckets,
          borderColor: color,
          backgroundColor: color + '33',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
        }]
      },
      options: {
        animation: { duration: 600, easing: 'easeOutQuint' },
        plugins: { legend: { display:false }, tooltip: {
          backgroundColor: '#131826', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
          titleColor: '#EDEFF5', bodyColor: '#9AA1B4', padding: 10, cornerRadius: 10,
          callbacks: { label: (ctx) => `${ctx.parsed.y}/7 days` }
        }},
        scales: {
          x: { grid: { display:false }, border:{ display:false }, ticks:{ font:{size:10} } },
          y: { min:0, max:7, ticks:{ stepSize:7, font:{size:10} }, grid:{ color:'rgba(255,255,255,0.06)' }, border:{ display:false } }
        }
      }
    });
  }

  function renderAll(){
    renderWeekly();
    renderQuadrant();
  }

  return { renderAll, renderHabitTrend };
})();
