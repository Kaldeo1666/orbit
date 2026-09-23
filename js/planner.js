/* ============================================================
   planner.js — "plan my next 7 days": a freeform day-by-day
   schedule, fully independent of Tasks/Eisenhower. Each entry is
   just a title, an optional time (shown as a small tag), and a
   color — auto-assigned uniquely per day, or set by hand.
   ============================================================ */
const Planner = (() => {
  let items = Store.getPlanner();

  const PALETTE = [
    '#5EEAD4', '#F5A623', '#FB7185', '#A78BFA', '#7DD3FC',
    '#A3E635', '#FF8B6B', '#E879F9', '#818CF8', '#34D399',
  ];

  const checkIcon = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function persist(){ Store.setPlanner(items); }

  function nextColorFor(date){
    const used = items.filter(i => i.date === date).map(i => i.color);
    const free = PALETTE.find(c => !used.includes(c));
    if (free) return free;
    return PALETTE[used.length % PALETTE.length];
  }

  function add(date, time, text){
    const existing = items.filter(i => i.date === date);
    const maxOrder = existing.reduce((m,i) => Math.max(m, i.order||0), -1);
    const item = {
      id: Store.uid(), date, time: time || null, text: text.trim(),
      color: nextColorFor(date), done: false, order: maxOrder + 1, createdAt: Date.now(),
    };
    items.unshift(item);
    persist();
    render();
  }

  function forDate(date){
    return items.filter(i => i.date === date).sort((a,b) => (a.order||0) - (b.order||0));
  }

  function toggleDone(id){
    const i = items.find(x => x.id === id);
    if (!i) return;
    i.done = !i.done;
    persist();
    render();
  }

  function remove(id){
    items = items.filter(x => x.id !== id);
    persist();
    render();
  }

  function setColor(id, color){
    const i = items.find(x => x.id === id);
    if (!i) return;
    i.color = color;
    persist();
    render();
  }

  function reorderWithinDate(date, draggedId, beforeId){
    const ids = forDate(date).map(i => i.id);
    const from = ids.indexOf(draggedId);
    if (from === -1) return;
    ids.splice(from, 1);
    let insertAt = beforeId ? ids.indexOf(beforeId) : -1;
    if (insertAt === -1) insertAt = ids.length;
    ids.splice(insertAt, 0, draggedId);
    ids.forEach((id, idx) => {
      const i = items.find(x => x.id === id);
      if (i) i.order = idx;
    });
    persist();
  }

  function fmtTime(t){
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2,'0')} ${period}`;
  }

  function buildCard(item){
    const li = document.createElement('li');
    li.className = 'plan-card' + (item.done ? ' is-done' : '');
    li.draggable = true;
    li.dataset.id = item.id;
    li.style.setProperty('--c', item.color);

    const timeLabel = fmtTime(item.time);

    li.innerHTML = `
      <div class="plan-card-row">
        <span class="plan-check">${checkIcon}</span>
        <div class="plan-card-main">
          <span class="plan-text"></span>
          ${timeLabel ? `<span class="plan-time">${timeLabel}</span>` : ''}
        </div>
        <button type="button" class="plan-swatch" aria-label="Change color"></button>
        <button type="button" class="plan-del" aria-label="Delete">×</button>
      </div>
      <div class="plan-palette" hidden></div>
    `;
    li.querySelector('.plan-text').textContent = item.text;

    const palette = li.querySelector('.plan-palette');
    PALETTE.forEach(c => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'plan-palette-dot' + (c === item.color ? ' is-active' : '');
      dot.style.setProperty('--c', c);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setColor(item.id, c);
      });
      palette.appendChild(dot);
    });

    li.querySelector('.plan-swatch').addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !palette.hidden;
      document.querySelectorAll('.plan-palette').forEach(p => p.hidden = true);
      palette.hidden = isOpen;
    });

    li.querySelector('.plan-check').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDone(item.id);
    });
    li.querySelector('.plan-del').addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.add('is-removing');
      setTimeout(() => remove(item.id), 240);
    });

    li.addEventListener('dragstart', (e) => {
      li.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));

    return li;
  }

  function buildDayColumn(date){
    const col = document.createElement('div');
    const isToday = date === Store.todayStr();
    col.className = 'plan-day' + (isToday ? ' is-today' : '');

    const d = new Date(date + 'T00:00:00');
    const head = document.createElement('div');
    head.className = 'plan-day-head';
    head.innerHTML = `
      <span class="plan-day-name">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      <span class="plan-day-num">${d.getDate()}</span>
    `;
    col.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'plan-day-list';
    list.dataset.date = date;
    const dayItems = forDate(date);
    if (dayItems.length === 0){
      const p = document.createElement('p');
      p.className = 'plan-day-empty';
      p.textContent = 'Nothing planned';
      list.appendChild(p);
    } else {
      dayItems.forEach(i => list.appendChild(buildCard(i)));
    }
    col.appendChild(list);

    list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('is-dragover'); });
    list.addEventListener('dragleave', (e) => { if (!list.contains(e.relatedTarget)) list.classList.remove('is-dragover'); });
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('is-dragover');
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      const targetCard = e.target.closest('.plan-card');
      const beforeId = targetCard ? targetCard.dataset.id : null;
      const dropDate = list.dataset.date;
      const source = items.find(i => i.id === id);
      if (source && source.date !== dropDate) source.date = dropDate;
      reorderWithinDate(dropDate, id, beforeId === id ? null : beforeId);
      render();
    });

    const form = document.createElement('form');
    form.className = 'plan-quickadd';
    form.innerHTML = `
      <input type="text" class="plan-quickadd-input" placeholder="Plan something…" maxlength="140" autocomplete="off">
      <input type="time" class="plan-quickadd-time" aria-label="Time (optional)">
    `;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.plan-quickadd-input');
      const timeInput = form.querySelector('.plan-quickadd-time');
      const val = input.value.trim();
      if (!val) return;
      add(date, timeInput.value, val);
      if (window.App) App.toast('Added to ' + d.toLocaleDateString(undefined, { weekday: 'long' }));
    });
    col.appendChild(form);

    return col;
  }

  function render(){
    const grid = document.getElementById('planGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const today = Store.todayStr();
    for (let i = 0; i < 7; i++){
      grid.appendChild(buildDayColumn(Store.addDays(today, i)));
    }
  }

  function init(){
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.plan-swatch')) {
        document.querySelectorAll('.plan-palette').forEach(p => p.hidden = true);
      }
    });
    render();
  }

  return { init, render };
})();
