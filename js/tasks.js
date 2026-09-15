/* ============================================================
   tasks.js — to-do list + Eisenhower matrix + completed archive
   Tasks can optionally carry a `date` (YYYY-MM-DD) and `order`
   field, which is how the Calendar view hooks into the same
   underlying list — a calendar task IS a task, just scheduled.
   ============================================================ */
const Tasks = (() => {
  let tasks = Store.getTasks();
  let activeQuadrant = 'do';
  let currentTaskView = 'matrix';

  const QUADRANTS = ['do', 'schedule', 'delegate', 'delete'];
  const QUAD_LABEL = { do: 'Do First', schedule: 'Schedule', delegate: 'Delegate', delete: 'Eliminate' };

  const checkIcon = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function persist(){
    Store.setTasks(tasks);
    if (window.App) App.refreshDashboard();
    if (window.Calendar) Calendar.render();
  }

  function add(text, quadrant){
    const t = { id: Store.uid(), text: text.trim(), quadrant, done: false, createdAt: Date.now(), date: null, order: 0 };
    tasks.unshift(t);
    persist();
    render();
  }

  function addForDate(text, quadrant, dateStr){
    const existing = tasks.filter(t => t.date === dateStr);
    const maxOrder = existing.reduce((m,t) => Math.max(m, t.order||0), -1);
    const t = { id: Store.uid(), text: text.trim(), quadrant, done: false, createdAt: Date.now(), date: dateStr, order: maxOrder + 1 };
    tasks.unshift(t);
    persist();
    render();
    return t;
  }

  function forDate(dateStr){
    return tasks.filter(t => t.date === dateStr && !t.done).sort((a,b) => (a.order||0) - (b.order||0));
  }

  function reorderDate(dateStr, orderedIds){
    orderedIds.forEach((id, i) => {
      const t = tasks.find(x => x.id === id);
      if (t) t.order = i;
    });
    persist();
  }

  function toggleDone(id){
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    persist();
    render();
  }

  function remove(id, cardEl){
    if (cardEl){
      cardEl.classList.add('is-removing');
      setTimeout(() => {
        tasks = tasks.filter(x => x.id !== id);
        persist();
        render();
      }, 260);
    } else {
      tasks = tasks.filter(x => x.id !== id);
      persist();
      render();
    }
  }

  function move(id, quadrant){
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.quadrant = quadrant;
    persist();
    render();
  }

  function counts(){
    const c = { do:0, schedule:0, delegate:0, delete:0 };
    tasks.forEach(t => { if (!t.done) c[t.quadrant] = (c[t.quadrant]||0) + 1; });
    return c;
  }

  function buildCard(t){
    const li = document.createElement('li');
    li.className = 'task-card' + (t.done ? ' is-done' : '');
    li.draggable = true;
    li.dataset.id = t.id;

    li.innerHTML = `
      <span class="task-check">${checkIcon}</span>
      <span class="task-text"></span>
      <button class="task-del" aria-label="Delete task">×</button>
    `;
    li.querySelector('.task-text').textContent = t.text;

    li.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!t.done){
        li.classList.add('is-removing');
        setTimeout(() => toggleDone(t.id), 240);
      } else {
        toggleDone(t.id);
      }
    });
    li.querySelector('.task-del').addEventListener('click', (e) => {
      e.stopPropagation();
      remove(t.id, li);
    });

    li.addEventListener('dragstart', (e) => {
      li.classList.add('is-dragging');
      e.dataTransfer.setData('text/plain', t.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));

    return li;
  }

  function buildListCard(t){
    const li = buildCard(t);
    const pill = document.createElement('span');
    pill.className = `task-pill task-pill-${t.quadrant}`;
    pill.textContent = QUAD_LABEL[t.quadrant];
    li.insertBefore(pill, li.querySelector('.task-del'));
    if (t.date){
      const d = document.createElement('span');
      d.className = 'task-date-badge';
      d.textContent = t.date.slice(5).replace('-', '/');
      li.insertBefore(d, li.querySelector('.task-del'));
    }
    return li;
  }

  function render(){
    const open = tasks.filter(t => !t.done);

    QUADRANTS.forEach(q => {
      const list = document.querySelector(`.quad-list[data-dropzone="${q}"]`);
      if (!list) return;
      list.innerHTML = '';
      const items = open.filter(t => t.quadrant === q);
      if (items.length === 0){
        const p = document.createElement('p');
        p.className = 'quad-empty';
        p.textContent = 'Empty — drag a task here';
        list.appendChild(p);
      } else {
        items.forEach(t => list.appendChild(buildCard(t)));
      }
    });

    const listView = document.getElementById('listView');
    if (listView){
      listView.innerHTML = '';
      const sorted = [...open].sort((a,b) => b.createdAt - a.createdAt);
      sorted.forEach(t => listView.appendChild(buildListCard(t)));
    }

    document.getElementById('tasksEmptyNote').hidden = tasks.length > 0;
    renderArchive();
  }

  function renderArchive(){
    const done = tasks.filter(t => t.done).sort((a,b) => b.createdAt - a.createdAt);
    const archive = document.getElementById('archive');
    const list = document.getElementById('archiveList');
    const count = document.getElementById('archiveCount');
    if (!archive || !list) return;

    count.textContent = done.length;
    list.innerHTML = '';

    if (done.length === 0){
      const p = document.createElement('p');
      p.className = 'archive-empty';
      p.textContent = 'Nothing completed yet — checked-off tasks land here.';
      list.appendChild(p);
      return;
    }

    done.forEach(t => {
      const li = document.createElement('li');
      li.className = 'archive-item';
      li.innerHTML = `
        <span class="archive-item-text"></span>
        <button class="archive-item-restore" type="button">Restore</button>
        <button class="archive-item-del" type="button" aria-label="Delete permanently">×</button>
      `;
      li.querySelector('.archive-item-text').textContent = t.text;
      li.querySelector('.archive-item-restore').addEventListener('click', () => toggleDone(t.id));
      li.querySelector('.archive-item-del').addEventListener('click', () => remove(t.id));
      list.appendChild(li);
    });
  }

  function setupArchive(){
    const archive = document.getElementById('archive');
    const toggle = document.getElementById('archiveToggle');
    const clearBtn = document.getElementById('archiveClear');

    toggle.addEventListener('click', () => {
      const isOpen = archive.dataset.open === 'true';
      archive.dataset.open = String(!isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const doneCount = tasks.filter(t => t.done).length;
      if (doneCount === 0) return;
      tasks = tasks.filter(t => !t.done);
      persist();
      render();
      if (window.App) App.toast('Cleared ' + doneCount + ' completed task' + (doneCount===1?'':'s'));
    });
    clearBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); clearBtn.click(); }
    });
  }

  function setupDragTargets(){
    document.querySelectorAll('.quad').forEach(quad => {
      quad.addEventListener('dragover', (e) => { e.preventDefault(); quad.classList.add('is-dragover'); });
      quad.addEventListener('dragleave', () => quad.classList.remove('is-dragover'));
      quad.addEventListener('drop', (e) => {
        e.preventDefault();
        quad.classList.remove('is-dragover');
        const id = e.dataTransfer.getData('text/plain');
        move(id, quad.dataset.quadrant);
      });
    });
  }

  function setupComposer(){
    const form = document.getElementById('taskComposer');
    const input = document.getElementById('taskInput');
    const picker = document.getElementById('quadrantPicker');

    picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.qpick');
      if (!btn) return;
      picker.querySelectorAll('.qpick').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeQuadrant = btn.dataset.q;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      add(val, activeQuadrant);
      input.value = '';
      input.focus();
      if (window.App) App.toast('Task added to ' + QUAD_LABEL[activeQuadrant]);
    });
  }

  function setupViewToggle(){
    const seg = document.querySelector('#view-tasks .seg');
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentTaskView = btn.dataset.taskview;
      document.getElementById('matrixView').hidden = currentTaskView !== 'matrix';
      document.getElementById('listView').hidden = currentTaskView !== 'list';
    });
  }

  function init(){
    setupComposer();
    setupDragTargets();
    setupViewToggle();
    setupArchive();
    document.getElementById('listView').hidden = true;
    render();
  }

  return {
    init, render, counts,
    add, addForDate, forDate, reorderDate, toggleDone, remove, move,
    quadLabel: QUAD_LABEL,
    get all(){ return tasks; },
  };
})();
