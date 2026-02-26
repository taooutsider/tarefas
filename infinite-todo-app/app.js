const STORAGE_KEY = "infinite.todo.v1";
const ARCHIVE_KEY = "infinite.todo.archive.v1";
const SORT_KEY = "infinite.todo.sort.v1";
const FILTER_KEY = "infinite.todo.filter.v1";
const LANGUAGE_KEY = "infinite.todo.lang.v1";

const CLOUD_URL_KEY = "infinite.todo.cloud.url";
const CLOUD_ANON_KEY = "infinite.todo.cloud.anon";
const CLOUD_EMAIL_KEY = "infinite.todo.cloud.email";
const CLOUD_TABLE = "todo_state";

const taskInput = document.querySelector("#task-input");
const addTaskBtn = document.querySelector("#add-task-btn");
const taskList = document.querySelector("#task-list");
const archivedList = document.querySelector("#archived-list");
const sortSelect = document.querySelector("#sort-select");
const archiveBtn = document.querySelector("#archive-btn");
const notifyBtn = document.querySelector("#notify-btn");
const filterButtons = [...document.querySelectorAll(".filter-btn")];
const tasksSummary = document.querySelector("#tasks-summary");
const template = document.querySelector("#task-template");
const appTitle = document.querySelector("#app-title");
const appSubtitle = document.querySelector("#app-subtitle");
const languageLabel = document.querySelector("#language-label");
const languageSelect = document.querySelector("#language-select");
const sortLabel = document.querySelector("#sort-label");
const inputHint = document.querySelector("#input-hint");
const archiveTitle = document.querySelector("#archive-title");

const syncPanel = document.querySelector("#sync-panel");
const syncPanelBody = document.querySelector("#sync-panel-body");
const syncStatus = document.querySelector("#sync-status");
const toggleSyncPanelBtn = document.querySelector("#toggle-sync-panel-btn");
const toggleCloudBtn = document.querySelector("#toggle-cloud-btn");
const cloudPanelBody = document.querySelector("#cloud-panel-body");
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
let cloudPanelOpen = false;
let syncPanelOpen = false;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || "pt-BR";
let currentFilter = localStorage.getItem(FILTER_KEY) || "all";

