const STORAGE_KEY = "todo_ui_webapp_v1";

const els = {
  form: document.getElementById("taskForm"),
  input: document.getElementById("taskInput"),
  due: document.getElementById("dueInput"),
  priority: document.getElementById("priorityInput"),
  list: document.getElementById("taskList"),
  empty: document.getElementById("emptyState"),
  chips: Array.from(document.querySelectorAll(".chip")),
  countActive: document.getElementById("countActive"),
  countDone: document.getElementById("countDone"),
  clearDone: document.getElementById("clearDoneBtn"),
  clearAll: document.getElementById("clearAllBtn"),
  toast: document.getElementById("toast"),
  tpl: document.getElementById("taskItemTpl"),
};

let state = {
  filter: "all",
  tasks: loadTasks(),
};

render();

 
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  const due = els.due.value || null;
  const priority = els.priority.value || "normal";

  const task = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    text,
    due,
    priority,
    done: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  state.tasks.unshift(task);
  persist();
  els.form.reset();
  els.input.focus();
  toast("Added ✅");
  render();
});

els.chips.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.filter = btn.dataset.filter;
    els.chips.forEach(b => {
      const is = b === btn;
      b.classList.toggle("is-active", is);
      b.setAttribute("aria-selected", is ? "true" : "false");
    });
    render();
  });
});

els.clearDone.addEventListener("click", () => {
  const before = state.tasks.length;
  state.tasks = state.tasks.filter(t => !t.done);
  persist();
  const removed = before - state.tasks.length;
  toast(removed ? `Cleared ${removed} done task(s)` : "No done tasks to clear");
  render();
});

els.clearAll.addEventListener("click", () => {
  if (!state.tasks.length) return toast("Nothing to clear");
  if (!confirm("Clear ALL tasks?")) return;
  state.tasks = [];
  persist();
  toast("All cleared");
  render();
});


els.list.addEventListener("click", (e) => {
  const li = e.target.closest(".task");
  if (!li) return;
  const id = li.dataset.id;
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  if (e.target.closest(".check")) {
    task.done = !task.done;
    task.updatedAt = Date.now();
    persist();
    toast(task.done ? "Nice! ✅" : "Back to active ↩️");
    render();
    return;
  }

  const actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;
  const action = actionBtn.dataset.action;

  if (action === "delete") {
    state.tasks = state.tasks.filter(t => t.id !== id);
    persist();
    toast("Deleted 🗑");
    render();
  }

  if (action === "edit") {
    startInlineEdit(li, task);
  }
});


els.list.addEventListener("dblclick", (e) => {
  const li = e.target.closest(".task");
  if (!li) return;
  const id = li.dataset.id;
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  startInlineEdit(li, task);
});


function render() {
  const tasks = getFilteredTasks();

  els.list.innerHTML = "";
  for (const t of tasks) {
    els.list.appendChild(renderItem(t));
  }


  const active = state.tasks.filter(t => !t.done).length;
  const done = state.tasks.filter(t => t.done).length;
  els.countActive.textContent = String(active);
  els.countDone.textContent = String(done);


  const showEmpty = tasks.length === 0;
  els.empty.hidden = !showEmpty;

 
  els.list.style.minHeight = showEmpty ? "0px" : "";
}

function renderItem(task) {
  const node = els.tpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.classList.toggle("is-done", task.done);

  const checkBtn = node.querySelector(".check");
  checkBtn.setAttribute("aria-label", task.done ? "Mark as active" : "Mark as done");

  const textEl = node.querySelector(".task__text");
  textEl.textContent = task.text;

  const pill = node.querySelector(".pill");
  pill.dataset.pill = task.priority;
  pill.textContent = labelPriority(task.priority);

  const dueEl = node.querySelector(".due");
  if (task.due) {
    const { label, urgency } = formatDue(task.due);
    dueEl.textContent = label;
    dueEl.dataset.due = urgency;
    dueEl.style.opacity = "1";
  } else {
    dueEl.textContent = "No due date";
    dueEl.style.opacity = ".55";
  }

  return node;
}

function getFilteredTasks() {
  if (state.filter === "active") return state.tasks.filter(t => !t.done);
  if (state.filter === "done") return state.tasks.filter(t => t.done);
  return state.tasks;
}


function startInlineEdit(li, task) {
  const textEl = li.querySelector(".task__text");

  
  if (textEl.dataset.editing === "1") return;
  textEl.dataset.editing = "1";

  const old = task.text;

  const input = document.createElement("input");
  input.type = "text";
  input.value = old;
  input.maxLength = 120;
  input.className = "editInput";
  input.style.width = "100%";
  input.style.border = "0";
  input.style.outline = "none";
  input.style.background = "rgba(255,255,255,.06)";
  input.style.color = "inherit";
  input.style.font = "inherit";
  input.style.fontWeight = "750";
  input.style.padding = "8px 10px";
  input.style.borderRadius = "12px";
  input.style.border = "1px solid rgba(133,255,227,.35)";

  textEl.replaceWith(input);
  input.focus();
  input.select();

  const save = () => {
    const next = input.value.trim();
    task.text = next || old;
    task.updatedAt = Date.now();
    persist();
    render();
    toast(next ? "Updated ✨" : "Kept original");
  };

  const cancel = () => {
    render();
    toast("Edit cancelled");
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  });
  input.addEventListener("blur", save, { once: true });
}


function labelPriority(p) {
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Normal";
}

function formatDue(isoDate) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(isoDate + "T00:00:00");
  const diffDays = Math.round((due - today) / (1000*60*60*24));

  let label = "";
  let urgency = "ok";
  if (diffDays === 0) { label = "Due today"; urgency = "soon"; }
  else if (diffDays === 1) { label = "Due tomorrow"; urgency = "soon"; }
  else if (diffDays < 0) { label = `Overdue by ${Math.abs(diffDays)} day(s)`; urgency = "late"; }
  else { label = `Due in ${diffDays} day(s)`; urgency = diffDays <= 3 ? "soon" : "ok"; }

  return { label, urgency };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const tasks = JSON.parse(raw);
    if (!Array.isArray(tasks)) return [];
    return tasks.map(t => ({
      id: String(t.id ?? ""),
      text: String(t.text ?? ""),
      due: t.due ? String(t.due) : null,
      priority: ["low","normal","high"].includes(t.priority) ? t.priority : "normal",
      done: Boolean(t.done),
      createdAt: Number(t.createdAt ?? Date.now()),
      updatedAt: Number(t.updatedAt ?? Date.now()),
    })).filter(t => t.id && t.text);
  } catch {
    return [];
  }
}

let toastTimer = null;
function toast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 1600);
}

els.list.addEventListener("keydown", (e) => {
  const current = document.activeElement;
  if (!current.classList || !current.classList.contains("task__text")) return;

  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();

  const items = Array.from(els.list.querySelectorAll(".task__text"));
  const idx = items.indexOf(current);
  const nextIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
  if (items[nextIdx]) items[nextIdx].focus();
});
