/* ============================================================
   tasks.js — to-do list + Eisenhower matrix
   ============================================================ */
const Tasks = (() => {
  let tasks = Store.getTasks();
  let activeQuadrant = 'do';
  let currentTaskView = 'matrix';

  const QUADRANTS = ['do', 'schedule', 'delegate', 'delete'];
  const QUAD_LABEL = { do: 'Do First', schedule: 'Schedule', delegate: 'Delegate', delete: 'Eliminate' };

  const checkIcon = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function persist(){ Store.setTasks(tasks); if (window.App) App.refreshDashboard(); }

  function add(text, quadrant){
    const t = { id: Store.uid(), text: text.trim(), quadrant, done: false, createdAt: Date.now() };
    tasks.unshift(t);
    persist();
    render();
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
      toggleDone(t.id);
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
    return li;
  }

  function render(){
    // Matrix view
    QUADRANTS.forEach(q => {
      const list = document.querySelector(`.quad-list[data-dropzone="${q}"]`);
      if (!list) return;
      list.innerHTML = '';
      const items = tasks.filter(t => t.quadrant === q);
      if (items.length === 0){
        const p = document.createElement('p');
        p.className = 'quad-empty';
        p.textContent = 'Empty — drag a task here';
        list.appendChild(p);
      } else {
        items.forEach(t => list.appendChild(buildCard(t)));
      }
    });

    // List view
    const listView = document.getElementById('listView');
    if (listView){
      listView.innerHTML = '';
      const sorted = [...tasks].sort((a,b) => a.done - b.done || b.createdAt - a.createdAt);
      sorted.forEach(t => listView.appendChild(buildListCard(t)));
    }

    document.getElementById('tasksEmptyNote').hidden = tasks.length > 0;
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
    document.getElementById('listView').hidden = true;
    render();
  }

  return { init, counts, get all(){ return tasks; } };
})();
