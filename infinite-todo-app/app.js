const STORAGE_KEY = "infinite.todo.v1";
const ARCHIVE_KEY = "infinite.todo.archive.v1";
const SORT_KEY = "infinite.todo.sort.v1";

const CLOUD_URL_KEY = "infinite.todo.cloud.url";
const CLOUD_ANON_KEY = "infinite.todo.cloud.anon";
const CLOUD_EMAIL_KEY = "infinite.todo.cloud.email";
const CLOUD_TABLE = "todo_state";

const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const archivedList = document.querySelector("#archived-list");
const sortSelect = document.querySelector("#sort-select");
const archiveBtn = document.querySelector("#archive-btn");
const notifyBtn = document.querySelector("#notify-btn");
const template = document.querySelector("#task-template");

const syncStatus = document.querySelector("#sync-status");
const syncNowBtn = document.querySelector("#sync-now-btn");
const logoutBtn = document.querySelector("#logout-btn");
const saveCloudBtn = document.querySelector("#save-cloud-btn");
const emailLoginBtn = document.querySelector("#email-login-btn");
const supabaseUrlInput = document.querySelector("#supabase-url");
const supabaseKeyInput = document.querySelector("#supabase-key");
const emailInput = document.querySelector("#email-input");

let tasks = readJSON(STORAGE_KEY, []).map(normalizeTask);
let archivedTasks = readJSON(ARCHIVE_KEY, []).map(normalizeArchivedTask);
let reminderTimer = null;
let supabaseClient = null;
let authSubscription = null;
let currentUser = null;
let syncInFlight = false;
let syncDebounceTimer = null;

sortSelect.value = localStorage.getItem(SORT_KEY) || "created-desc";
hydrateCloudInputs();
renderAll(false);
initNotifications();
registerServiceWorker();
initCloud();

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function now() {
  return Date.now();
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    text: String(task.text || "").trim() || "(sem texto)",
    completed: Boolean(task.completed),
    priority: ["none", "yellow", "red"].includes(task.priority) ? task.priority : "none",
    createdAt: Number(task.createdAt) || now(),
    updatedAt: Number(task.updatedAt) || Number(task.createdAt) || now()
  };
}

function normalizeArchivedTask(task) {
  return {
    ...normalizeTask(task),
    archivedAt: Number(task.archivedAt) || now()
  };
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archivedTasks));
}

function createTask(text) {
  const ts = now();
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    priority: "none",
    createdAt: ts,
    updatedAt: ts
  };
}

function formatDate(ts) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(ts));
}

function priorityWeight(priority) {
  if (priority === "red") return 2;
  if (priority === "yellow") return 1;
  return 0;
}

function getSortedTasks() {
  const sortBy = sortSelect.value;
  const copy = [...tasks];

  if (sortBy === "created-asc") {
    return copy.sort((a, b) => a.createdAt - b.createdAt);
  }

  if (sortBy === "priority-desc") {
    return copy.sort((a, b) => {
      const diff = priorityWeight(b.priority) - priorityWeight(a.priority);
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    });
  }

  if (sortBy === "priority-asc") {
    return copy.sort((a, b) => {
      const diff = priorityWeight(a.priority) - priorityWeight(b.priority);
      return diff !== 0 ? diff : b.createdAt - a.createdAt;
    });
  }

  return copy.sort((a, b) => b.createdAt - a.createdAt);
}

function renderAll(shouldSync = true) {
  renderTasks();
  renderArchive();
  persistLocal();
  if (shouldSync) scheduleCloudSync();
}

function renderTasks() {
  taskList.innerHTML = "";

  for (const task of getSortedTasks()) {
    const node = template.content.firstElementChild.cloneNode(true);
    const toggle = node.querySelector(".toggle");
    const text = node.querySelector(".task-text");
    const date = node.querySelector(".task-date");
    const remove = node.querySelector(".delete");
    const dots = node.querySelectorAll(".dot");

    text.textContent = task.text;
    date.textContent = formatDate(task.createdAt);
    node.dataset.id = task.id;
    node.classList.toggle("completed", task.completed);

    dots.forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.priority === task.priority);
    });

    toggle.addEventListener("click", () => {
      task.completed = !task.completed;
      task.updatedAt = now();
      renderAll();
    });

    remove.addEventListener("click", () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      renderAll();
    });

    text.addEventListener("dblclick", () => {
      text.contentEditable = "true";
      text.focus();
      document.getSelection()?.selectAllChildren(text);
    });

    text.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        text.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        text.textContent = task.text;
        text.blur();
      }
    });

    text.addEventListener("blur", () => {
      if (text.contentEditable !== "true") return;
      text.contentEditable = "false";
      const updated = text.textContent.trim();
      if (!updated) {
        text.textContent = task.text;
        return;
      }
      if (updated !== task.text) {
        task.text = updated;
        task.updatedAt = now();
        persistLocal();
        scheduleCloudSync();
      }
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        if (task.priority === dot.dataset.priority) return;
        task.priority = dot.dataset.priority;
        task.updatedAt = now();
        renderAll();
        maybeNotifyPriority(task);
      });
    });

    taskList.append(node);
  }
}