const I18N = {
  "pt-BR": {
    appTitle: "Lista Infinita",
    appSubtitle: "Objetiva, limpa e sem limite.",
    languageLabel: "Idioma",
    toggleSyncOpen: "Mostrar configurações",
    toggleSyncClose: "Ocultar configurações",
    toggleCloudOpen: "Configurar nuvem",
    toggleCloudClose: "Fechar nuvem",
    syncNow: "Sincronizar agora",
    logout: "Sair",
    saveCloud: "Salvar nuvem",
    sendAccessLink: "Enviar link de acesso",
    taskPlaceholder: "Digite uma tarefa e pressione Enter",
    addTask: "Criar",
    inputHint: "Pressione Enter ou clique em Criar.",
    sortLabel: "Ordenar",
    sortCreatedDesc: "Data (mais nova)",
    sortCreatedAsc: "Data (mais antiga)",
    sortPriorityDesc: "Cor (vermelho > amarelo > sem cor)",
    sortPriorityAsc: "Cor (sem cor > amarelo > vermelho)",
    notify: "Ativar notificações",
    archiveCompleted: "Arquivar concluídas",
    filterAll: "Todas",
    filterPending: "Pendentes",
    filterCompleted: "Concluídas",
    filtersGroupLabel: "Filtros",
    tasksSummary: (total, pending, completed) =>
      `${total} tarefa(s) | ${pending} pendente(s) | ${completed} concluída(s)`,
    archiveTitle: "Arquivadas",
    archiveEmpty: "Nenhuma tarefa arquivada ainda.",
    listEmpty: "Nenhuma tarefa ainda. Digite acima e clique em Criar.",
    listEmptyPending: "Nenhuma tarefa pendente.",
    listEmptyCompleted: "Nenhuma tarefa concluída.",
    localMode: "Modo local",
    cloudConfiguredNoAuth: "Nuvem configurada (não autenticado)",
    cloudSessionError: "Erro de sessão da nuvem",
    supabaseSdkUnavailable: "SDK Supabase indisponível",
    syncing: "Sincronizando...",
    synced: "Sincronizado",
    syncedManual: "Sincronizado (manual)",
    syncError: "Erro de sincronização",
    unsupportedNotifications: "Este navegador não suporta notificações.",
    notificationsActive: "Notificações ativas",
    notificationsUnavailable: "Notificação indisponível",
    priorityUpdatedTitle: "Tarefa prioritária atualizada",
    priorityHigh: "alta",
    priorityMedium: "média",
    prioritySummaryTitle: "Resumo de prioridades",
    prioritySummaryBody: (red, yellow) => `Pendentes: ${red} vermelha(s), ${yellow} amarela(s).`,
    noTextFallback: "(sem texto)",
    cloudConfigRequired: "Configure URL e anon key do Supabase primeiro.",
    fillCloudConfig: "Preencha Supabase URL e anon key.",
    fillEmail: "Digite seu e-mail.",
    sendMagicLinkFailed: "Falha ao enviar link de acesso.",
    magicLinkSent: "Link enviado. Abra seu e-mail neste dispositivo e confirme o login.",
    logoutFailed: "Não foi possível sair da conta.",
    manualSyncFailed: "Falha ao sincronizar com a nuvem. Confira sua configuração/tabela no Supabase.",
    statusConnectedPrefix: "Conectado",
    sortByColorDateTie: "Cor",
    deleteLabel: "Excluir tarefa",
    toggleLabel: "Marcar concluída",
    priorityNoneLabel: "Sem prioridade",
    priorityYellowLabel: "Prioridade amarela",
    priorityRedLabel: "Prioridade vermelha",
    supabaseUrlPlaceholder: "Supabase URL (https://xxxx.supabase.co)",
    supabaseKeyPlaceholder: "Supabase anon key",
    emailPlaceholder: "Seu e-mail para login"
  },
  "en-US": {
    appTitle: "Infinite List",
    appSubtitle: "Simple, clean, and endless.",
    languageLabel: "Language",
    toggleSyncOpen: "Show settings",
    toggleSyncClose: "Hide settings",
    toggleCloudOpen: "Cloud settings",
    toggleCloudClose: "Close cloud",
    syncNow: "Sync now",
    logout: "Sign out",
    saveCloud: "Save cloud",
    sendAccessLink: "Send access link",
    taskPlaceholder: "Type a task and press Enter",
    addTask: "Create",
    inputHint: "Press Enter or click Create.",
    sortLabel: "Sort",
    sortCreatedDesc: "Date (newest)",
    sortCreatedAsc: "Date (oldest)",
    sortPriorityDesc: "Color (red > yellow > none)",
    sortPriorityAsc: "Color (none > yellow > red)",
    notify: "Enable notifications",
    archiveCompleted: "Archive completed",
    filterAll: "All",
    filterPending: "Pending",
    filterCompleted: "Completed",
    filtersGroupLabel: "Filters",
    tasksSummary: (total, pending, completed) =>
      `${total} task(s) | ${pending} pending | ${completed} completed`,
    archiveTitle: "Archived",
    archiveEmpty: "No archived tasks yet.",
    listEmpty: "No tasks yet. Type above and click Create.",
    listEmptyPending: "No pending tasks.",
    listEmptyCompleted: "No completed tasks.",
    localMode: "Local mode",
    cloudConfiguredNoAuth: "Cloud configured (not signed in)",
    cloudSessionError: "Cloud session error",
    supabaseSdkUnavailable: "Supabase SDK unavailable",
    syncing: "Syncing...",
    synced: "Synced",
    syncedManual: "Synced (manual)",
    syncError: "Sync error",
    unsupportedNotifications: "This browser does not support notifications.",
    notificationsActive: "Notifications enabled",
    notificationsUnavailable: "Notifications unavailable",
    priorityUpdatedTitle: "Priority task updated",
    priorityHigh: "high",
    priorityMedium: "medium",
    prioritySummaryTitle: "Priority summary",
    prioritySummaryBody: (red, yellow) => `Pending: ${red} red, ${yellow} yellow.`,
    noTextFallback: "(no text)",
    cloudConfigRequired: "Configure Supabase URL and anon key first.",
    fillCloudConfig: "Fill in Supabase URL and anon key.",
    fillEmail: "Enter your email.",
    sendMagicLinkFailed: "Failed to send access link.",
    magicLinkSent: "Link sent. Open your email on this device and confirm login.",
    logoutFailed: "Could not sign out.",
    manualSyncFailed: "Cloud sync failed. Check your Supabase config/table.",
    statusConnectedPrefix: "Connected",
    sortByColorDateTie: "Color",
    deleteLabel: "Delete task",
    toggleLabel: "Mark completed",
    priorityNoneLabel: "No priority",
    priorityYellowLabel: "Yellow priority",
    priorityRedLabel: "Red priority",
    supabaseUrlPlaceholder: "Supabase URL (https://xxxx.supabase.co)",
    supabaseKeyPlaceholder: "Supabase anon key",
    emailPlaceholder: "Your email for login"
  }
};

