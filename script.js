/* ============================================================
   ZenTask | script.js
   Full-featured task manager with localStorage persistence.
   ============================================================ */

const STORAGE_KEY = 'zentask_v1';

let tasks       = [];
let editingId   = null;
let activeFilter = 'all';

/* ── Data helpers ─────────────────────────────────────────── */
function load()  { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function save()  { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime() === today.getTime();
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

/* ── Filter helpers ───────────────────────────────────────── */
function getFiltered() {
  switch (activeFilter) {
    case 'today':
      return tasks.filter(t => isToday(t.due) && !t.done);
    case 'completed':
      return tasks.filter(t => t.done);
    default:
      if (activeFilter.startsWith('cat:'))
        return tasks.filter(t => t.category === activeFilter.slice(4));
      return tasks;
  }
}

/* ── Add / Edit / Delete ──────────────────────────────────── */
function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  if (!text) { flashInput(); return; }

  const task = {
    id:       uid(),
    text,
    done:     false,
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    due:      document.getElementById('taskDue').value,
    created:  Date.now(),
  };

  tasks.unshift(task);
  save();

  // Reset inputs
  document.getElementById('taskInput').value = '';
  document.getElementById('taskCategory').value = 'none';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDue').value = '';

  render();
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  save(); render();
}

function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      save(); render();
    }, { once: true });
  } else {
    tasks = tasks.filter(t => t.id !== id);
    save(); render();
  }
}

function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('editInput').value    = t.text;
  document.getElementById('editCategory').value = t.category || 'none';
  document.getElementById('editPriority').value = t.priority || 'medium';
  document.getElementById('editDue').value      = t.due || '';
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editInput').focus();
}

function saveEdit() {
  const t = tasks.find(t => t.id === editingId);
  if (!t) return;
  const text = document.getElementById('editInput').value.trim();
  if (!text) return;
  t.text     = text;
  t.category = document.getElementById('editCategory').value;
  t.priority = document.getElementById('editPriority').value;
  t.due      = document.getElementById('editDue').value;
  save(); closeModal(); render();
}

function closeModal() {
  editingId = null;
  document.getElementById('editModal').classList.add('hidden');
}

function clearCompleted() {
  if (!tasks.some(t => t.done)) return;
  if (!confirm('Remove all completed tasks?')) return;
  tasks = tasks.filter(t => !t.done);
  save(); render();
}

/* ── Filter & nav ─────────────────────────────────────────── */
function setFilter(f, btn) {
  activeFilter = f;
  // Reset all active states
  document.querySelectorAll('.nav-item, .cat-item').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const titles = {
    'all':'All Tasks', 'today':'Today', 'completed':'Completed',
    'cat:work':'Work','cat:personal':'Personal','cat:study':'Study','cat:health':'Health',
  };
  document.getElementById('filterTitle').textContent = titles[f] || 'Tasks';
  render();
}

/* ── UI helpers ───────────────────────────────────────────── */
function flashInput() {
  const inp = document.getElementById('taskInput');
  inp.style.borderColor = 'var(--high)';
  inp.style.boxShadow = '0 0 0 3px rgba(247,107,138,.18)';
  setTimeout(() => { inp.style.borderColor = ''; inp.style.boxShadow = ''; }, 800);
  inp.focus();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── Counts ───────────────────────────────────────────────── */
function updateCounts() {
  document.getElementById('count-all').textContent       = tasks.length;
  document.getElementById('count-today').textContent     = tasks.filter(t => isToday(t.due) && !t.done).length;
  document.getElementById('count-completed').textContent = tasks.filter(t => t.done).length;
}

/* ── Progress ring ────────────────────────────────────────── */
function updateRing() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const circ  = 125.66; // 2π × r(20)
  const offset = circ - (circ * pct / 100);
  document.getElementById('ringFill').style.strokeDashoffset = offset;
  document.getElementById('ringPct').textContent = `${pct}%`;
}

/* ── Render ───────────────────────────────────────────────── */
function render() {
  updateCounts();
  updateRing();

  const filtered = getFiltered();
  const list     = document.getElementById('taskList');
  const empty    = document.getElementById('emptyState');

  if (!filtered.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = filtered.map(t => {
    const checkClass = t.done ? 'task-check done' : 'task-check';
    const cardClass  = t.done ? 'task-card completed' : 'task-card';
    const catBadge   = t.category && t.category !== 'none'
      ? `<span class="task-cat ${t.category}">${catLabel(t.category)}</span>` : '';
    const dueBadge   = t.due
      ? `<span class="task-due ${isOverdue(t.due) && !t.done ? 'overdue' : isToday(t.due) ? 'today' : ''}">📅 ${fmtDate(t.due)}</span>` : '';

    return `
    <div class="${cardClass}" data-id="${t.id}" data-priority="${t.priority || 'medium'}">
      <button class="${checkClass}" onclick="toggleDone('${t.id}')" aria-label="Toggle done" title="Mark as complete"></button>
      <div class="task-content">
        <p class="task-text">${escHtml(t.text)}</p>
        <div class="task-meta">${catBadge}${dueBadge}</div>
      </div>
      <div class="task-actions">
        <button class="task-ico-btn" onclick="openEdit('${t.id}')" aria-label="Edit task" title="Edit">✏️</button>
        <button class="task-ico-btn del" onclick="deleteTask('${t.id}')" aria-label="Delete task" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function catLabel(c) {
  const m = {work:'💼 Work', personal:'🏠 Personal', study:'📚 Study', health:'❤️ Health'};
  return m[c] || c;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init ─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  load();

  // Set today's date display
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Set default due date to today
  document.getElementById('taskDue').value = new Date().toISOString().split('T')[0];
  document.getElementById('editDue').value = new Date().toISOString().split('T')[0];

  // Seed demo tasks if empty
  if (!tasks.length) seedDemo();

  render();

  // Modal close on backdrop click
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && document.getElementById('editModal').matches(':not(.hidden)')) saveEdit();
  });
});

function seedDemo() {
  const today = new Date().toISOString().split('T')[0];
  tasks = [
    { id: uid(), text: 'Review lecture notes on algorithms',     done: false, category: 'study',    priority: 'high',   due: today,   created: Date.now() },
    { id: uid(), text: 'Complete Django REST API assignment',     done: false, category: 'study',    priority: 'high',   due: today,   created: Date.now() },
    { id: uid(), text: 'Push Flutter app to GitHub',             done: true,  category: 'work',     priority: 'medium', due: today,   created: Date.now() },
    { id: uid(), text: 'Go for a 30-minute walk',                done: false, category: 'health',   priority: 'low',    due: today,   created: Date.now() },
    { id: uid(), text: 'Read chapter 4 of Clean Code',           done: false, category: 'personal', priority: 'medium', due: '',      created: Date.now() },
  ];
  save();
}