function renderArchive() {
  archivedList.innerHTML = "";

  if (!archivedTasks.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhuma tarefa arquivada ainda.";
    archivedList.append(empty);
    return;
  }

  for (const task of archivedTasks.slice().sort((a, b) => b.archivedAt - a.archivedAt)) {
    const item = document.createElement("li");
    item.textContent = `${task.text} (${formatDate(task.archivedAt)})`;
    archivedList.append(item);
  }
}

function archiveCompleted() {
  const completed = tasks.filter((task) => task.completed);
  if (!completed.length) return;

  const archivedAt = now();
  archivedTasks = archivedTasks.concat(
    completed.map((task) =>
      normalizeArchivedTask({
        ...task,
        archivedAt,
        updatedAt: archivedAt
      })
    )
  );

  const completedIds = new Set(completed.map((task) => task.id));
  tasks = tasks.filter((task) => !completedIds.has(task.id));
  renderAll();
}

function askNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Este navegador não suporta notificações.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      notifyBtn.textContent = "Notificações ativas";
      notifyPrioritySummary();
      startPriorityReminder();
    }
  });
}

function maybeNotifyPriority(task) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (task.completed || task.priority === "none") return;

  const level = task.priority === "red" ? "alta" : "média";
  new Notification("Tarefa prioritária atualizada", {
    body: `${task.text} (prioridade ${level})`
  });
}

function notifyPrioritySummary() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const important = tasks.filter((t) => !t.completed && t.priority !== "none");
  if (!important.length) return;

  const redCount = important.filter((t) => t.priority === "red").length;
  const yellowCount = important.filter((t) => t.priority === "yellow").length;

  new Notification("Resumo de prioridades", {
    body: `Pendentes: ${redCount} vermelha(s), ${yellowCount} amarela(s).`
  });
}

function startPriorityReminder() {
  if (reminderTimer) clearInterval(reminderTimer);

  reminderTimer = setInterval(() => {
    notifyPrioritySummary();
  }, 5 * 60 * 1000);
}

function initNotifications() {
  if (!("Notification" in window)) {
    notifyBtn.disabled = true;
    notifyBtn.textContent = "Notificação indisponível";
    return;
  }

  if (Notification.permission === "granted") {
    notifyBtn.textContent = "Notificações ativas";
    startPriorityReminder();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Erro ao registrar service worker", error);
    });
  });
}

function hydrateCloudInputs() {
  supabaseUrlInput.value = localStorage.getItem(CLOUD_URL_KEY) || "";
  supabaseKeyInput.value = localStorage.getItem(CLOUD_ANON_KEY) || "";
  emailInput.value = localStorage.getItem(CLOUD_EMAIL_KEY) || "";
}

function setStatus(message) {
  syncStatus.textContent = message;
}

function canUseCloud() {
  return Boolean(supabaseClient && currentUser);
}

async function initCloud() {
  const url = localStorage.getItem(CLOUD_URL_KEY);
  const anonKey = localStorage.getItem(CLOUD_ANON_KEY);

  if (!url || !anonKey) {
    setStatus("Modo local");
    return;
  }

  if (!window.supabase?.createClient) {
    setStatus("SDK Supabase indisponível");
    return;
  }

  supabaseClient = window.supabase.createClient(url, anonKey);

  if (authSubscription?.subscription) {
    authSubscription.subscription.unsubscribe();
  }

  authSubscription = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (!currentUser) {
      setStatus("Nuvem configurada (não autenticado)");
      return;
    }

    setStatus(`Conectado: ${currentUser.email || currentUser.id.slice(0, 8)}`);
    await syncWithCloud({ manual: false });
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setStatus("Erro de sessão da nuvem");
    console.error(error);
    return;
  }

  currentUser = data.session?.user || null;
  if (currentUser) {
    setStatus(`Conectado: ${currentUser.email || currentUser.id.slice(0, 8)}`);
    await syncWithCloud({ manual: false });
  } else {
    setStatus("Nuvem configurada (não autenticado)");
  }
}