if (sortSelect) {
  sortSelect.value = localStorage.getItem(SORT_KEY) || "created-desc";
}
if (languageSelect) {
  languageSelect.value = I18N[currentLanguage] ? currentLanguage : "pt-BR";
  currentLanguage = languageSelect.value;
}
if (!["all", "pending", "completed"].includes(currentFilter)) currentFilter = "all";
hydrateCloudInputs();
applyLanguage();
renderAll(false);
initNotifications();
registerServiceWorker();
initCloud();

function t(key, ...args) {
  const value = I18N[currentLanguage]?.[key] ?? I18N["pt-BR"][key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function applyLanguage() {
  if (!appTitle || !taskInput || !sortSelect) return;
  document.documentElement.lang = currentLanguage;
  appTitle.textContent = t("appTitle");
  appSubtitle.textContent = t("appSubtitle");
  languageLabel.textContent = t("languageLabel");
  syncNowBtn.textContent = t("syncNow");
  logoutBtn.textContent = t("logout");
  saveCloudBtn.textContent = t("saveCloud");
  emailLoginBtn.textContent = t("sendAccessLink");
  taskInput.placeholder = t("taskPlaceholder");
  addTaskBtn.textContent = t("addTask");
  inputHint.textContent = t("inputHint");
  sortLabel.textContent = t("sortLabel");
  notifyBtn.textContent =
    "Notification" in window && Notification.permission === "granted"
      ? t("notificationsActive")
      : t("notify");
  archiveBtn.textContent = t("archiveCompleted");
  filterButtons.forEach((btn) => {
    if (btn.dataset.filter === "all") btn.textContent = t("filterAll");
    if (btn.dataset.filter === "pending") btn.textContent = t("filterPending");
    if (btn.dataset.filter === "completed") btn.textContent = t("filterCompleted");
  });
  const filtersRow = document.querySelector(".filters-row");
  if (filtersRow) filtersRow.setAttribute("aria-label", t("filtersGroupLabel"));
  archiveTitle.textContent = t("archiveTitle");
  supabaseUrlInput.placeholder = t("supabaseUrlPlaceholder");
  supabaseKeyInput.placeholder = t("supabaseKeyPlaceholder");
  emailInput.placeholder = t("emailPlaceholder");

  const opts = sortSelect.options;
  if (opts.length >= 4) {
    opts[0].textContent = t("sortCreatedDesc");
    opts[1].textContent = t("sortCreatedAsc");
    opts[2].textContent = t("sortPriorityDesc");
    opts[3].textContent = t("sortPriorityAsc");
  }

  setCloudPanelOpen(cloudPanelOpen);
  setSyncPanelOpen(syncPanelOpen);
  updateSyncPanelMode();
  updateFilterButtons();
  renderArchive();
  renderTasks();
}

function setSyncPanelOpen(open) {
  if (!syncPanelBody || !toggleSyncPanelBtn) return;
  syncPanelOpen = open;
  syncPanelBody.classList.toggle("is-collapsed", !open);
  toggleSyncPanelBtn.setAttribute("aria-expanded", String(open));
  toggleSyncPanelBtn.textContent = open ? t("toggleSyncClose") : t("toggleSyncOpen");
  updateSyncPanelMode();
}

function setCloudPanelOpen(open) {
  if (!cloudPanelBody || !toggleCloudBtn) return;
  cloudPanelOpen = open;
  cloudPanelBody.classList.toggle("is-collapsed", !open);
  toggleCloudBtn.setAttribute("aria-expanded", String(open));
  toggleCloudBtn.textContent = open ? t("toggleCloudClose") : t("toggleCloudOpen");
}

setCloudPanelOpen(false);
setSyncPanelOpen(syncPanelOpen);

function hasCloudConfig() {
  return Boolean(localStorage.getItem(CLOUD_URL_KEY) && localStorage.getItem(CLOUD_ANON_KEY));
}

function updateSyncPanelMode() {
  if (!syncPanel) return;
  const localOnly = !hasCloudConfig();
  syncPanel.classList.toggle("is-local-clean", localOnly);

  if (localOnly) {
    syncNowBtn.classList.add("is-hidden");
    logoutBtn.classList.add("is-hidden");
    toggleCloudBtn.classList.toggle("is-hidden", !syncPanelOpen);
  } else {
    toggleCloudBtn.classList.remove("is-hidden");
    syncNowBtn.classList.remove("is-hidden");
    // logout visibility still depends on auth state elsewhere
  }
}

function updateFilterButtons() {
  filterButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.filter === currentFilter);
  });
}

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
    text: String(task.text || "").trim() || t("noTextFallback"),
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
  return new Intl.DateTimeFormat(currentLanguage, {
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

function getVisibleTasks(sortedTasks) {
  if (currentFilter === "pending") return sortedTasks.filter((task) => !task.completed);
  if (currentFilter === "completed") return sortedTasks.filter((task) => task.completed);
  return sortedTasks;
}

function renderAll(shouldSync = true) {
  renderTasks();
  renderArchive();
  persistLocal();
  if (shouldSync) scheduleCloudSync();
}

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = "";
  updateFilterButtons();
  const sorted = getSortedTasks();
  const visibleTasks = getVisibleTasks(sorted);
  const total = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = total - completedCount;
  if (tasksSummary) {
    tasksSummary.textContent = t("tasksSummary", total, pendingCount, completedCount);
  }

  if (!visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-list-item";
    if (!tasks.length) empty.textContent = t("listEmpty");
    else if (currentFilter === "pending") empty.textContent = t("listEmptyPending");
    else if (currentFilter === "completed") empty.textContent = t("listEmptyCompleted");
    else empty.textContent = t("listEmpty");
    taskList.append(empty);
    return;
  }

  for (const task of visibleTasks) {
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
    toggle.setAttribute("aria-label", t("toggleLabel"));
    remove.setAttribute("aria-label", t("deleteLabel"));
    remove.textContent = currentLanguage === "en-US" ? "Delete" : "Excluir";

    dots.forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.priority === task.priority);
      if (dot.dataset.priority === "none") dot.setAttribute("aria-label", t("priorityNoneLabel"));
      if (dot.dataset.priority === "yellow") dot.setAttribute("aria-label", t("priorityYellowLabel"));
      if (dot.dataset.priority === "red") dot.setAttribute("aria-label", t("priorityRedLabel"));
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
  if (!archivedList) return;
  archivedList.innerHTML = "";

  if (!archivedTasks.length) {
    const empty = document.createElement("li");
    empty.textContent = t("archiveEmpty");
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
    alert(t("unsupportedNotifications"));
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      notifyBtn.textContent = t("notificationsActive");
      notifyPrioritySummary();
      startPriorityReminder();
    }
  });
}

