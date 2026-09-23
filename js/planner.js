/* ============================================================
   planner.js — Google-Calendar-style week planner. Events are
   positioned by start time and sized by duration, color-coded
   (auto-unique per day, or set by hand), draggable to reschedule,
   and laid out side-by-side when they overlap. Independent of
   Tasks/Eisenhower — this is its own freeform schedule.
   ============================================================ */
const Planner = (() => {
  let items = Store.getPlanner();
  let hasScrolled = false;
  let openAddFor = null; // date currently showing its add-form

  const ROW_PX = 48;          // px per hour
  const GUTTER_W = 46;        // px, hour-label column width
  const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

  const PALETTE = [
    '#5EEAD4', '#F5A623', '#FB7185', '#A78BFA', '#7DD3FC',
    '#A3E635', '#FF8B6B', '#E879F9', '#818CF8', '#34D399',
  ];

  const checkIcon = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function persist(){ Store.setPlanner(items); }

  function timeToMin(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
  function minToTime(min){
    min = Math.max(0, Math.min(24*60 - 1, Math.round(min/15)*15));
    const h = Math.floor(min/60), m = min%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function fmt12(min){
    let h = Math.floor(min/60), m = min%60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2,'0')} ${period}`;
  }

  function nextColorFor(date){
    const used = items.filter(i => i.date === date).map(i => i.color);
    const free = PALETTE.find(c => !used.includes(c));
    return free || PALETTE[used.length % PALETTE.length];
  }

  function add(date, time, duration, text){
    const item = {
      id: Store.uid(), date, time: time || null, duration: duration || 60,
      text: text.trim(), color: nextColorFor(date), done: false,
      order: items.filter(i => i.date === date && !i.time).length,
      createdAt: Date.now(),
    };
    items.unshift(item);
    persist();
    render();
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

  function reschedule(id, date, time){
    const i = items.find(x => x.id === id);
    if (!i) return;
    i.date = date;
    i.time = time;
    persist();
    render();
  }

  // ---- overlap layout: cluster overlapping events, assign columns ----
  function layoutDay(dayItems){
    const timed = dayItems.filter(i => i.time).map(i => ({
      item: i, start: timeToMin(i.time), end: timeToMin(i.time) + (i.duration||60),
    })).sort((a,b) => a.start - b.start);

    const results = [];
    let cluster = [];
    let clusterEnd = -1;

    function flushCluster(){
      if (!cluster.length) return;
      const colEnds = [];
      cluster.forEach(ev => {
        let col = colEnds.findIndex(end => end <= ev.start);
        if (col === -1){ col = colEnds.length; colEnds.push(ev.end); }
        else colEnds[col] = ev.end;
        ev.col = col;
      });
      const totalCols = colEnds.length;
      cluster.forEach(ev => results.push({ ...ev, totalCols }));
      cluster = [];
    }

    timed.forEach(ev => {
      if (cluster.length === 0 || ev.start < clusterEnd){
        cluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.end);
      } else {
        flushCluster();
        cluster.push(ev);
        clusterEnd = ev.end;
      }
    });
    flushCluster();

    return results;
  }

  function buildPalettePopover(item, onPick){
    const pop = document.createElement('div');
    pop.className = 'cal2-palette';
    PALETTE.forEach(c => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'cal2-palette-dot' + (c === item.color ? ' is-active' : '');
      dot.style.setProperty('--c', c);
      dot.addEventListener('click', (e) => { e.stopPropagation(); onPick(c); pop.remove(); });
      pop.appendChild(dot);
    });
    return pop;
  }

  function buildEventBlock(ev, date){
    const { item, start, end, col, totalCols } = ev;
    const el = document.createElement('div');
    el.className = 'cal2-event' + (item.done ? ' is-done' : '');
    el.style.setProperty('--c', item.color);
    el.dataset.id = item.id;

    const top = (start/60) * ROW_PX;
    const height = Math.max(((end-start)/60) * ROW_PX - 2, 18);
    const widthPct = 100/totalCols;
    el.style.top = top + 'px';
    el.style.height = height + 'px';
    el.style.left = `calc(${col*widthPct}% + 2px)`;
    el.style.width = `calc(${widthPct}% - 4px)`;

    const showTime = height >= 30;
    el.innerHTML = `
      <div class="cal2-event-inner">
        <span class="cal2-event-title"></span>
        ${showTime ? `<span class="cal2-event-time">${fmt12(start)} – ${fmt12(end)}</span>` : ''}
      </div>
      <button type="button" class="cal2-event-del" aria-label="Delete">×</button>
    `;
    el.querySelector('.cal2-event-title').textContent = item.text;
    el.title = `${item.text} · ${fmt12(start)}–${fmt12(end)}`;

    el.querySelector('.cal2-event-del').addEventListener('click', (e) => {
      e.stopPropagation();
      remove(item.id);
    });

    // plain click = toggle done; drag (movement past threshold) = reschedule.
    let downX=0, downY=0, dragging=false, startMin=start;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.cal2-event-del')) return;
      downX = e.clientX; downY = e.clientY; dragging = false;
      el.setPointerCapture(e.pointerId);
      const onMove = (me) => {
        const dx = me.clientX - downX, dy = me.clientY - downY;
        if (!dragging && Math.hypot(dx,dy) > 5) dragging = true;
        if (!dragging) return;
        el.classList.add('is-dragging');
        const newTop = top + dy;
        el.style.top = Math.max(0, newTop) + 'px';
        el.style.zIndex = 50;
        el.style.left = '0%'; el.style.width = '96%';
        const under = document.elementFromPoint(me.clientX, me.clientY);
        const col2 = under && under.closest('.cal2-day-col');
        el.dataset.targetDate = col2 ? col2.dataset.date : date;
      };
      const onUp = (ue) => {
        el.releasePointerCapture(e.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        if (dragging){
          const dy = ue.clientY - downY;
          const deltaMin = (dy/ROW_PX) * 60;
          const newStartMin = startMin + deltaMin;
          const targetDate = el.dataset.targetDate || date;
          reschedule(item.id, targetDate, minToTime(newStartMin));
        } else {
          toggleDone(item.id);
        }
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });

    return el;
  }

  function buildAllDayChip(item){
    const chip = document.createElement('div');
    chip.className = 'cal2-chip' + (item.done ? ' is-done' : '');
    chip.style.setProperty('--c', item.color);
    chip.innerHTML = `
      <span class="cal2-chip-check">${checkIcon}</span>
      <span class="cal2-chip-text"></span>
      <button type="button" class="cal2-chip-swatch" aria-label="Change color"></button>
      <button type="button" class="cal2-chip-del" aria-label="Delete">×</button>
    `;
    chip.querySelector('.cal2-chip-text').textContent = item.text;
    chip.querySelector('.cal2-chip-check').addEventListener('click', (e) => {
      e.stopPropagation(); toggleDone(item.id);
    });
    chip.querySelector('.cal2-chip-del').addEventListener('click', (e) => {
      e.stopPropagation(); remove(item.id);
    });
    chip.querySelector('.cal2-chip-swatch').addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.cal2-palette').forEach(p => p.remove());
      chip.appendChild(buildPalettePopover(item, (c) => setColor(item.id, c)));
    });
    return chip;
  }

  function buildAddForm(date){
    const form = document.createElement('form');
    form.className = 'cal2-addform';
    form.innerHTML = `
      <input type="text" class="cal2-add-text" placeholder="What are you planning?" maxlength="140" autocomplete="off">
      <div class="cal2-add-row">
        <input type="time" class="cal2-add-time" aria-label="Start time">
        <select class="cal2-add-duration" aria-label="Duration">
          ${DURATIONS.map(d => `<option value="${d}"${d===60?' selected':''}>${d < 60 ? d+' min' : (d/60)+' hr'}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="cal2-add-submit">Add</button>
    `;
    form.querySelector('.cal2-add-text').focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = form.querySelector('.cal2-add-text').value.trim();
      if (!text) return;
      const time = form.querySelector('.cal2-add-time').value;
      const duration = parseInt(form.querySelector('.cal2-add-duration').value, 10);
      add(date, time, duration, text);
      openAddFor = null;
    });
    return form;
  }

  function render(){
    const root = document.getElementById('planRoot');
    if (!root) return;
    root.innerHTML = '';

    const today = Store.todayStr();
    const dates = Array.from({length:7}, (_,i) => Store.addDays(today, i));

    const inner = document.createElement('div');
    inner.className = 'cal2-inner';

    // header row
    const header = document.createElement('div');
    header.className = 'cal2-header';
    header.appendChild(Object.assign(document.createElement('div'), { className: 'cal2-gutter-spacer' }));
    dates.forEach(date => {
      const d = new Date(date + 'T00:00:00');
      const isToday = date === today;
      const h = document.createElement('div');
      h.className = 'cal2-day-header' + (isToday ? ' is-today' : '');
      h.innerHTML = `
        <span class="cal2-day-name">${d.toLocaleDateString(undefined,{weekday:'short'})}</span>
        <span class="cal2-day-num">${d.getDate()}</span>
        <button type="button" class="cal2-add-btn" aria-label="Add to this day">+</button>
      `;
      h.querySelector('.cal2-add-btn').addEventListener('click', () => {
        openAddFor = (openAddFor === date) ? null : date;
        render();
      });
      header.appendChild(h);
    });
    inner.appendChild(header);

    // add-form row (only for the open day, but keep row structure aligned)
    if (openAddFor){
      const addRow = document.createElement('div');
      addRow.className = 'cal2-header';
      addRow.appendChild(Object.assign(document.createElement('div'), { className: 'cal2-gutter-spacer' }));
      dates.forEach(date => {
        const cell = document.createElement('div');
        cell.className = 'cal2-addform-cell';
        if (date === openAddFor) cell.appendChild(buildAddForm(date));
        addRow.appendChild(cell);
      });
      inner.appendChild(addRow);
    }

    // all-day strip
    const allday = document.createElement('div');
    allday.className = 'cal2-allday';
    allday.appendChild(Object.assign(document.createElement('div'), { className: 'cal2-gutter-spacer' }));
    dates.forEach(date => {
      const col = document.createElement('div');
      col.className = 'cal2-allday-col';
      const untimed = items.filter(i => i.date === date && !i.time).sort((a,b)=>(a.order||0)-(b.order||0));
      untimed.forEach(i => col.appendChild(buildAllDayChip(i)));
      allday.appendChild(col);
    });
    inner.appendChild(allday);

    // scrollable hour grid
    const scroll = document.createElement('div');
    scroll.className = 'cal2-scroll';
    const body = document.createElement('div');
    body.className = 'cal2-body';
    body.style.height = (24*ROW_PX) + 'px';

    const gutter = document.createElement('div');
    gutter.className = 'cal2-gutter';
    for (let h = 0; h < 24; h++){
      const lab = document.createElement('div');
      lab.className = 'cal2-hour-label';
      lab.style.top = (h*ROW_PX) + 'px';
      lab.textContent = fmt12(h*60);
      gutter.appendChild(lab);
    }
    body.appendChild(gutter);

    dates.forEach(date => {
      const col = document.createElement('div');
      col.className = 'cal2-day-col' + (date === today ? ' is-today' : '');
      col.dataset.date = date;
      col.style.backgroundSize = `100% ${ROW_PX}px`;

      const dayItems = items.filter(i => i.date === date);
      const laidOut = layoutDay(dayItems);
      laidOut.forEach(ev => col.appendChild(buildEventBlock(ev, date)));

      if (date === today){
        const now = new Date();
        const nowMin = now.getHours()*60 + now.getMinutes();
        const line = document.createElement('div');
        line.className = 'cal2-now-line';
        line.style.top = (nowMin/60*ROW_PX) + 'px';
        col.appendChild(line);
      }

      body.appendChild(col);
    });

    scroll.appendChild(body);
    inner.appendChild(scroll);
    root.appendChild(inner);

    if (!hasScrolled){
      const now = new Date();
      scroll.scrollTop = Math.max(0, (now.getHours()-2) * ROW_PX);
      hasScrolled = true;
    }
  }

  function init(){
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.cal2-chip-swatch')) {
        document.querySelectorAll('.cal2-palette').forEach(p => p.remove());
      }
    });
    render();
  }

  return { init, render };
})();