function saveCloudConfig() {
  const url = supabaseUrlInput.value.trim();
  const anon = supabaseKeyInput.value.trim();

  if (!url || !anon) {
    alert("Preencha Supabase URL e anon key.");
    return;
  }

  localStorage.setItem(CLOUD_URL_KEY, url);
  localStorage.setItem(CLOUD_ANON_KEY, anon);
  initCloud();
}

async function sendMagicLink() {
  if (!supabaseClient) {
    alert("Configure URL e anon key do Supabase primeiro.");
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    alert("Digite seu e-mail.");
    return;
  }

  localStorage.setItem(CLOUD_EMAIL_KEY, email);
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href.split("#")[0]
    }
  });

  if (error) {
    console.error(error);
    alert("Falha ao enviar link de acesso.");
    return;
  }

  alert("Link enviado. Abra seu e-mail neste dispositivo e confirme o login.");
}

async function logoutCloud() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error(error);
    alert("Não foi possível sair da conta.");
    return;
  }

  currentUser = null;
  setStatus("Nuvem configurada (não autenticado)");
}

function mergeByUpdatedAt(localItems, remoteItems, normalizer) {
  const map = new Map();

  for (const item of [...(remoteItems || []), ...(localItems || [])]) {
    const normalized = normalizer(item);
    const existing = map.get(normalized.id);
    if (!existing || normalized.updatedAt >= existing.updatedAt) {
      map.set(normalized.id, normalized);
    }
  }

  return [...map.values()];
}

function mergeState(localState, remoteState) {
  const mergedTasks = mergeByUpdatedAt(localState.tasks, remoteState.tasks, normalizeTask);
  const mergedArchived = mergeByUpdatedAt(localState.archivedTasks, remoteState.archivedTasks, normalizeArchivedTask);

  const archivedIds = new Set(mergedArchived.map((item) => item.id));
  const activeTasks = mergedTasks.filter((item) => !archivedIds.has(item.id));

  return {
    tasks: activeTasks,
    archivedTasks: mergedArchived
  };
}

async function fetchCloudState(userId) {
  const { data, error } = await supabaseClient
    .from(CLOUD_TABLE)
    .select("tasks,archived_tasks")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    archivedTasks: Array.isArray(data?.archived_tasks) ? data.archived_tasks : []
  };
}

async function pushCloudState(userId, state) {
  const payload = {
    user_id: userId,
    tasks: state.tasks,
    archived_tasks: state.archivedTasks,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient.from(CLOUD_TABLE).upsert(payload, {
    onConflict: "user_id"
  });

  if (error) {
    throw error;
  }
}

function scheduleCloudSync() {
  if (!canUseCloud()) return;

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(() => {
    syncWithCloud({ manual: false });
  }, 900);
}

async function syncWithCloud({ manual }) {
  if (!canUseCloud()) return;
  if (syncInFlight) return;

  syncInFlight = true;
  setStatus("Sincronizando...");

  try {
    const remote = await fetchCloudState(currentUser.id);
    const merged = mergeState(
      { tasks, archivedTasks },
      { tasks: remote.tasks, archivedTasks: remote.archivedTasks }
    );

    tasks = merged.tasks;
    archivedTasks = merged.archivedTasks;
    renderAll(false);
    await pushCloudState(currentUser.id, merged);

    const mode = manual ? "Sincronizado (manual)" : "Sincronizado";
    setStatus(`${mode}: ${formatDate(now())}`);
  } catch (error) {
    console.error(error);
    setStatus("Erro de sincronização");
    if (manual) {
      alert("Falha ao sincronizar com a nuvem. Confira sua configuração/tabela no Supabase.");
    }
  } finally {
    syncInFlight = false;
  }
}

taskInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const text = taskInput.value.trim();
  if (!text) return;

  const task = createTask(text);
  tasks.push(task);
  taskInput.value = "";
  renderAll();
});

sortSelect.addEventListener("change", () => {
  localStorage.setItem(SORT_KEY, sortSelect.value);
  renderTasks();
});

archiveBtn.addEventListener("click", archiveCompleted);
notifyBtn.addEventListener("click", askNotificationPermission);

saveCloudBtn.addEventListener("click", saveCloudConfig);
emailLoginBtn.addEventListener("click", sendMagicLink);
logoutBtn.addEventListener("click", logoutCloud);
syncNowBtn.addEventListener("click", () => syncWithCloud({ manual: true }));