function maybeNotifyPriority(task) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (task.completed || task.priority === "none") return;

  const level = task.priority === "red" ? t("priorityHigh") : t("priorityMedium");
  new Notification(t("priorityUpdatedTitle"), {
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

  new Notification(t("prioritySummaryTitle"), {
    body: t("prioritySummaryBody", redCount, yellowCount)
  });
}

function startPriorityReminder() {
  if (reminderTimer) clearInterval(reminderTimer);

  reminderTimer = setInterval(() => {
    notifyPrioritySummary();
  }, 5 * 60 * 1000);
}

function initNotifications() {
  if (!notifyBtn) return;
  if (!("Notification" in window)) {
    notifyBtn.disabled = true;
    notifyBtn.textContent = t("notificationsUnavailable");
    return;
  }

  if (Notification.permission === "granted") {
    notifyBtn.textContent = t("notificationsActive");
    startPriorityReminder();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (isLocalhost) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        console.info("PWA cache local limpo para evitar versão antiga durante testes.");
      } catch (error) {
        console.warn("Falha ao limpar service workers/caches locais", error);
      }
      return;
    }

    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Erro ao registrar service worker", error);
    });
  });
}

function hydrateCloudInputs() {
  if (!supabaseUrlInput || !supabaseKeyInput || !emailInput) return;
  supabaseUrlInput.value = localStorage.getItem(CLOUD_URL_KEY) || "";
  supabaseKeyInput.value = localStorage.getItem(CLOUD_ANON_KEY) || "";
  emailInput.value = localStorage.getItem(CLOUD_EMAIL_KEY) || "";
}

