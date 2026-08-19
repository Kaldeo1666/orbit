/* ============================================================
   store.js — tiny persistence layer (localStorage)
   ============================================================ */
const Store = (() => {
  const TASKS_KEY = 'orbit.tasks.v1';
  const HABITS_KEY = 'orbit.habits.v1';

  function read(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      console.error('Orbit: failed to read', key, e);
      return fallback;
    }
  }
  function write(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch(e){
      console.error('Orbit: failed to write', key, e);
    }
  }

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr(d = new Date()){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  // local-time-safe date arithmetic — avoids UTC drift from toISOString()
  function addDays(dateStr, n){
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return todayStr(d);
  }

  return {
    uid, todayStr, addDays,
    getTasks: () => read(TASKS_KEY, []),
    setTasks: (t) => write(TASKS_KEY, t),
    getHabits: () => read(HABITS_KEY, []),
    setHabits: (h) => write(HABITS_KEY, h),
  };
})();
