/* ============================================================
   calendar.js — rolling 7-day week view, wired into Tasks
   The week renews every 7 days from an "anchor" date (the day
   Calendar was first opened) rather than a fixed Mon–Sun grid —
   e.g. if you first open it on a Saturday, weeks run Sat→Fri and
   flip over to the next Sat→Fri block once Friday passes.
   ============================================================ */
const Calendar = (() => {
  let weekOffset = 0; // 0 = current cycle; browsed via prev/next

  const checkIcon = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const TAGS = [
    { q: 'do', label: 'Do First' },
    { q: 'schedule', label: 'Schedule' },
    { q: 'delegate', label: 'Delegate' },
    { q: 'delete', label: 'Eliminate' },
  ];

  function ensureAnchor(){
    let anchor = Store.getCalAnchor();
    if (!anchor){ anchor = Store.todayStr(); Store.setCalAnchor(anchor); }
    return anchor;
  }

  function currentCycleStart(){
    const anchor = ensureAnchor();
    const today = Store.todayStr();
    const diff = Store.daysBetween(anchor, today);
    const cyclesElapsed = Math.floor(diff / 7);
    return Store.addDays(anchor, cyclesElapsed * 7);
  }

  function displayedWeekStart(){
    return Store.addDays(currentCycleStart(), weekOffset * 7);
  }

  function fmtRange(weekStart){
    const end = Store.addDays(weekStart, 6);
    const s = new Date(weekStart + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
  }

  function buildTaskCard(t){
    const li = document.createElement('li');
    li.className = 'task-card cal-task-card';
    li.draggable = true;
    li.dataset.id = t.id;

    const tagInfo = TAGS.find(x => x.q === t.quadrant) || TAGS[0];

    li.innerHTML = `
      <span class="task-check">${checkIcon}</span>
      <div class="cal-task-main">
        <span class="task-text cal-task-text"></span>
        <span class="cal-task-tag cal-tag-${t.quadrant}"></span>
      </div>
      <button class="task-del" aria-label="Delete task">×</button>
    `;
    li.querySelector('.cal-task-text').textContent = t.text;
    li.querySelector('.cal-task-tag').textContent = tagInfo.label;

    li.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.add('is-removing');
      setTimeout(() => Tasks.toggleDone(t.id), 240);
    });
    li.querySelector('.task-del').addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.add('is-removing');
      setTimeout(() => Tasks.remove(t.id), 240);
    });

    li.addEventListener('dragstart', (e) => {
      li.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', t.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));

    return li;
  }

  function reorderWithinDate(date, draggedId, beforeId){
    const ids = Tasks.forDate(date).map(t => t.id);
    const from = ids.indexOf(draggedId);
    if (from === -1) return;
    ids.splice(from, 1);
    let insertAt = beforeId ? ids.indexOf(beforeId) : -1;
    if (insertAt === -1) insertAt = ids.length;
    ids.splice(insertAt, 0, draggedId);
    Tasks.reorderDate(date, ids);
  }

  function buildDayColumn(date){
    const col = document.createElement('div');
    const isToday = date === Store.todayStr();
    col.className = 'cal-day' + (isToday ? ' is-today' : '');

    const d = new Date(date + 'T00:00:00');
    const head = document.createElement('div');
    head.className = 'cal-day-head';
    head.innerHTML = `
      <span class="cal-day-name">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      <span class="cal-day-num">${d.getDate()}</span>
    `;
    col.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'cal-day-list';
    list.dataset.date = date;
    const items = Tasks.forDate(date);
    if (items.length === 0){
      const p = document.createElement('p');
      p.className = 'cal-day-empty';
      p.textContent = 'Nothing planned';
      list.appendChild(p);
    } else {
      items.forEach(t => list.appendChild(buildTaskCard(t)));
    }
    col.appendChild(list);

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.classList.add('is-dragover');
    });
    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) list.classList.remove('is-dragover');
    });
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('is-dragover');
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      const targetCard = e.target.closest('.cal-task-card');
      const beforeId = targetCard ? targetCard.dataset.id : null;
      const dropDate = list.dataset.date;
      const sourceTask = Tasks.all.find(t => t.id === id);
      if (sourceTask && sourceTask.date !== dropDate){
        // dropped a task from a different day onto this one — move it here
        sourceTask.date = dropDate;
        Store.setTasks(Tasks.all);
      }
      reorderWithinDate(dropDate, id, beforeId === id ? null : beforeId);
      render();
    });

    // quick-add composer for this day
    const form = document.createElement('form');
    form.className = 'cal-quickadd';
    form.dataset.quadrant = 'do';
    form.innerHTML = `
      <input type="text" class="cal-quickadd-input" placeholder="Add for this day…" maxlength="140" autocomplete="off">
      <div class="cal-quickadd-tags">
        ${TAGS.map((t,i) => `<button type="button" class="cal-tag-pick cal-tag-${t.q}${i===0?' is-active':''}" data-q="${t.q}" title="${t.label}"></button>`).join('')}
      </div>
    `;
    form.querySelectorAll('.cal-tag-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        form.querySelectorAll('.cal-tag-pick').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        form.dataset.quadrant = btn.dataset.q;
      });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.cal-quickadd-input');
      const val = input.value.trim();
      if (!val) return;
      Tasks.addForDate(val, form.dataset.quadrant, date);
      if (window.App) App.toast('Added to ' + d.toLocaleDateString(undefined, { weekday: 'long' }));
    });
    col.appendChild(form);

    return col;
  }

  function render(){
    const rangeEl = document.getElementById('calRange');
    const gridEl = document.getElementById('calGrid');
    if (!gridEl) return;

    const weekStart = displayedWeekStart();
    rangeEl.textContent = fmtRange(weekStart);
    document.getElementById('calToday').classList.toggle('is-current', weekOffset === 0);

    gridEl.innerHTML = '';
    for (let i = 0; i < 7; i++){
      gridEl.appendChild(buildDayColumn(Store.addDays(weekStart, i)));
    }
  }

  function setupNav(){
    document.getElementById('calPrev').addEventListener('click', () => { weekOffset--; render(); });
    document.getElementById('calNext').addEventListener('click', () => { weekOffset++; render(); });
    document.getElementById('calToday').addEventListener('click', () => { weekOffset = 0; render(); });
  }

  function init(){
    ensureAnchor();
    setupNav();
    render();
  }

  return { init, render };
})();