function setStatus(message) {
  if (!syncStatus) return;
  syncStatus.textContent = message;
}

function createTaskFromInput() {
  const text = taskInput.value.trim();
  if (!text) return;

  const task = createTask(text);
  tasks.push(task);
  taskInput.value = "";
  renderAll();
  taskInput.focus();
}

function canUseCloud() {
  return Boolean(supabaseClient && currentUser);
}

async function initCloud() {
  const url = localStorage.getItem(CLOUD_URL_KEY);
  const anonKey = localStorage.getItem(CLOUD_ANON_KEY);

  if (!url || !anonKey) {
    setStatus(t("localMode"));
    setCloudPanelOpen(false);
    syncPanelOpen = false;
    setSyncPanelOpen(false);
    updateSyncPanelMode();
    return;
  }
  updateSyncPanelMode();
  syncPanelOpen = true;
  setSyncPanelOpen(true);

  if (!window.supabase?.createClient) {
    setStatus(t("supabaseSdkUnavailable"));
    return;
  }

  supabaseClient = window.supabase.createClient(url, anonKey);

  if (authSubscription?.subscription) {
    authSubscription.subscription.unsubscribe();
  }

  authSubscription = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (!currentUser) {
      setStatus(t("cloudConfiguredNoAuth"));
      return;
    }

    setStatus(`${t("statusConnectedPrefix")}: ${currentUser.email || currentUser.id.slice(0, 8)}`);
    await syncWithCloud({ manual: false });
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setStatus(t("cloudSessionError"));
    console.error(error);
    return;
  }

  currentUser = data.session?.user || null;
  if (currentUser) {
    setStatus(`${t("statusConnectedPrefix")}: ${currentUser.email || currentUser.id.slice(0, 8)}`);
    await syncWithCloud({ manual: false });
  } else {
    setStatus(t("cloudConfiguredNoAuth"));
  }
}

function saveCloudConfig() {
  const url = supabaseUrlInput.value.trim();
  const anon = supabaseKeyInput.value.trim();

  if (!url || !anon) {
    alert(t("fillCloudConfig"));
    return;
  }

  localStorage.setItem(CLOUD_URL_KEY, url);
  localStorage.setItem(CLOUD_ANON_KEY, anon);
  syncPanelOpen = true;
  setSyncPanelOpen(true);
  setCloudPanelOpen(true);
  updateSyncPanelMode();
  initCloud();
}

async function sendMagicLink() {
  if (!supabaseClient) {
    alert(t("cloudConfigRequired"));
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  if (!email) {
    alert(t("fillEmail"));
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
    alert(t("sendMagicLinkFailed"));
    return;
  }

  alert(t("magicLinkSent"));
}

async function logoutCloud() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error(error);
    alert(t("logoutFailed"));
    return;
  }

  currentUser = null;
  setStatus(t("cloudConfiguredNoAuth"));
  if (!hasCloudConfig()) {
    syncPanelOpen = false;
    setSyncPanelOpen(false);
  }
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
  setStatus(t("syncing"));

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

    const mode = manual ? t("syncedManual") : t("synced");
    setStatus(`${mode}: ${formatDate(now())}`);
  } catch (error) {
    console.error(error);
    setStatus(t("syncError"));
    if (manual) {
      alert(t("manualSyncFailed"));
    }
  } finally {
    syncInFlight = false;
  }
}

taskInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  createTaskFromInput();
});

sortSelect?.addEventListener("change", () => {
  localStorage.setItem(SORT_KEY, sortSelect.value);
  renderTasks();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    localStorage.setItem(FILTER_KEY, currentFilter);
    renderTasks();
  });
});

languageSelect?.addEventListener("change", () => {
  currentLanguage = languageSelect.value;
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
  renderTasks();
});

archiveBtn?.addEventListener("click", archiveCompleted);
notifyBtn?.addEventListener("click", askNotificationPermission);
addTaskBtn?.addEventListener("click", createTaskFromInput);
toggleSyncPanelBtn?.addEventListener("click", () => setSyncPanelOpen(!syncPanelOpen));
toggleCloudBtn?.addEventListener("click", () => setCloudPanelOpen(!cloudPanelOpen));

saveCloudBtn?.addEventListener("click", saveCloudConfig);
emailLoginBtn?.addEventListener("click", sendMagicLink);
logoutBtn?.addEventListener("click", logoutCloud);
syncNowBtn?.addEventListener("click", () => syncWithCloud({ manual: true }));
