    /**
     * YANA OS - ADMIN PORTAL ENGINE (Phases 3 & 4)
     */

    // --- Configuration ---
    const CONFIG = {
      API_BASE_URL: "https://yana-tech-project-backend-d0sj.onrender.com",
      TOKEN_KEY: "yana_os_token",
      LOGIN_URL: "../login.html",
    };

    // --- State Management ---
    const state = {
      user: null,
      // Read from sessionStorage or default to 'dashboard' / 'employees'
      adminView: sessionStorage.getItem("lastAdminView") || "projects",
      workforceTab: sessionStorage.getItem("lastWorkforceTab") || "employees",
      allProjects: [],
      projectAssignmentsMap: {},
      projectFilter: "All",
      projectSearchTerm: "",
      allEmployees: [],
      allManagers: [],
      allAdmins: [],
      allRoles: [],
      allTasks: [],
      allAttendance: [],
      allLoginHistory: [],
      allLeaveRequests: [],
      allClients: [], // Formalized Client Registry
      attendanceTab: "logs", // 'logs', 'login', 'leave'
      adminDataLoaded: false,
      dashboardData: null,
      appShellRendered: false, // NEW: Tracks if layout is already drawn
      showIdleLeakageModal: false, // NEW: Capacity leakage modal overlay state
      hideFinancials: localStorage.getItem("yanaHideFinancials") === "true",

      // Phase 5: Project Command Center State
      activeProject: null,
      activeProjectTab: "overview",
      projectAssignments: [], // Fetched dynamically
      projectTimeline: [], // Fetched dynamically
      projectSRS: [], // Fetched dynamically

      // Client & Employee Command Center States
      activeClient: null,
      activeClientTab: "overview",
      activeEmployee: null,
      activeEmployeeTab: "overview",
      activeEmployeeAnalytics: null,
      activeEmployeeProjects: null,

      // Dashboard Local State
      isDailyReportVisible: false,
      dailyReportDataCache: null,
      isDashboardLoading: false,
      isEditingEmployee: false,
      revChartFilter: '12',
      incChartFilter: '12',
      profitChartYear: 'all',
      metadataTab: 'sprints',
    };

    // --- Chart Instances ---
    // Initialize Compact Table Mode on load if enabled
    if (localStorage.getItem('yanaCompactUI') === 'true') {
      document.body.classList.add('compact-table-mode');
    } else {
      document.body.classList.remove('compact-table-mode');
    }

    // --- Web Audio API Notification Sound Synthesizer ---
    window.playNotificationSound = function() {
      const isEnabled = localStorage.getItem('yanaAudioAlerts') !== 'false';
      if (!isEnabled) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } catch (err) {
        console.warn("Audio synthesis unavailable:", err);
      }
    };

    // --- Utilities ---
    function showToast(message, type = "info") {
      playNotificationSound();
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      let iconSvg = "";
      let bgColor = "";

      if (type === "error") {
        bgColor = "bg-brand-alert";
        iconSvg = `<i data-lucide="alert-circle" class="w-5 h-5 text-white"></i>`;
      } else if (type === "success") {
        bgColor = "bg-brand-accent";
        iconSvg = `<i data-lucide="check-circle-2" class="w-5 h-5 text-white"></i>`;
      } else {
        bgColor = "bg-slate-800";
        iconSvg = `<i data-lucide="info" class="w-5 h-5 text-white"></i>`;
      }

      toast.className = `toast-item toast-enter flex items-center p-4 rounded-lg shadow-lg text-white pointer-events-auto ${bgColor}`;
      toast.innerHTML = `<div class="mr-3">${iconSvg}</div><div class="font-medium text-sm flex-1">${message}</div><button onclick="this.parentElement.remove()" class="ml-4 opacity-80 hover:opacity-100"><i data-lucide="x" class="w-4 h-4"></i></button>`;
      container.appendChild(toast);
      lucide.createIcons();
      setTimeout(() => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    }

    function parseJwt(token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    }

    function formatCurrencyPlain(amount) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount || 0);
    }
    window.formatCurrencyPlain = formatCurrencyPlain;

    function formatCurrency(amount) {
      const formatted = formatCurrencyPlain(amount);
      return `<span class="blur-financial font-mono">${formatted}</span>`;
    }
    window.formatCurrency = formatCurrency;

    function formatNumberPlain(num) {
      const n = parseFloat(num || 0);
      if (isNaN(n)) return "0";
      if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
      if (n >= 1000) return (n / 1000).toFixed(1) + "K";
      return new Intl.NumberFormat("en-IN").format(n);
    }

    function formatNumber(num) {
      const formatted = formatNumberPlain(num);
      return `<span class="blur-financial font-mono">${formatted}</span>`;
    }

    window.toggleFinancialVisibility = function() {
      state.hideFinancials = !state.hideFinancials;
      localStorage.setItem("yanaHideFinancials", state.hideFinancials);
      document.body.classList.toggle("hide-financials", state.hideFinancials);

      const btnText = document.getElementById("financial-toggle-text");
      const btnIcon = document.getElementById("financial-toggle-icon");
      if (btnText) {
        btnText.innerText = state.hideFinancials ? "Show Financials" : "Hide Financials";
      }
      if (btnIcon) {
        btnIcon.setAttribute("data-lucide", state.hideFinancials ? "eye-off" : "eye");
      }
      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

    function round(value, decimals = 0) {
      const multiplier = Math.pow(10, decimals);
      return Math.round(value * multiplier) / multiplier;
    }

    // --- Global Modal Engine ---
    function openModal(title, contentHtml) {
      const modal = document.getElementById("global-modal");
      const content = document.getElementById("modal-content");

      content.innerHTML = `
                <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                    <h3 class="text-xl font-bold text-slate-800">${title}</h3>
                    <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div class="p-6 max-h-[80vh] overflow-y-auto">
                    ${contentHtml}
                </div>
            `;

      modal.classList.remove("hidden");
      modal.classList.add("flex");
      lucide.createIcons();
      setTimeout(() => {
        modal.classList.remove("opacity-0");
        content.classList.remove("scale-95");
      }, 10);
    }

    function closeModal() {
      const modal = document.getElementById("global-modal");
      const content = document.getElementById("modal-content");

      modal.classList.add("opacity-0");
      content.classList.add("scale-95");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        content.innerHTML = "";
      }, 300);
    }

    function openSecondaryModal(title, contentHtml) {
      const modal = document.getElementById("secondary-modal");
      const content = document.getElementById("secondary-modal-content");

      content.innerHTML = `
                <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                    <h3 class="text-lg font-bold text-slate-800">${title}</h3>
                    <button onclick="closeSecondaryModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-6 max-h-[85vh] overflow-y-auto">
                    ${contentHtml}
                </div>
            `;

      modal.classList.remove("hidden");
      modal.classList.add("flex");
      lucide.createIcons();
      setTimeout(() => {
        modal.classList.remove("opacity-0");
        content.classList.remove("scale-95");
      }, 10);
    }

    function closeSecondaryModal() {
      const modal = document.getElementById("secondary-modal");
      const content = document.getElementById("secondary-modal-content");

      modal.classList.add("opacity-0");
      content.classList.add("scale-95");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        content.innerHTML = "";
      }, 300);
    }

    function customConfirm(
      title,
      message,
      confirmText = "Confirm",
      cancelText = "Cancel",
      isDanger = false,
    ) {
      return new Promise((resolve) => {
        const btnClass = isDanger
          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
          : "bg-brand-primary hover:bg-indigo-600 text-white shadow-indigo-500/20";
        const iconStr = isDanger
          ? '<i data-lucide="alert-triangle" class="w-6 h-6 text-rose-500"></i>'
          : '<i data-lucide="help-circle" class="w-6 h-6 text-brand-primary"></i>';

        const html = `
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-full ${isDanger ? "bg-rose-100" : "bg-indigo-50"} flex items-center justify-center shrink-0">
                            ${iconStr}
                        </div>
                        <div class="flex-1">
                            <p class="text-slate-600 mb-6 text-sm">${message}</p>
                            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" id="confirm-cancel-btn" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">${cancelText}</button>
                                <button type="button" id="confirm-ok-btn" class="px-5 py-2 ${btnClass} rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                                    ${confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
        openModal(title, html);

        document
          .getElementById("confirm-cancel-btn")
          .addEventListener("click", () => {
            closeModal();
            resolve(false);
          });
        document
          .getElementById("confirm-ok-btn")
          .addEventListener("click", () => {
            closeModal();
            resolve(true);
          });
      });
    }

    function customAlert(title, message) {
      return new Promise((resolve) => {
        const html = `
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <i data-lucide="info" class="w-6 h-6 text-brand-primary"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-slate-600 mb-6 text-sm">${message}</p>
                            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" id="alert-ok-btn" class="px-5 py-2 bg-brand-primary hover:bg-indigo-600 text-white shadow-indigo-500/20 rounded-lg font-medium shadow-sm transition-all">
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                `;
        openModal(title, html);

        document
          .getElementById("alert-ok-btn")
          .addEventListener("click", () => {
            closeModal();
            resolve(true);
          });
      });
    }

    // --- API Wrapper ---
    const activeRequestsCache = new Map();
    async function apiFetch(endpoint, options = {}) {
      const method = (options.method || "GET").toUpperCase();

      if (method === "GET") {
        if (activeRequestsCache.has(endpoint)) {
          return activeRequestsCache.get(endpoint);
        }

        const promise = (async () => {
          const token = localStorage.getItem(CONFIG.TOKEN_KEY);
          const headers = { ...options.headers };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          if (
            !headers["Content-Type"] &&
            !(options.body instanceof FormData) &&
            typeof options.body !== "string"
          ) {
            headers["Content-Type"] = "application/json";
            if (options.body) options.body = JSON.stringify(options.body);
          }

          try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
              ...options,
              headers,
            });
            if (response.status === 401) {
              logout(false);
              throw new Error("Session expired.");
            }
            const data = await response.json().catch(() => ({}));
            if (!response.ok)
              throw new Error(
                data.detail ||
                  data.error ||
                  data.critical_error ||
                  "An unexpected error occurred.",
              );
            return data;
          } catch (error) {
            if (error.message === "Failed to fetch")
              showToast("Unable to connect to the server.", "error");
            throw error;
          } finally {
            activeRequestsCache.delete(endpoint);
          }
        })();

        activeRequestsCache.set(endpoint, promise);
        return promise;
      }

      const token = localStorage.getItem(CONFIG.TOKEN_KEY);
      const headers = { ...options.headers };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (
        !headers["Content-Type"] &&
        !(options.body instanceof FormData) &&
        options.body !== undefined && options.body !== null
      ) {
        headers["Content-Type"] = "application/json";
        if (typeof options.body !== "string") {
          options.body = JSON.stringify(options.body);
        }
      }

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        if (response.status === 401) {
          logout(false);
          throw new Error("Session expired.");
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          let errMsg = "An unexpected error occurred.";
          if (data) {
            if (typeof data.detail === "string") {
              errMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
              errMsg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
            } else if (typeof data.error === "string") {
              errMsg = data.error;
            } else if (typeof data.critical_error === "string") {
              errMsg = data.critical_error;
            } else if (data.detail && typeof data.detail === "object") {
              errMsg = JSON.stringify(data.detail);
            }
          }
          throw new Error(errMsg);
        }
        return data;
      } catch (error) {
        if (error.message === "Failed to fetch")
          showToast("Unable to connect to the server.", "error");
        throw error;
      }
    }

    // --- Auth Actions ---
    async function logout(showNotification = true) {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      if (showNotification)
        await customAlert("Logged Out", "Logged out successfully");
      window.location.href = CONFIG.LOGIN_URL;
    }

    // --- Admin Data Loaders ---
    const lazyLoadedViews = {};

    async function lazyLoadViewData(view) {
      if (lazyLoadedViews[view]) return;
      try {
        if (view === "projects") {
          const [projects, clients, assignmentsMap, admins, employees] = await Promise.all([
            apiFetch("/projects/all").catch(() => []),
            apiFetch("/clients/all").catch(() => []),
            apiFetch("/projects/assignments/all").catch(() => ({})),
            apiFetch("/admins/all").catch(() => []),
            apiFetch("/employees/all").catch(() => [])
          ]);
          state.allProjects = Array.isArray(projects) ? projects : [];
          state.allClients = Array.isArray(clients) ? clients : [];
          state.projectAssignmentsMap = assignmentsMap || {};
          if (Array.isArray(admins) && admins.length > 0) state.allAdmins = admins;
          if (Array.isArray(employees) && employees.length > 0) state.allEmployees = employees;
        } else if (view === "workforce") {
          const [employees, admins, roles] = await Promise.all([
            apiFetch("/employees/all").catch(() => []),
            apiFetch("/admins/all").catch(() => []),
            apiFetch("/departments-roles/all").catch(() => [])
          ]);
          state.allEmployees = Array.isArray(employees) ? employees : [];
          state.allAdmins = Array.isArray(admins) ? admins : [];
          state.allRoles = Array.isArray(roles) ? roles : [];
        } else if (view === "attendance") {
          const [attendance, loginHistory, leaveRequests, holidays, employees] = await Promise.all([
            apiFetch("/attendance/all").catch(() => []),
            apiFetch("/attendance/login-history").catch(() => []),
            apiFetch("/attendance/leave-requests").catch(() => []),
            apiFetch("/attendance/holidays").catch(() => []),
            apiFetch("/employees/all").catch(() => [])
          ]);
          state.allAttendance = Array.isArray(attendance) ? attendance : [];
          state.allLoginHistory = Array.isArray(loginHistory) ? loginHistory : [];
          state.allLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
          state.holidays = Array.isArray(holidays) ? holidays : [];
          if (Array.isArray(employees) && employees.length > 0) {
            state.allEmployees = employees;
          }
        } else if (view === "clients") {
          const [clients, projects] = await Promise.all([
            apiFetch("/clients/all").catch(() => []),
            apiFetch("/projects/all").catch(() => [])
          ]);
          state.allClients = Array.isArray(clients) ? clients : [];
          state.allProjects = Array.isArray(projects) ? projects : [];
        } else if (view === "timesheets") {
          const [tasks, employees, projects] = await Promise.all([
            apiFetch("/tasks/all").catch(() => []),
            apiFetch("/employees/all").catch(() => []),
            apiFetch("/projects/all").catch(() => [])
          ]);
          state.allTasks = Array.isArray(tasks) ? tasks : [];
          state.allEmployees = Array.isArray(employees) ? employees : [];
          state.allProjects = Array.isArray(projects) ? projects : [];
        } else if (view === "obligations") {
          const obligations = await apiFetch("/obligations/all").catch(() => []);
          state.allObligations = Array.isArray(obligations) ? obligations : [];
        }
        
        lazyLoadedViews[view] = true;
        if (state.adminView === view) renderAdminApp();
      } catch (error) {
        console.error(`Failed to lazy load data for ${view}:`, error);
        lazyLoadedViews[view] = false; 
      }
    }

    async function loadAdminWorkspaceData() {
       // A CRUD operation occurred. Invalidate all cached views.
       for (let key in lazyLoadedViews) {
           lazyLoadedViews[key] = false;
       }
       // Refetch current view immediately
       const currentView = state.adminView;
       if (currentView && currentView !== 'dashboard') {
         await lazyLoadViewData(currentView);
       } else if (currentView === 'dashboard') {
         state.dashboardData = null; // Force refresh
         isDashboardLoading = false;
         await loadDashboardData();
       }
    }

    let isDashboardLoading = false;
    

    // --- Routing Engine ---
    async function routeApp(view = null, tab = null) {
      if (view) {
        state.adminView = view;
        sessionStorage.setItem("lastAdminView", view); // Save View

        // ARCHITECTURE FIX: Clear activeProject if we navigate away from projects
        if (view !== "projects") {
          state.activeProject = null;
          sessionStorage.removeItem("lastActiveProjectId");
          sessionStorage.removeItem("lastActiveProjectTab");
        }
        if (view !== "clients") state.activeClient = null;
        if (view !== "workforce") state.activeEmployee = null;

        // Close mobile sidebar on navigation
        const sidebar = document.getElementById("main-sidebar");
        if (
          sidebar &&
          !sidebar.classList.contains("-translate-x-full") &&
          window.innerWidth < 768
        ) {
          toggleMobileSidebar();
        }
      }
      if (tab) {
        if (view === "workforce") {
          state.workforceTab = tab;
          sessionStorage.setItem("lastWorkforceTab", tab); // Save Tab
          state.activeEmployee = null; // Clear active employee when switching workforce tabs
        } else if (view === "attendance") {
          state.attendanceTab = tab;
          sessionStorage.setItem("lastAttendanceTab", tab); // Save Tab
        }
      }
      const appDiv = document.getElementById("app");
      const renderLoader = (msg) => {
        appDiv.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-slate-50"><div class="flex flex-col items-center"><i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary mb-4"></i><p class="text-slate-500 font-medium">${msg}</p></div></div>`;
        lucide.createIcons();
      };

      if (!state.adminDataLoaded) {
        state.adminDataLoaded = true; // Prevents re-triggering while loading
      }

      if (state.adminView === "projects" && !state.activeProject) {
        const lastProjectId = sessionStorage.getItem("lastActiveProjectId");
        if (lastProjectId) {
          const lastProjectTab = sessionStorage.getItem("lastActiveProjectTab") || "overview";
          state.activeProjectTab = lastProjectTab;
          const p = state.allProjects.find(
            (x) => String(x.id) === String(lastProjectId),
          );
          if (p) {
            state.activeProject = p;
            try {
              const [assignRes, timelineRes, srsRes, expenseRes, paymentRes, receivablesRes] =
                await Promise.all([
                  apiFetch(`/projects/assignments/${lastProjectId}`).catch(() => []),
                  apiFetch(`/projects/timeline/${lastProjectId}`).catch(() => []),
                  apiFetch(`/projects/srs/get_by_project/${lastProjectId}`).catch(() => []),
                  apiFetch(`/projects/expenses/${lastProjectId}`).catch(() => []),
                  apiFetch(`/projects/payments/${lastProjectId}`).catch(() => []),
                  apiFetch(`/projects/receivables/${lastProjectId}`).catch(() => [])
                ]);
              state.projectAssignments = Array.isArray(assignRes) ? assignRes : [];
              state.projectTimeline = Array.isArray(timelineRes) ? timelineRes : [];
              state.projectSRS = Array.isArray(srsRes) ? srsRes : [];
              state.projectExpenses = Array.isArray(expenseRes) ? expenseRes : [];
              state.activeProjectPayments = Array.isArray(paymentRes) ? paymentRes : [];
              state.projectReceivables = Array.isArray(receivablesRes) ? receivablesRes : [];
              state.activeSrsId = null;
            } catch (err) {
              console.error("Failed to restore project details:", err);
            }
          }
        }
      }

      // Phase 4: Non-Blocking Optimistic Routing Engine (0ms Section Switch)
      renderAdminApp();

      if (state.adminView === "dashboard") {
        if (!state.dashboardData) {
          loadDashboardData().then(() => {
            if (state.adminView === "dashboard") renderAdminApp();
          });
        }
      } else if (state.adminView) {
        lazyLoadViewData(state.adminView).then(() => {
          if (state.adminView) renderAdminApp();
        });
      }

      setTimeout(() => {
        if (window.checkPendingObligationAlerts) {
          window.checkPendingObligationAlerts("Admin");
        }
      }, 500);
    }

    // --- Search Handlers ---
    window.fetchCustomAttendanceData = async function() {
        const startDate = document.getElementById("attendanceStartDate")?.value;
        const endDate = document.getElementById("attendanceEndDate")?.value;
        const tab = state.attendanceTab || "logs";

        if (!startDate || !endDate) {
            showToast("Please select both start and end dates.", "warning");
            return;
        }

        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin inline-block"></i>`;
        lucide.createIcons();
        btn.disabled = true;

        try {
            if (tab === "logs") {
                state.allAttendance = await apiFetch(`/attendance/all?start_date=${startDate}&end_date=${endDate}`);
            } else if (tab === "login") {
                state.allLoginHistory = await apiFetch(`/attendance/login-history?start_date=${startDate}&end_date=${endDate}`);
            } else if (tab === "leave") {
                state.allLeaveRequests = await apiFetch(`/attendance/leave-requests?start_date=${startDate}&end_date=${endDate}`);
            }
            renderAdminApp();
            showToast("Custom date range fetched successfully!", "success");
        } catch (err) {
            showToast("Failed to fetch custom date range.", "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    window.handleAdminEmpSearchDOM = function (val) {
      state.empSearchTerm = val;
      renderAdminApp();
    };

    window.handleSidebarSearch = function (val) {
      state.sidebarSearch = val;
      renderAdminApp();
      const inp = document.getElementById("sidebarSearch");
      if (inp) {
        inp.focus();
        inp.selectionStart = inp.selectionEnd = inp.value.length;
      }
    };

    window.handleAdminRoleSearchDOM = function (val) {
      const st = val.toLowerCase();
      document.querySelectorAll(".role-row-item").forEach((row) => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(st) ? "" : "none";
      });
    };

    // ==========================================
    //         PHASE 3 & 4: ADMIN UI ENGINE
    // ==========================================

    function renderAdminApp() {
      document.body.classList.toggle("hide-financials", state.hideFinancials);
      const appDiv = document.getElementById("app");
      let contentHtml = "";

      // Get the HTML for the currently selected view
      if (state.adminView === "dashboard")
        contentHtml = getAdminDashboardTemplate();
      else if (state.adminView === "projects")
        contentHtml = getAdminProjectsTemplate();
      else if (state.adminView === "clients")
        contentHtml = getAdminClientsTemplate();
      else if (state.adminView === "workforce")
        contentHtml = getAdminWorkforceTemplate();
      else if (state.adminView === "attendance")
        contentHtml = getAdminAttendanceTemplate();
      else if (state.adminView === "timesheets")
        contentHtml = getAdminTimesheetsTemplate();
      else if (state.adminView === "profile")
        contentHtml = getAdminProfileTemplate();
      else if (state.adminView === "activity_logs")
        contentHtml = getAdminActivityLogsTemplate();
      else if (state.adminView === "obligations")
        contentHtml = getAdminObligationsTemplate();


      // ARCHITECTURE FIX: If the App Shell isn't drawn yet, draw everything.
      if (!state.appShellRendered) {
        const sidebarClass =
          localStorage.getItem("yanaSidebarCollapsed") === "true"
            ? "sidebar-collapsed"
            : "";
        appDiv.innerHTML = `
                    <div class="flex h-full w-full bg-slate-50 overflow-hidden relative">
                        <!-- Mobile Sidebar Overlay -->
                        <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden opacity-0 transition-opacity duration-300" onclick="toggleMobileSidebar()"></div>

                        <!-- Admin Sidebar -->
                        <aside id="main-sidebar" class="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-transform duration-300 z-50 fixed md:relative h-full -translate-x-full md:translate-x-0 border-r border-slate-800 ${sidebarClass}">
                            <div class="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 shrink-0">
                                <div class="w-8 h-8 bg-brand-accent rounded-md flex items-center justify-center mr-3 shadow-lg">
                                    <i data-lucide="shield" class="text-white w-5 h-5"></i>
                                </div>
                                <span class="font-bold text-white text-lg tracking-tight">Yana <span class="text-brand-accent font-normal">Admin</span></span>
                            </div>
                            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto" id="sidebar-nav">
                                <button onclick="routeApp('dashboard')" data-view="dashboard" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="pie-chart" class="w-5 h-5 mr-3"></i> <span class="font-medium">Dashboard</span>
                                </button>
                                <button onclick="routeApp('projects')" data-view="projects" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="folder-kanban" class="w-5 h-5 mr-3"></i> <span class="font-medium">Project Control</span>
                                </button>
                                <button onclick="routeApp('clients')" data-view="clients" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="briefcase" class="w-5 h-5 mr-3"></i> <span class="font-medium">Clients</span>
                                </button>
                                <button onclick="routeApp('workforce')" data-view="workforce" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="users" class="w-5 h-5 mr-3"></i> <span class="font-medium">Workforce</span>
                                </button>
                                <button onclick="routeApp('attendance', 'logs')" data-view="attendance-logs" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="calendar" class="w-5 h-5 mr-3"></i> <span class="font-medium">Attendance Logs</span>
                                </button>
                                <button onclick="routeApp('attendance', 'login')" data-view="attendance-login" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="shield-check" class="w-5 h-5 mr-3"></i> <span class="font-medium">Login History</span>
                                </button>
                                <button onclick="routeApp('attendance', 'leave')" data-view="attendance-leave" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="calendar-days" class="w-5 h-5 mr-3"></i> <span class="font-medium">Leave Requests</span>
                                </button>
                                <button onclick="routeApp('timesheets')" data-view="timesheets" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="book-open" class="w-5 h-5 mr-3"></i> <span class="font-medium">Financial Ledger</span>
                                </button>
                                <button onclick="routeApp('obligations')" data-view="obligations" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="receipt" class="w-5 h-5 mr-3"></i> <span class="font-medium">Office Bills & Rent</span>
                                </button>
                                <button onclick="routeApp('activity_logs')" data-view="activity_logs" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="file-text" class="w-5 h-5 mr-3"></i> <span class="font-medium">Activity Logger</span>
                                </button>
                                <button onclick="routeApp('profile')" data-view="profile" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="user" class="w-5 h-5 mr-3"></i> <span class="font-medium">My Profile</span>
                                </button>

                            </nav>
                            <div class="p-4 border-t border-slate-800">
                                <button onclick="logout()" class="w-full flex items-center px-4 py-3 rounded-xl hover:bg-brand-alert hover:text-white transition-all group">
                                    <i data-lucide="log-out" class="w-5 h-5 mr-3 group-hover:text-white text-slate-400 transition-colors"></i> <span class="font-medium">Logout</span>
                                </button>
                            </div>
                        </aside>

                        <!-- Main Content -->
                        <div class="flex-1 flex flex-col overflow-hidden relative">
                            <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 z-10 shadow-sm">
                                <div class="flex items-center gap-3">
                                    <button onclick="toggleMobileSidebar()" aria-label="Toggle Navigation Sidebar" class="text-slate-500 hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg">
                                        <i data-lucide="menu" class="w-6 h-6" aria-hidden="true"></i>
                                    </button>
                                    <h2 id="header-title" class="text-xl font-bold text-slate-800 tracking-tight capitalize">
                                        ${state.adminView === "dashboard" ? "Executive Dashboard" : state.adminView.replace("-", " ")}
                                    </h2>
                                </div>
                                <div class="flex items-center gap-3 md:gap-4">
                                    <button onclick="toggleFinancialVisibility()" id="financial-toggle-btn" aria-label="Toggle Financial Data Visibility" class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors select-none shadow-sm focus-visible:ring-2 focus-visible:ring-brand-primary">
                                        <i data-lucide="${state.hideFinancials ? 'eye-off' : 'eye'}" id="financial-toggle-icon" class="w-4 h-4 text-slate-500" aria-hidden="true"></i>
                                        <span id="financial-toggle-text">${state.hideFinancials ? 'Show Financials' : 'Hide Financials'}</span>
                                    </button>

                                    <!-- Notification Bell & Panel Dropdown -->
                                    <div class="relative" id="admin-notif-wrapper">
                                        <button onclick="window.toggleAdminNotificationPanel()" aria-label="System Notifications & Payment Reminders" class="relative p-2 text-slate-600 hover:text-brand-primary bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer" title="System Notifications & Payment Reminders">
                                            <i data-lucide="bell" class="w-5 h-5" aria-hidden="true"></i>
                                            <span id="admin-notif-count" aria-live="polite" class="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs hidden">0</span>
                                        </button>

                                        <!-- Notification Dropdown Panel -->
                                        <div id="admin-notif-dropdown" class="absolute right-0 mt-2 w-80 sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 hidden overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div class="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                                                <div class="flex items-center gap-2">
                                                    <i data-lucide="bell-ring" class="w-4 h-4 text-indigo-400"></i>
                                                    <h3 class="text-xs font-bold uppercase tracking-wider">Notifications & Payments</h3>
                                                </div>
                                                <button onclick="window.markAllAdminNotificationsRead()" class="text-[10px] font-bold text-indigo-300 hover:text-white transition-colors cursor-pointer">
                                                    Mark all read
                                                </button>
                                            </div>

                                            <!-- Category Filter Bar -->
                                            <div class="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
                                                <button onclick="window.setAdminNotifFilter('all')" id="notif-tab-all" class="px-2.5 py-1 rounded-lg font-bold bg-white text-brand-primary shadow-2xs border border-slate-200 transition-all cursor-pointer">All (<span id="cnt-all">0</span>)</button>
                                                <button onclick="window.setAdminNotifFilter('payment')" id="notif-tab-payment" class="px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:bg-white/80 transition-all cursor-pointer">💰 Payments (<span id="cnt-payment">0</span>)</button>
                                                <button onclick="window.setAdminNotifFilter('risk')" id="notif-tab-risk" class="px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:bg-white/80 transition-all cursor-pointer">⚠️ Risks (<span id="cnt-risk">0</span>)</button>
                                                <button onclick="window.setAdminNotifFilter('leave')" id="notif-tab-leave" class="px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:bg-white/80 transition-all cursor-pointer">📅 Leaves (<span id="cnt-leave">0</span>)</button>
                                            </div>

                                            <div id="admin-notif-list" class="max-h-96 overflow-y-auto divide-y divide-slate-100 bg-white">
                                                <div class="p-6 text-center text-slate-400 text-xs font-medium">
                                                    <i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400"></i>
                                                    Loading notifications...
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="text-right hidden sm:block">
                                        <p class="text-sm font-bold text-slate-800">${state.user.sub}</p>
                                        <p class="text-xs text-brand-primary font-medium uppercase tracking-wider">${state.user?.access_level === "SystemAdmin" ? "System Administrator" : state.user?.access_level === "ManagerAdmin" ? "Manager Admin" : "HR Admin"}</p>
                                    </div>
                                    <div class="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
                                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                                    </div>
                                </div>
                            </header>

                            <main class="flex-1 overflow-y-auto p-4 md:p-8" id="main-scroll-area">
                                <div class="max-w-7xl mx-auto" id="dynamic-content-area">
                                    ${contentHtml}
                                </div>
                            </main>
                        </div>
                    </div>
                `;
        state.appShellRendered = true;
      } else {
        // ARCHITECTURE FIX: Shell exists. Just swap the inner content.
        const dynamicArea = document.getElementById("dynamic-content-area");
        if (dynamicArea) {
          dynamicArea.innerHTML = contentHtml;

          document.getElementById("header-title").innerText =
            state.adminView === "dashboard"
              ? "Executive Dashboard"
              : state.adminView.replace("-", " ");

          document.querySelectorAll(".nav-btn").forEach((btn) => {
            const btnView = btn.getAttribute("data-view");
            let isActive = false;
            if (btnView === "attendance-logs") {
              isActive = state.adminView === "attendance" && state.attendanceTab === "logs";
            } else if (btnView === "attendance-login") {
              isActive = state.adminView === "attendance" && state.attendanceTab === "login";
            } else if (btnView === "attendance-leave") {
              isActive = state.adminView === "attendance" && state.attendanceTab === "leave";
            } else {
              isActive = btnView === state.adminView;
            }

            if (isActive) {
              btn.className =
                "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all bg-brand-primary text-white shadow-md";
            } else {
              btn.className =
                "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white text-slate-300";
            }
          });

          if (window.lucide) lucide.createIcons();
          initChartsIfApplicable();
          updateCapacityLeakageModalDOM();
          if (state.adminView === "projects" && typeof renderAdminProjectsTable === "function") {
            renderAdminProjectsTable();
          }
          return; // EXIT EARLY so we don't double-trigger below
        }
      }

      // This block ONLY runs on the true first render
      document.querySelectorAll(".nav-btn").forEach((btn) => {
        const btnView = btn.getAttribute("data-view");
        let isActive = false;
        if (btnView === "attendance-logs") {
          isActive = state.adminView === "attendance" && state.attendanceTab === "logs";
        } else if (btnView === "attendance-login") {
          isActive = state.adminView === "attendance" && state.attendanceTab === "login";
        } else if (btnView === "attendance-leave") {
          isActive = state.adminView === "attendance" && state.attendanceTab === "leave";
        } else {
          isActive = btnView === state.adminView;
        }

        if (isActive) {
          btn.className =
            "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all bg-brand-primary text-white shadow-md";
        } else {
          btn.className =
            "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white text-slate-300";
        }
      });

      if (window.lucide) lucide.createIcons();
      initChartsIfApplicable();
      updateCapacityLeakageModalDOM();
      if (state.adminView === "projects" && typeof renderAdminProjectsTable === "function") {
        renderAdminProjectsTable();
      }
    }

    // Helper to delay chart/table rendering until DOM is painted
    

    window.changeDashboardFilter = function (filterId, value) {
      state[filterId] = value;
      renderAdminApp();
    };

    window.openIdleLeakageModal = function () {
      state.showIdleLeakageModal = true;
      renderAdminApp();
    };

    window.closeIdleLeakageModal = function () {
      state.showIdleLeakageModal = false;
      renderAdminApp();
    };

    window.highlightNotificationCenter = function () {
      const notifSection = document.getElementById('executive-notifications-section');
      if (notifSection) {
        notifSection.scrollIntoView({ behavior: 'smooth' });
        notifSection.classList.add('ring-4', 'ring-rose-500/20', 'border-rose-300');
        setTimeout(() => {
          notifSection.classList.remove('ring-4', 'ring-rose-500/20', 'border-rose-300');
        }, 3000);
      }
    };

    window.drillToEmployeeProfile = function (empId) {
      state.showIdleLeakageModal = false;
      state.adminView = "workforce";
      state.workforceTab = "employees";
      const emp = state.allEmployees.find(e => e.id == empId);
      if (emp) {
        state.activeEmployee = emp;
        state.activeEmployeeTab = "overview";
        state.activeEmployeeAnalytics = null;
        state.activeEmployeeProjects = null;
        state.isEditingEmployee = false;
      }
      renderAdminApp();
    };

    function getCapacityLeakageModalHtml() {
      const analyticsSuite = state.dashboardData?.analyticsSuite || {};
      const leakageDetails = analyticsSuite.idle_leakage_details || [];
      const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(num);
      const totalLeakage = analyticsSuite.idle_cost_leakage || 0;
      const meta = analyticsSuite.meta || {};
      const workingDays = meta.working_days_mtd || 21;
      const expectedHours = meta.expected_hours || 168;

      let rowsHtml = leakageDetails.map(emp => {
        let utilColorClass = 'bg-rose-500';
        let utilTextClass = 'text-rose-600 bg-rose-50 border-rose-100';
        if (emp.utilization >= 50) {
          utilColorClass = 'bg-amber-500';
          utilTextClass = 'text-amber-600 bg-amber-50 border-amber-100';
        } else if (emp.utilization >= 30) {
          utilColorClass = 'bg-rose-400';
          utilTextClass = 'text-rose-500 bg-rose-50 border-rose-100';
        }

        return `
            <tr class="border-b border-slate-100/80 hover:bg-slate-50/50 transition-colors">
              <td class="px-4 py-3.5">
                <div class="font-black text-slate-800 text-xs">${emp.employee_name}</div>
                <div class="text-[9px] font-mono text-slate-400 uppercase">ID: ${emp.employee_id.substring(0, 8)}...</div>
              </td>
              <td class="px-4 py-3.5">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">${emp.department}</span>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2">
                  <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="h-full ${utilColorClass} rounded-full" style="width: ${emp.utilization}%"></div>
                  </div>
                  <span class="px-1.5 py-0.5 rounded text-[8px] font-black border ${utilTextClass}">${emp.utilization}%</span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-right font-medium text-slate-700 text-xs">
                <div>${emp.idle_hours} <span class="text-[9px] text-slate-400">hrs</span></div>
                <div class="text-[8px] text-slate-400 font-bold uppercase tracking-wider">${emp.logged_hours} / ${emp.expected_hours} MTD</div>
              </td>
              <td class="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">
                ₹${formatNumber(emp.hourly_rate)}<span class="text-[9px] text-slate-400">/hr</span>
              </td>
              <td class="px-4 py-3.5 text-right font-black text-rose-600 text-xs">
                ₹${formatNumber(emp.leakage_cost)}
              </td>
              <td class="px-4 py-3.5 text-center">
                <button onclick="drillToEmployeeProfile('${emp.employee_id}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-brand-primary hover:text-white text-brand-primary text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 mx-auto">
                  <i data-lucide="user-cog" class="w-3.5 h-3.5"></i> Reassign
                </button>
              </td>
            </tr>
          `;
      }).join('');

      if (leakageDetails.length === 0) {
        rowsHtml = `
            <tr>
              <td colspan="7" class="text-center py-10">
                <div class="flex flex-col items-center">
                  <i data-lucide="check-circle" class="w-10 h-10 text-emerald-500 mb-2"></i>
                  <p class="text-xs font-black text-slate-700 uppercase tracking-widest">No Underutilized Resources Flagged</p>
                  <p class="text-[10px] text-slate-400 mt-1">All active team members are working above the 60% capacity threshold.</p>
                </div>
              </td>
            </tr>
          `;
      }

      return `
          <div class="bg-white/95 border border-white/60 shadow-2xl backdrop-blur-xl rounded-3xl max-w-4xl w-full p-6 md:p-8 flex flex-col max-h-[85vh] scale-95 transition-transform duration-300 transform translate-y-0 opacity-100 relative">
            
            <!-- Close Button -->
            <button onclick="closeIdleLeakageModal()" class="absolute right-6 top-6 w-9 h-9 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:scale-95 transition-all shadow-sm group">
              <i data-lucide="x" class="w-4 h-4 transition-transform group-hover:rotate-90"></i>
            </button>

            <!-- Header -->
            <div class="mb-5 pr-10">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 border border-rose-200/50">LEAKAGE AUDIT ENGINE</span>
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              </div>
              <h3 class="text-xl font-black text-slate-900 tracking-tight">Capacity Underutilization & Leakage Audit</h3>
              <p class="text-xs text-slate-500 font-medium mt-1">MTD breakdown of personnel with under 60% active logging, causing direct financial leakages.</p>
            </div>

            <!-- Total Leakage Banner -->
            <div class="mb-5 p-4 rounded-2xl bg-gradient-to-r from-rose-50/80 to-amber-50/50 border border-rose-100 flex items-center justify-between gap-4 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                  <i data-lucide="trending-up" class="w-5 h-5"></i>
                </div>
                <div>
                  <div class="text-[9px] font-black text-rose-500 uppercase tracking-widest">Active Leakage Burn</div>
                  <div class="text-sm font-medium text-slate-700 mt-0.5">Underutilized headcount is burning operating margin.</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[9px] font-black text-rose-500 uppercase tracking-widest">Total Monthly Runaway</div>
                <div class="text-xl font-black text-rose-700">₹${formatNumber(totalLeakage)}</div>
              </div>
            </div>

            <!-- Math/MTD Expected Hours Justification Card -->
            <div class="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
                  <i data-lucide="calculator" class="w-5 h-5"></i>
                </div>
                <div>
                  <h4 class="text-xs font-black text-slate-800 uppercase tracking-wide">MTD Capacity Standard</h4>
                  <p class="text-[10px] text-slate-500 font-medium">Month-to-Date expected hours threshold based on elapsed calendar days.</p>
                </div>
              </div>
              <div class="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm font-mono text-[11px] text-slate-700 shrink-0">
                <span class="font-black text-indigo-600">${workingDays} days elapsed</span>
                <span class="text-slate-300">×</span>
                <span class="font-black text-slate-800">8 hrs/day</span>
                <span class="text-slate-400 font-bold">=</span>
                <span class="font-black px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">${expectedHours} hrs expected</span>
              </div>
            </div>

            <!-- Scrollable Table -->
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-2xl bg-slate-50/20 mb-5 max-h-[40vh]">
              <table class="w-full border-collapse text-left">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky top-0 backdrop-blur z-10">
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Department</th>
                    <th class="px-4 py-3">MTD Utilization</th>
                    <th class="px-4 py-3 text-right">Idle Hours</th>
                    <th class="px-4 py-3 text-right">Cost Rate</th>
                    <th class="px-4 py-3 text-right">Burn Cost</th>
                    <th class="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Footer advice -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 mt-auto">
              <div class="flex items-center gap-2 text-slate-400">
                <i data-lucide="info" class="w-4 h-4 text-brand-primary shrink-0"></i>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Mitigation Advice: Immediately reassign to high-billing active portfolios.</p>
              </div>
              <button onclick="closeIdleLeakageModal()" class="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider transition-all hover:shadow-lg shadow-slate-950/20">
                Close Audit
              </button>
            </div>

          </div>
        `;
    }

    function updateCapacityLeakageModalDOM() {
      let modalEl = document.getElementById("capacity-leakage-modal-overlay");
      if (state.showIdleLeakageModal) {
        if (!modalEl) {
          modalEl = document.createElement("div");
          modalEl.id = "capacity-leakage-modal-overlay";
          modalEl.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all duration-300 opacity-0";
          document.body.appendChild(modalEl);
          modalEl.offsetHeight;
          modalEl.classList.remove("opacity-0");
        }
        modalEl.innerHTML = getCapacityLeakageModalHtml();
        if (window.lucide) lucide.createIcons();
      } else if (modalEl) {
        modalEl.classList.add("opacity-0");
        setTimeout(() => {
          modalEl.remove();
        }, 300);
      }
    }
    // ==========================================
    //         PHASE 4: DASHBOARD VIEWS
    // ==========================================

    



    async function toggleDailyReport() {
      state.isDailyReportVisible = !state.isDailyReportVisible;

      // Re-render the app to ensure all dynamic text, icons, and transitions are synced
      renderAdminApp();

      if (state.isDailyReportVisible) {
        if (!state.dailyReportDataCache) {
          await loadAndRenderDailyReport();
        }
      }
    }

    function getDailyReportHtml() {
      const data = state.dailyReportDataCache;
      if (!data) {
        return `
                <div class="h-64 flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <div class="relative">
                        <div class="absolute inset-0 bg-brand-primary/10 blur-xl rounded-full animate-pulse"></div>
                        <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary relative z-10"></i>
                    </div>
                    <div class="text-center">
                        <p class="text-slate-800 font-black tracking-tighter text-xl mb-1">Analyzing Workspace Data</p>
                        <p class="text-slate-400 font-medium text-xs">Synthesizing real-time productivity metrics...</p>
                    </div>
                </div>
            `;
      }

      const kpis = [
        { label: "Total Hours Logged", value: `${data.kpis.total_hours}h`, icon: "clock", color: "text-indigo-600", bg: "bg-indigo-50", grad: "premium-gradient-1" },
        { label: "Workforce Presence", value: data.kpis.employees_present, icon: "user-check", color: "text-emerald-600", bg: "bg-emerald-50", grad: "premium-gradient-2" },
        { label: "Average Utilization", value: `${data.kpis.utilization_percent}%`, icon: "zap", color: "text-amber-600", bg: "bg-amber-50", grad: "premium-gradient-4" },
        { label: "Urgent Attention", value: data.kpis.attention_count, icon: "alert-octagon", color: "text-rose-600", bg: "bg-rose-50", grad: "premium-gradient-3" }
      ];

      const kpiHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                ${kpis.map((k, i) => `
                    <div class="glass-card rounded-2xl p-5 shadow-sm border border-white/50 animate-in stagger-${i + 1} card-hover relative overflow-hidden group">
                        <div class="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 ${k.bg} rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                        <div class="relative z-10">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="p-2 rounded-lg ${k.bg} ${k.color}">
                                    <i data-lucide="${k.icon}" class="w-4 h-4"></i>
                                </div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">${k.label}</p>
                            </div>
                            <h3 class="text-3xl font-black text-slate-900 tracking-tighter">${k.value}</h3>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

      const employeeHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
                ${data.employees
          .map((e, i) => {
            const utilColor =
              e.utilization >= 100
                ? "bg-emerald-500 shadow-emerald-200"
                : e.utilization >= 80
                  ? "bg-indigo-500 shadow-indigo-200"
                  : "bg-rose-500 shadow-rose-200";

            const utilText = e.utilization >= 100 ? "Optimal" : e.utilization >= 80 ? "Steady" : "Underutilized";
            const utilBadge = e.utilization >= 100 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : e.utilization >= 80 ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-rose-50 text-rose-600 border-rose-100";

            return `
                        <div class="glass-card rounded-2xl p-6 shadow-sm border border-white/50 flex flex-col card-hover animate-in stagger-${(i % 4) + 1} relative group">
                            <div class="flex justify-between items-start mb-5">
                                <div>
                                    <h4 class="font-black text-slate-900 text-lg tracking-tight mb-1">${e.name}</h4>
                                    <span class="stat-pill ${utilBadge}">${utilText}</span>
                                </div>
                                <div class="text-right">
                                    <p class="text-xl font-black text-brand-primary tracking-tighter">${e.hours}<span class="text-[10px] ml-0.5 text-slate-400">h</span></p>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logged</p>
                                </div>
                            </div>
                            
                            <div class="mb-6">
                                <div class="flex justify-between items-end mb-1.5">
                                    <span class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Utilization</span>
                                    <span class="text-base font-black text-slate-900 tracking-tighter">${e.utilization}%</span>
                                </div>
                                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                                    <div class="${utilColor} h-full rounded-full transition-all duration-1000 shadow-lg" style="width: ${Math.min(e.utilization, 100)}%"></div>
                                </div>
                            </div>

                            <div class="flex-1 space-y-2">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Project Contributions</p>
                                ${e.projects
                .map(
                  (proj) => `
                                    <div class="flex justify-between items-center px-3 py-2 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-100 transition-colors group/proj">
                                        <div class="flex items-center gap-2">
                                            <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
                                            <span class="text-[11px] font-bold text-slate-600 group-hover/proj:text-slate-900 transition-colors">${proj.name}</span>
                                        </div>
                                        <span class="text-[11px] font-black text-indigo-600">${proj.hours}h</span>
                                    </div>
                                `,
                )
                .join("")}
                            </div>
                        </div>
                    `;
          })
          .join("")}
            </div>
        `;

      const projectHtml = `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-6">
                    <h4 class="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <div class="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <i data-lucide="folder-kanban" class="w-5 h-5"></i>
                        </div>
                        Global Project Velocity
                    </h4>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    ${data.project_overview
          .map((p, i) => {
            const gradients = [
              "from-indigo-600 to-violet-600",
              "from-emerald-500 to-teal-600",
              "from-rose-500 to-pink-600",
              "from-amber-500 to-orange-500",
              "from-blue-500 to-cyan-600",
            ];
            const grad = gradients[i % gradients.length];

            return `
                        <div class="glass-card rounded-2xl overflow-hidden shadow-sm border border-white/50 transition-all card-hover animate-in stagger-${(i % 4) + 1} flex flex-col">
                            <div class="bg-gradient-to-br ${grad} p-6 relative overflow-hidden group">
                                <div class="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div class="relative z-10 flex justify-between items-center">
                                    <h5 class="font-black text-white text-lg tracking-tight truncate pr-4 drop-shadow-md">${p.name}</h5>
                                    <div class="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl border border-white/30">
                                        <span class="font-black text-white text-base tracking-tighter">${p.share_percent}%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="p-6 space-y-5">
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Today</p>
                                        <p class="text-lg font-black text-slate-900 tracking-tight">${p.today}h</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Week</p>
                                        <p class="text-lg font-black text-slate-900 tracking-tight">${p.week}h</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Month</p>
                                        <p class="text-lg font-black text-slate-900 tracking-tight">${p.month}h</p>
                                    </div>
                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Year</p>
                                        <p class="text-lg font-black text-slate-900 tracking-tight">${p.year}h</p>
                                    </div>
                                </div>
                                <div class="pt-4 border-t border-slate-100 flex justify-between items-center">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <i data-lucide="infinity" class="w-3.5 h-3.5"></i>
                                        </div>
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime Log</span>
                                    </div>
                                    <span class="text-2xl font-black text-brand-primary tracking-tighter">${p.life}<span class="text-xs ml-0.5">h</span></span>
                                </div>
                            </div>
                        </div>
                        `;
          })
          .join("")}
                </div>
            </div>
        `;

      return `
            ${kpiHtml}
            <div class="flex items-center justify-between mb-8">
                <h4 class="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                    <div class="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <i data-lucide="users" class="w-6 h-6"></i>
                    </div>
                    Workforce Output
                </h4>
            </div>
            ${employeeHtml}
            ${projectHtml}
        `;
    }

    function renderDailyReportFromCache() {
      const dynamicArea = document.getElementById("daily-report-dynamic-area");
      if (!dynamicArea) return;
      dynamicArea.innerHTML = getDailyReportHtml();
      if (window.lucide) lucide.createIcons();
    }

    async function loadAndRenderDailyReport() {
      const dynamicArea = document.getElementById("daily-report-dynamic-area");
      if (!dynamicArea) return;

      if (!state.dailyReportDataCache) {
        dynamicArea.innerHTML = `
                <div class="h-64 flex flex-col items-center justify-center space-y-4">
                    <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-primary"></i>
                    <p class="text-slate-500 font-bold tracking-widest uppercase text-xs">Generating Report...</p>
                </div>
            `;
        if (window.lucide) lucide.createIcons();
      }

      try {
        const data = await apiFetch("/dashboard/daily-report");
        state.dailyReportDataCache = data;
        renderDailyReportFromCache();
      } catch (error) {
        console.error("Daily report fetch failed:", error);
        dynamicArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-12 text-rose-500">
                    <i data-lucide="alert-circle" class="w-10 h-10 mb-4"></i>
                    <p class="font-bold">Failed to load Daily Work Report.</p>
                </div>
            `;
        if (window.lucide) lucide.createIcons();
      }
    }

    function initDashboardCharts() {
      const data = state.dashboardData?.summary;
      if (!data || !data.charts) return;

      const destroyChart = (id) => {
        if (chartInstances[id]) chartInstances[id].destroy();
      };

      // Transition dropdown DOM references to the new reactive state variables
      const revLimit = state.revChartFilter === '6' ? 6 : 12;
      const incLimit = state.incChartFilter === '6' ? 6 : 12;
      const profitYear = state.profitChartYear || 'all';

      const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Helper to format currency values cleanly in Rupee style
      const formatRupee = (value) => {
        if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + ' Cr';
        if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + ' L';
        if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + ' k';
        return '₹' + value;
      };

      // Set global Chart.js font family
      if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = 'Inter';
      }

      // 1. Total Revenue Chart (Bar)
      destroyChart('revenue');
      const ctxRev = document.getElementById('chartRevenue');
      if (ctxRev && data.charts.monthly_revenue) {
        const ctx2d = ctxRev.getContext('2d');

        // Calculate period-specific sum and update the dynamic UI overlay
        const revData = data.charts.monthly_revenue.slice(0, revLimit);
        const totalRevSum = revData.reduce((a, b) => a + b, 0);
        const revSumEl = document.getElementById('revChartSum');
        if (revSumEl) {
          revSumEl.innerHTML = formatCurrency(totalRevSum);
        }

        // Create beautiful premium multi-stop linear gradient
        const gradient = ctx2d.createLinearGradient(0, 0, 0, ctxRev.clientHeight || 250);
        gradient.addColorStop(0, '#4f46e5'); // Rich Indigo
        gradient.addColorStop(0.5, '#6366f1'); // Bright Indigo-purple
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)'); // Seamless fade to transparent

        chartInstances['revenue'] = new Chart(ctxRev, {
          type: 'bar',
          data: {
            labels: monthLabels.slice(0, revLimit),
            datasets: [{
              label: 'Revenue',
              data: revData,
              backgroundColor: gradient,
              borderColor: '#4f46e5',
              borderWidth: 1.5,
              borderRadius: 6,
              hoverBackgroundColor: '#4f46e5',
              hoverBorderWidth: 2,
              hoverBorderColor: '#6366f1'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                '-webkit-backdropFilter': 'blur(12px)',
                titleColor: '#f8fafc',
                titleFont: { family: 'Inter', weight: '700', size: 12 },
                bodyColor: '#e2e8f0',
                bodyFont: { family: 'Inter', weight: '600', size: 11 },
                padding: 12,
                borderRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                shadowColor: 'rgba(0, 0, 0, 0.25)',
                shadowBlur: 10,
                callbacks: {
                  label: function (context) {
                    return ' ' + context.dataset.label + ': ' + formatCurrencyPlain(context.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  display: false
                },
                ticks: {
                  callback: formatRupee,
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              }
            }
          }
        });
      }

      // 2. Total Income vs Pending (Bar)
      destroyChart('incPending');
      const ctxInc = document.getElementById('chartIncomePending');
      if (ctxInc && data.charts.monthly_income && data.charts.monthly_pending) {
        const ctx2d = ctxInc.getContext('2d');

        // Calculate sums and update UI text indicators
        const incData = data.charts.monthly_income.slice(0, incLimit);
        const penData = data.charts.monthly_pending.slice(0, incLimit);
        const totalIncSum = incData.reduce((a, b) => a + b, 0);
        const totalPenSum = penData.reduce((a, b) => a + b, 0);

        const incSumEl = document.getElementById('incChartSum');
        const penSumEl = document.getElementById('incChartPendingSum');
        if (incSumEl) incSumEl.innerHTML = formatCurrency(totalIncSum);
        if (penSumEl) penSumEl.innerHTML = formatCurrency(totalPenSum);

        // Emerald green gradient for income
        const gradientInc = ctx2d.createLinearGradient(0, 0, 0, ctxInc.clientHeight || 250);
        gradientInc.addColorStop(0, '#10b981');
        gradientInc.addColorStop(0.5, '#34d399');
        gradientInc.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

        // Rose pink/red gradient for pending
        const gradientPen = ctx2d.createLinearGradient(0, 0, 0, ctxInc.clientHeight || 250);
        gradientPen.addColorStop(0, '#f43f5e');
        gradientPen.addColorStop(0.5, '#fb7185');
        gradientPen.addColorStop(1, 'rgba(244, 63, 94, 0.05)');

        chartInstances['incPending'] = new Chart(ctxInc, {
          type: 'bar',
          data: {
            labels: monthLabels.slice(0, incLimit),
            datasets: [
              {
                label: 'Income',
                data: incData,
                backgroundColor: gradientInc,
                borderColor: '#10b981',
                borderWidth: 1.5,
                borderRadius: 6,
                hoverBackgroundColor: '#10b981'
              },
              {
                label: 'Pending',
                data: penData,
                backgroundColor: gradientPen,
                borderColor: '#f43f5e',
                borderWidth: 1.5,
                borderRadius: 6,
                hoverBackgroundColor: '#f43f5e'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  boxWidth: 6,
                  padding: 20,
                  color: '#475569',
                  font: { family: 'Inter', weight: '600', size: 11 }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                '-webkit-backdropFilter': 'blur(12px)',
                titleColor: '#f8fafc',
                titleFont: { family: 'Inter', weight: '700', size: 12 },
                bodyColor: '#e2e8f0',
                bodyFont: { family: 'Inter', weight: '600', size: 11 },
                padding: 12,
                borderRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: function (context) {
                    return ' ' + context.dataset.label + ': ' + formatCurrencyPlain(context.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  display: false
                },
                ticks: {
                  callback: formatRupee,
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              }
            }
          }
        });
      }

      // 3. Dept P&L (Bar)
      destroyChart('deptPl');
      const ctxDept = document.getElementById('chartDeptPL');
      if (ctxDept && data.charts.dept_pl) {
        chartInstances['deptPl'] = new Chart(ctxDept, {
          type: 'bar',
          data: {
            labels: Object.keys(data.charts.dept_pl),
            datasets: [{
              label: 'Profit/Loss',
              data: Object.values(data.charts.dept_pl),
              backgroundColor: function (context) {
                const index = context.dataIndex;
                const value = context.dataset.data[index];
                const ctx = context.chart.ctx;
                const chartArea = context.chart.chartArea;
                if (!chartArea) return value >= 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(244, 63, 94, 0.9)';

                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                if (value >= 0) {
                  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
                  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.95)');
                  return gradient;
                } else {
                  gradient.addColorStop(0, 'rgba(244, 63, 94, 0.95)');
                  gradient.addColorStop(1, 'rgba(244, 63, 94, 0.05)');
                  return gradient;
                }
              },
              borderColor: function (context) {
                const value = context.dataset.data[context.dataIndex];
                return value >= 0 ? '#10b981' : '#f43f5e';
              },
              borderWidth: 1.5,
              borderRadius: 6,
              hoverBackgroundColor: function (context) {
                const value = context.dataset.data[context.dataIndex];
                return value >= 0 ? '#10b981' : '#f43f5e';
              }
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                '-webkit-backdropFilter': 'blur(12px)',
                titleColor: '#f8fafc',
                titleFont: { family: 'Inter', weight: '700', size: 12 },
                bodyColor: '#e2e8f0',
                bodyFont: { family: 'Inter', weight: '600', size: 11 },
                padding: 12,
                borderRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: function (context) {
                    return ' ' + context.dataset.label + ': ' + formatCurrencyPlain(context.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  display: false
                },
                ticks: {
                  callback: formatRupee,
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              }
            }
          }
        });
      }

      // 4. Yearly Profit Comparison (Line)
      destroyChart('yearlyProfit');
      const ctxProf = document.getElementById('chartYearlyProfit');
      if (ctxProf && data.charts.yearly_profit) {
        let datasets = [];
        const colors = ['#6366f1', '#ec4899', '#f59e0b'];
        let colorIdx = 0;

        for (let [year, profData] of Object.entries(data.charts.yearly_profit)) {
          if (profitYear === 'all' || profitYear === year) {
            const color = colors[colorIdx % colors.length];
            const ctx2d = ctxProf.getContext('2d');

            // Fading double-glow fill gradient
            const gradientArea = ctx2d.createLinearGradient(0, 0, 0, ctxProf.clientHeight || 250);
            gradientArea.addColorStop(0, color + '30'); // Premium opacity
            gradientArea.addColorStop(1, color + '00'); // Seamless fade

            datasets.push({
              label: `Profit ${year}`,
              data: profData,
              borderColor: color,
              backgroundColor: gradientArea,
              tension: 0.4,
              fill: true,
              pointRadius: 0, // Vercel-style: hide point coordinates by default
              pointHoverRadius: 8, // Glowing white nodes on hover
              pointHoverBackgroundColor: '#ffffff',
              pointHoverBorderColor: color,
              pointHoverBorderWidth: 4,
              borderWidth: 3.5,
              shadowColor: color + '40', // Box shadow glow under curve line
              shadowBlur: 10,
              shadowOffsetY: 4
            });
            colorIdx++;
          }
        }

        chartInstances['yearlyProfit'] = new Chart(ctxProf, {
          type: 'line',
          data: {
            labels: monthLabels,
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  boxWidth: 6,
                  padding: 20,
                  color: '#475569',
                  font: { family: 'Inter', weight: '600', size: 11 }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(12px)',
                '-webkit-backdropFilter': 'blur(12px)',
                titleColor: '#f8fafc',
                titleFont: { family: 'Inter', weight: '700', size: 12 },
                bodyColor: '#e2e8f0',
                bodyFont: { family: 'Inter', weight: '600', size: 11 },
                padding: 12,
                borderRadius: 12,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: function (context) {
                    return ' ' + context.dataset.label + ': ' + formatCurrencyPlain(context.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                grid: {
                  display: false
                },
                ticks: {
                  callback: formatRupee,
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: '#64748b',
                  font: { family: 'Inter', weight: '500', size: 10 },
                  padding: 8
                }
              }
            }
          }
        });
      }
    }

    // ==========================================
    //         PHASE 3: ADMIN DATA TABLES
    // ==========================================

    // ==========================================
    //         PHASE 6: CLIENT TRACKING
    // ==========================================
    function openClientDetails(clientId) {
      state.activeClient = state.allClients.find((c) => c.id === clientId);
      state.activeClientTab = "overview";
      renderAdminApp();
    }

    function closeClientDetails() {
      state.activeClient = null;
      renderAdminApp();
    }

    function switchClientTab(activeTab) {
      state.activeClientTab = activeTab;
      renderAdminApp();
    }

    

    

    

    function getClientProjectsTab(client, projects) {
      let projectsHtml = "";
      if (projects.length === 0) {
        projectsHtml =
          '<div class="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-slate-100"><i data-lucide="folder-open" class="w-10 h-10 mx-auto mb-3 opacity-20"></i> No projects found for this client.</div>';
      } else {
        projectsHtml = projects
          .map(
            (p) => `
                    <div class="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group" onclick="routeApp('projects'); setTimeout(()=>openProjectDetails('${p.id}'), 100);">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-primary transition-colors">
                                <i data-lucide="layout"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors">${p.name || p.project_name}</h4>
                                <p class="text-xs text-slate-500 mt-0.5">Lead: ${p.manager || "Unassigned"}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p.status === "In Progress" || p.status === "Active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-700 border-slate-200"} border">
                                ${p.status}
                            </span>
                            <div class="text-xs font-bold text-slate-900 mt-1.5">₹${formatNumber(p.budget || p.total_cost || 0)}</div>
                        </div>
                    </div>
                `,
          )
          .join("");
      }

      return `
                <div class="space-y-6">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <i data-lucide="bar-chart-3" class="w-4 h-4 text-brand-primary"></i> Client Project Portfolio
                        </h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        ${projectsHtml}
                    </div>
                </div>
            `;
    }

    function getClientProfileTab(client) {
      return `
                <div class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <i data-lucide="user-check" class="w-4 h-4 text-brand-primary"></i> Identity & Contact
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Client ID</p>
                                <p class="text-xs font-mono text-slate-500 break-all select-all">${client.id}</p>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Company Name</p>
                                <p class="text-base font-bold text-slate-900">${client.company !== "N/A" ? client.company : "--"}</p>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Primary Email</p>
                                <p class="text-base font-bold text-brand-primary">${client.email || "--"}</p>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone</p>
                                <p class="text-base font-bold text-slate-900">${client.phone !== "N/A" ? client.phone : "--"}</p>
                            </div>
                            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Relationship Since</p>
                                <p class="text-base font-bold text-slate-900">${new Date(client.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-4 h-4 text-brand-primary"></i> Physical Address
                        </h3>
                        <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <p class="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">${client.address !== "N/A" ? client.address : "No address details provided."}</p>
                        </div>
                    </div>
                </div>
            `;
    }

    function openClientEditModal(clientId) {
      const client = state.allClients.find((c) => c.id === clientId);
      if (!client) return;

      const formHtml = `
                <form onsubmit="handleClientUpdate(event, '${client.id}')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Client Name *</label>
                        <input type="text" id="edit_client_name" required value="${client.name}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Company / Organization</label>
                        <input type="text" id="edit_client_company" value="${client.company !== "N/A" ? client.company : ""}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <input type="email" id="edit_client_email" value="${client.email || ""}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                            <input type="text" id="edit_client_phone" value="${client.phone !== "N/A" ? client.phone : ""}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Physical Address</label>
                        <textarea id="edit_client_address" rows="3" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">${client.address !== "N/A" ? client.address : ""}</textarea>
                    </div>
                    <div id="editClientErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="editClientErrorMessage">Error message</span>
                    </div>
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnUpdateClient" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
                        </button>
                    </div>
                </form>
            `;
      openModal("Edit Client Details", formHtml);
    }

    async function handleClientUpdate(event, clientId) {
      event.preventDefault();
      const btn = document.getElementById("btnUpdateClient");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Updating...';
      btn.disabled = true;
      document
        .getElementById("editClientErrorBanner")
        .classList.add("hidden");

      try {
        const payload = {
          name: document.getElementById("edit_client_name").value,
          company:
            document.getElementById("edit_client_company").value || "N/A",
          email: document.getElementById("edit_client_email").value || null,
          phone: document.getElementById("edit_client_phone").value || "N/A",
          address:
            document.getElementById("edit_client_address").value || "N/A",
        };

        const response = await apiFetch(`/clients/update/${clientId}`, {
          method: "PUT",
          body: payload,
        });

        // Update local state
        const index = state.allClients.findIndex((c) => c.id === clientId);
        if (index !== -1) {
          state.allClients[index] = response;
        }
        state.activeClient = response;

        showToast("Client updated successfully", "success");
        closeModal();
        renderAdminApp();
      } catch (err) {
        document.getElementById("editClientErrorMessage").innerText =
          err.message;
        document
          .getElementById("editClientErrorBanner")
          .classList.remove("hidden");
        document
          .getElementById("editClientErrorBanner")
          .classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    // --- PHASE 5: PROJECT ROUTER ---
    

    

    function setProjectFilter(filter, btn) {
      state.projectFilter = filter;
      if (btn) {
        const container = btn.parentElement;
        container.querySelectorAll("button").forEach((b) => {
          b.className =
            "px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-all whitespace-nowrap";
        });
        btn.className =
          "px-4 py-1.5 text-sm font-medium rounded-md shadow-sm bg-white text-brand-primary transition-all whitespace-nowrap";
      }
      renderAdminProjectsTable();
    }

    function updateProjectSearch(term) {
      state.projectSearchTerm = term.toLowerCase();
      renderAdminProjectsTable();
    }

    // Replaced by Gatekeeper Flow
    async function triggerProjectGatekeeper(projectId, phase) {
      try {
        // 1. Fetch the checklist state for this project & phase
        const res = await apiFetch(`/checklists/projects/${projectId}?phase=${phase}`);
        const items = res.items || [];

        if (items.length === 0) {
          // No checklists defined, proceed directly
          if (phase === "START") await executeProjectStatusChange(projectId, "In Progress");
          if (phase === "END") await executeProjectStatusChange(projectId, "Completed", "100%");
          return;
        }

        // 2. Render Modal
        let checksHtml = items.map(item => `
                  <label class="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input type="checkbox" id="chk_${item.checklist_id}" class="gatekeeper-checkbox w-5 h-5 text-brand-primary rounded border-slate-300 focus:ring-brand-primary mt-0.5" ${item.is_checked ? 'checked' : ''} />
                      <span class="text-sm font-medium text-slate-700 leading-tight">${item.task_description}</span>
                  </label>
              `).join("");

        const modalHtml = `
                  <div class="space-y-4 mb-6">
                      <p class="text-sm text-slate-600">Please verify the following mandatory tasks before proceeding.</p>
                      <div class="space-y-3" id="gatekeeper-list">
                          ${checksHtml}
                      </div>
                  </div>
                  <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                      <button type="button" onclick="submitProjectGatekeeper('${projectId}', '${phase}')" class="px-6 py-2 bg-brand-primary hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                          <i data-lucide="check" class="w-4 h-4"></i> Proceed
                      </button>
                  </div>
              `;

        openModal(phase === "START" ? "Project Start Checklist" : "Project End Checklist", modalHtml);

      } catch (err) {
        showToast("Failed to load checklist: " + err.message, "error");
      }
    }

    async function submitProjectGatekeeper(projectId, phase) {
      // Verify all are checked if you want strict enforcement
      // The prompt says: "The user must check them off to proceed"
      const checkboxes = document.querySelectorAll(".gatekeeper-checkbox");
      let allChecked = true;
      const itemsToSave = [];

      checkboxes.forEach(cb => {
        const checklistId = cb.id.replace("chk_", "");
        itemsToSave.push({ checklist_id: checklistId, is_checked: cb.checked });
        if (!cb.checked) allChecked = false;
      });

      if (!allChecked) {
        showToast("You must verify and check all items before proceeding.", "error");
        return;
      }

      try {
        // Save checklist state
        await apiFetch(`/checklists/projects/${projectId}/submit`, {
          method: "POST",
          body: { phase: phase, items: itemsToSave }
        });

        closeModal();
        showToast("Checklist verified.", "success");

        // Change Status
        if (phase === "START") await executeProjectStatusChange(projectId, "In Progress");
        if (phase === "END") await executeProjectStatusChange(projectId, "Completed", "100%");

      } catch (err) {
        showToast("Failed to verify checklist: " + err.message, "error");
      }
    }

    async function executeProjectStatusChange(projectId, status, progress = null) {
      try {
        const body = { status: status };
        if (progress) body.progress = progress;

        await apiFetch(`/projects/update/${projectId}`, {
          method: "PUT",
          body: body
        });
        showToast(`Project marked as ${status}!`, "success");
        await loadAdminWorkspaceData();
        await openProjectDetails(projectId);
      } catch (err) {
        showToast("Failed to update project status: " + err.message, "error");
      }
    }

    // Sub-Tab: Overview
    function getProjectOverviewTab(p, tasks) {
      let nextDeadline = "N/A";
      let nextDateOfGiving = "N/A";

      if (p.project_type === "Content" || p.project_type === "Both") {
        const sortedContentTasks = tasks
          .filter((t) => t.upload_deadline || t.next_delivery_date)
          .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

        const latestDeadlineTask = sortedContentTasks.find(
          (t) => t.upload_deadline && t.upload_deadline !== "N/A"
        );
        if (latestDeadlineTask) {
          nextDeadline = latestDeadlineTask.upload_deadline;
        }
        const latestGivingTask = sortedContentTasks.find(
          (t) => t.next_delivery_date && t.next_delivery_date !== "N/A"
        );
        if (latestGivingTask) {
          nextDateOfGiving = latestGivingTask.next_delivery_date;
        }
      }

      let totalCost = 0,
        totalBilled = 0,
        totalHours = 0;
      let employeeStats = {};

      tasks.forEach((t) => {
        const cost = parseFloat(t.employee_cost || 0);
        const billed = parseFloat(t.billing_amount || 0);
        const profit = billed - cost;

        totalCost += cost;
        totalBilled += billed;
        totalHours += parseFloat(t.hours_logged || 0);

        if (!employeeStats[t.employee_id]) {
          const emp = state.allEmployees.find((e) => e.id === t.employee_id);
          let role = "Employee";
          let photo = null;
          if (emp) {
            const roleObj = (state.allRoles && Array.isArray(state.allRoles)) ? state.allRoles.find((r) => r.id === emp.role_id) : null;
            role = roleObj ? roleObj.role_name : emp.job_title || "Employee";
            photo = emp.photo;
          }
          employeeStats[t.employee_id] = {
            name: emp ? emp.full_name : "Unknown",
            role: role,
            photo: photo,
            profit: 0,
            billed: 0,
            hours: 0,
          };
        }
        employeeStats[t.employee_id].profit += profit;
        employeeStats[t.employee_id].billed += billed;
        employeeStats[t.employee_id].hours += parseFloat(t.hours_logged || 0);
      });

      let extraExpenses = 0;
      if (state.projectExpenses && state.projectExpenses.length > 0) {
        state.projectExpenses.forEach((e) => {
          extraExpenses += parseFloat(e.amount || 0);
        });
      }

      const employeeCost = totalCost;
      totalCost += extraExpenses; // True total cost

      const clientCost = parseFloat(p.client_cost || 0);
      const actualRevenue = clientCost > 0 ? clientCost : totalBilled;

      const profit = actualRevenue - totalCost;
      const margin =
        actualRevenue > 0 ? ((profit / actualRevenue) * 100).toFixed(1) : 0;
      const budget = parseFloat(p.budget || 0);
      const burnPct =
        budget > 0 ? ((totalCost / budget) * 100).toFixed(1) : 0;

      // --- ENHANCEMENTS: Metrics & Alerts --- //
      const employeesAssignedCount = state.projectAssignments
        ? state.projectAssignments.length
        : 0;
      const totalTasksLogged = tasks.length;

      let alertsHtml = "";

      // 1. SRS Alert
      if (!state.projectSRS || state.projectSRS.length === 0) {
        alertsHtml += `
                    <div class="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 shadow-sm">
                        <i data-lucide="file-warning" class="w-5 h-5 shrink-0 mt-0.5"></i>
                        <div>
                            <h4 class="text-sm font-bold tracking-tight">Missing SRS Documentation</h4>
                            <p class="text-xs mt-1">No Software Requirements Specification (SRS) uploaded. Upload it in the 'SRS & Docs' tab.</p>
                        </div>
                    </div>
                `;
      }

      // 2. Deadline Alert
      let daysRemainingText = "Ongoing / N/A";
      if (p.end_date && p.end_date !== "N/A" && p.status !== "Completed") {
        const today = new Date();
        const endDate = new Date(p.end_date);
        if (!isNaN(endDate.getTime())) {
          const diffTime = endDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          daysRemainingText = diffDays < 0 ? Math.abs(diffDays) + " Days Overdue" : diffDays + " Days";

          if (diffDays < 0) {
            alertsHtml += `
                          <div class="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 shadow-sm">
                              <i data-lucide="calendar-x" class="w-5 h-5 shrink-0 mt-0.5"></i>
                              <div>
                                  <h4 class="text-sm font-bold tracking-tight">Project Overdue</h4>
                                  <p class="text-xs mt-1">The project deadline (${endDate.toLocaleDateString()}) has passed by ${Math.abs(diffDays)} days.</p>
                              </div>
                          </div>
                      `;
          } else if (diffDays <= 14) {
            alertsHtml += `
                          <div class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 shadow-sm">
                              <i data-lucide="clock" class="w-5 h-5 shrink-0 mt-0.5"></i>
                              <div>
                                  <h4 class="text-sm font-bold tracking-tight">Nearing Deadline</h4>
                                  <p class="text-xs mt-1">Only ${diffDays} days remaining until the deadline (${endDate.toLocaleDateString()}).</p>
                              </div>
                          </div>
                      `;
          }
        }
      }

      // 3. Budget Risk Alert
      if (budget > 0) {
        if (totalCost > budget) {
          alertsHtml += `
                        <div class="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 shadow-sm">
                            <i data-lucide="alert-octagon" class="w-5 h-5 shrink-0 mt-0.5"></i>
                            <div>
                                <h4 class="text-sm font-bold tracking-tight">Project At Risk: Over Budget</h4>
                                <p class="text-xs mt-1">Accumulated cost (${formatCurrency(totalCost)}) has exceeded the allocated budget (${formatCurrency(budget)}).</p>
                            </div>
                        </div>
                    `;
        } else if (totalCost > budget * 0.8) {
          alertsHtml += `
                        <div class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 shadow-sm">
                            <i data-lucide="alert-circle" class="w-5 h-5 shrink-0 mt-0.5"></i>
                            <div>
                                <h4 class="text-sm font-bold tracking-tight">Budget Warning</h4>
                                <p class="text-xs mt-1">Project is nearing its budget limit (${burnPct}% burned).</p>
                            </div>
                        </div>
                    `;
        }
      }

      // 4. Equilibrium / Profitability
      if (totalCost > 0 && profit >= 0) {
        alertsHtml += `
                    <div class="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 shadow-sm">
                        <i data-lucide="trending-up" class="w-5 h-5 shrink-0 mt-0.5"></i>
                        <div>
                            <h4 class="text-sm font-bold tracking-tight">Project Equilibrium</h4>
                            <p class="text-xs mt-1">The project is currently profitable with a net margin of ${margin}%.</p>
                        </div>
                    </div>
                `;
      }

      if (!alertsHtml) {
        alertsHtml = `
                    <div class="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 shadow-sm col-span-full">
                        <i data-lucide="check-circle" class="w-5 h-5 shrink-0 mt-0.5 text-emerald-500"></i>
                        <div>
                            <h4 class="text-sm font-bold tracking-tight">All Good</h4>
                            <p class="text-xs mt-1">No active warnings or alerts for this project.</p>
                        </div>
                    </div>
                `;
      }

      // Time series for Line Chart (Cumulative Cost vs Billed over time)
      const tasksByDate = {};
      const sortedTasks = [...tasks].sort(
        (a, b) =>
          new Date(a.date || a.created_at) - new Date(b.date || b.created_at),
      );

      sortedTasks.forEach((t) => {
        const d = new Date(t.date || t.created_at).toLocaleDateString();
        if (!tasksByDate[d]) tasksByDate[d] = { cost: 0, billed: 0 };
        tasksByDate[d].cost += parseFloat(t.employee_cost || 0);
        tasksByDate[d].billed += parseFloat(t.billing_amount || 0);
      });

      if (state.projectExpenses && state.projectExpenses.length > 0) {
        state.projectExpenses.forEach((e) => {
          const d = new Date(e.expense_date).toLocaleDateString();
          if (!tasksByDate[d]) tasksByDate[d] = { cost: 0, billed: 0 };
          tasksByDate[d].cost += parseFloat(e.amount || 0);
        });
      }

      const allDates = Object.keys(tasksByDate).sort(
        (a, b) => new Date(a) - new Date(b),
      );
      let cumulativeCostArr = [];
      let cumulativeBilledArr = [];
      let runCost = 0;
      let runBilled = 0;

      allDates.forEach((d) => {
        runCost += tasksByDate[d].cost;
        runBilled += tasksByDate[d].billed;
        cumulativeCostArr.push(runCost);
        cumulativeBilledArr.push(runBilled);
      });

      setTimeout(() => {
        // Premium Burn-Down Bar Chart
        if (chartInstances.projectBurn) chartInstances.projectBurn.destroy();
        const ctxBurn = document.getElementById("projectBurnChart");
        if (ctxBurn) {
          const ctx = ctxBurn.getContext("2d");

          // Create premium gradients for vertical bars
          const gradBudget = ctx.createLinearGradient(0, 0, 0, 260);
          gradBudget.addColorStop(0, "rgba(203, 213, 225, 0.95)"); // slate-300
          gradBudget.addColorStop(1, "rgba(241, 245, 249, 0.5)");  // slate-100

          const gradEmp = ctx.createLinearGradient(0, 0, 0, 260);
          gradEmp.addColorStop(0, "rgba(245, 158, 11, 0.95)");  // amber-500
          gradEmp.addColorStop(1, "rgba(254, 243, 199, 0.5)");  // amber-100

          const gradExtra = ctx.createLinearGradient(0, 0, 0, 260);
          gradExtra.addColorStop(0, "rgba(244, 63, 94, 0.95)");  // rose-500
          gradExtra.addColorStop(1, "rgba(255, 228, 230, 0.5)"); // rose-100

          const gradClient = ctx.createLinearGradient(0, 0, 0, 260);
          gradClient.addColorStop(0, "rgba(16, 185, 129, 0.95)"); // emerald-500
          gradClient.addColorStop(1, "rgba(209, 250, 229, 0.5)");  // emerald-100

          const gradBilled = ctx.createLinearGradient(0, 0, 0, 260);
          gradBilled.addColorStop(0, "rgba(79, 70, 229, 0.95)");  // indigo-600
          gradBilled.addColorStop(1, "rgba(224, 231, 255, 0.5)");  // indigo-100

          chartInstances.projectBurn = new Chart(ctxBurn, {
            type: "bar",
            data: {
              labels: ["Allocations"],
              datasets: [
                {
                  label: "Client Revenue",
                  data: [clientCost],
                  backgroundColor: gradClient,
                  borderColor: "#059669",
                  borderWidth: 1.5,
                  borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                  borderSkipped: false,
                  barPercentage: 0.65,
                  categoryPercentage: 0.8,
                },
                {
                  label: "Budget",
                  data: [budget],
                  backgroundColor: gradBudget,
                  borderColor: "#cbd5e1",
                  borderWidth: 1.5,
                  borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                  borderSkipped: false,
                  barPercentage: 0.65,
                  categoryPercentage: 0.8,
                },
                {
                  label: "Employee Cost",
                  data: [employeeCost],
                  backgroundColor: gradEmp,
                  borderColor: "#d97706",
                  borderWidth: 1.5,
                  borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                  borderSkipped: false,
                  barPercentage: 0.65,
                  categoryPercentage: 0.8,
                },
                {
                  label: "Extra Expenses",
                  data: [extraExpenses],
                  backgroundColor: gradExtra,
                  borderColor: "#e11d48",
                  borderWidth: 1.5,
                  borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                  borderSkipped: false,
                  barPercentage: 0.65,
                  categoryPercentage: 0.8,
                },
                {
                  label: "Task Value",
                  data: [totalBilled],
                  backgroundColor: gradBilled,
                  borderColor: "#4338ca",
                  borderWidth: 1.5,
                  borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                  borderSkipped: false,
                  barPercentage: 0.65,
                  categoryPercentage: 0.8,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "rgba(15, 23, 42, 0.98)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  titleFont: { family: "Inter", size: 13, weight: "bold" },
                  bodyFont: { family: "Inter", size: 12 },
                  padding: 14,
                  cornerRadius: 12,
                  displayColors: true,
                  callbacks: {
                    label: (context) =>
                      ` 💰 ${context.dataset.label}: ₹${context.raw.toLocaleString()}`,
                  },
                },
              },
              scales: {
                x: {
                  display: true,
                  grid: { display: false },
                  ticks: {
                    font: { family: "Inter", size: 10, weight: "700" },
                    color: "#94a3b8",
                  }
                },
                y: {
                  type: 'logarithmic',
                  beginAtZero: false, // Log scale doesn't support 0
                  min: 100, // Smallest value to show (prevents log(0) issues)
                  grid: {
                    color: "rgba(226, 232, 240, 0.4)",
                    borderDash: [5, 5],
                    drawBorder: false,
                  },
                  ticks: {
                    font: { family: "Inter", size: 10, weight: "700" },
                    color: "#94a3b8",
                    callback: function (value) {
                      const log10 = Math.log10(value);
                      if (Math.abs(log10 - Math.round(log10)) < 0.01) {
                        if (value >= 10000000) return '₹' + (value / 10000000).toFixed(0) + 'Cr';
                        if (value >= 100000) return '₹' + (value / 100000).toFixed(0) + 'L';
                        if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'k';
                        return '₹' + value;
                      }
                      return null;
                    }
                  },
                },
              },
            },
          });
        }

        // Premium Financial Trajectory Line Chart
        if (chartInstances.projectTrajectory)
          chartInstances.projectTrajectory.destroy();
        const ctxLine = document.getElementById("projectTrajectoryChart");
        if (ctxLine && allDates.length > 0) {
          const gradBilled = ctxLine
            .getContext("2d")
            .createLinearGradient(0, 0, 0, 300);
          gradBilled.addColorStop(0, "rgba(79, 70, 229, 0.28)");
          gradBilled.addColorStop(1, "rgba(79, 70, 229, 0.0)");

          const gradCost = ctxLine
            .getContext("2d")
            .createLinearGradient(0, 0, 0, 300);
          gradCost.addColorStop(0, "rgba(244, 63, 94, 0.28)");
          gradCost.addColorStop(1, "rgba(244, 63, 94, 0.0)");

          chartInstances.projectTrajectory = new Chart(ctxLine, {
            type: "line",
            data: {
              labels: allDates,
              datasets: [
                {
                  label: "Cumulative Billed",
                  data: cumulativeBilledArr,
                  borderColor: "#4f46e5",
                  backgroundColor: gradBilled,
                  borderWidth: 4,
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: "#ffffff",
                  pointBorderColor: "#4f46e5",
                  pointBorderWidth: 3,
                  pointRadius: 0,
                  pointHoverRadius: 7,
                },
                {
                  label: "Cumulative Cost",
                  data: cumulativeCostArr,
                  borderColor: "#f43f5e",
                  backgroundColor: gradCost,
                  borderWidth: 4,
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: "#ffffff",
                  pointBorderColor: "#f43f5e",
                  pointBorderWidth: 3,
                  pointRadius: 0,
                  pointHoverRadius: 7,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "rgba(15, 23, 42, 0.98)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  titleFont: { family: "Inter", size: 13, weight: "bold" },
                  bodyFont: { family: "Inter", size: 12 },
                  padding: 16,
                  cornerRadius: 12,
                  mode: "index",
                  intersect: false,
                  callbacks: {
                    label: (context) =>
                      ` 💸 ${context.dataset.label}: ₹${context.raw.toLocaleString()}`,
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: {
                    font: { family: "Inter", size: 10, weight: "700" },
                    color: "#94a3b8",
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: "rgba(226, 232, 240, 0.4)",
                    borderDash: [5, 5],
                    drawBorder: false,
                  },
                  ticks: {
                    font: { family: "Inter", size: 10, weight: "700" },
                    color: "#94a3b8",
                    callback: function (value) {
                      if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                      if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                      if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + 'k';
                      return '₹' + value;
                    }
                  },
                },
              },
              interaction: { mode: "index", intersect: false },
            },
          });
        }

        // Milestone Trajectory Chart
        if (window.renderMilestoneTrajectoryChart)
          window.renderMilestoneTrajectoryChart();

        if (window.loadProjectGatekeeperState)
          window.loadProjectGatekeeperState(p.id);
      }, 100);

      const topPerformers = Object.values(employeeStats)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
      let performanceHtml = "";
      if (topPerformers.length === 0) {
        performanceHtml =
          '<div class="col-span-full py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"><i data-lucide="users-round" class="w-8 h-8 text-slate-300 mb-2"></i><span class="text-sm font-medium text-slate-400">No performance data recorded for this project yet.</span></div>';
      } else {
        performanceHtml = topPerformers
          .map(
            (emp, index) => {
              let rankColorClass = "bg-slate-500 text-white";
              let badgeText = `#${index + 1}`;
              let borderTheme = "border-slate-200";
              let avatarBorder = "border-slate-200 bg-slate-50 text-slate-600";
              let bgGradient = "from-slate-50/30 to-white";
              let glowColor = "bg-slate-200/20";
              let topBadgeBg = "bg-slate-100 text-slate-600";
              let topBadgeText = `Rank #${index + 1}`;

              if (index === 0) {
                // Gold Rank
                rankColorClass = "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm shadow-amber-300";
                badgeText = "🏆 #1";
                borderTheme = "border-amber-200";
                avatarBorder = "border-amber-300 bg-amber-50/50 text-amber-700 shadow-amber-100";
                bgGradient = "from-amber-50/20 to-white";
                glowColor = "bg-amber-400/10";
                topBadgeBg = "bg-amber-100 text-amber-800 font-extrabold";
                topBadgeText = "Top Contributor";
              } else if (index === 1) {
                // Silver Rank
                rankColorClass = "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm shadow-slate-300";
                badgeText = "🥈 #2";
                borderTheme = "border-slate-300";
                avatarBorder = "border-slate-300 bg-slate-100/50 text-slate-700 shadow-slate-100";
                bgGradient = "from-slate-100/20 to-white";
                glowColor = "bg-slate-400/10";
                topBadgeBg = "bg-slate-100 text-slate-700 font-bold";
                topBadgeText = "Runner Up";
              } else if (index === 2) {
                // Bronze Rank
                rankColorClass = "bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-sm shadow-amber-500";
                badgeText = "🥉 #3";
                borderTheme = "border-orange-200";
                avatarBorder = "border-orange-300 bg-orange-50/50 text-orange-800 shadow-orange-100";
                bgGradient = "from-orange-50/10 to-white";
                glowColor = "bg-orange-400/10";
                topBadgeBg = "bg-orange-100 text-orange-800 font-bold";
                topBadgeText = "Bronze Rank";
              } else {
                badgeText = `#${index + 1}`;
                borderTheme = "border-slate-200/80";
                avatarBorder = "border-slate-200 bg-indigo-50/50 text-indigo-600";
                bgGradient = "from-indigo-50/5 to-white";
                glowColor = "bg-indigo-500/5";
                topBadgeBg = "bg-indigo-50 text-indigo-700 font-bold";
                topBadgeText = `Rank #${index + 1}`;
              }

              let avatarHtml = "";
              if (emp.photo && emp.photo !== "N/A") {
                const photoUrl = emp.photo.startsWith("http")
                  ? emp.photo
                  : `${CONFIG.API_BASE_URL}/${emp.photo.replace(/\\/g, "/")}`;
                avatarHtml = `<img src="${photoUrl}" class="w-full h-full object-cover">`;
              } else {
                const initials = emp.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                avatarHtml = initials;
              }

              return `
                  <div class="relative overflow-hidden bg-gradient-to-br ${bgGradient} border ${borderTheme} rounded-2xl p-5 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group min-w-0">
                      <!-- Glow Backdrop -->
                      <div class="absolute -right-12 -top-12 w-28 h-28 ${glowColor} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                      
                      <!-- Top Float Pill Badge -->
                      <div class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${topBadgeBg}">
                          ${topBadgeText}
                      </div>

                      <!-- Avatar with Rank Badge -->
                      <div class="relative mt-2">
                          <div class="w-16 h-16 rounded-2xl overflow-hidden border-2 ${avatarBorder} flex items-center justify-center font-black text-xl transition-transform duration-300 group-hover:scale-105">
                              ${avatarHtml}
                          </div>
                          <div class="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${rankColorClass} flex items-center justify-center shadow">
                              ${badgeText}
                          </div>
                      </div>

                      <!-- Name and Designation -->
                      <div class="mt-4 w-full">
                          <h5 class="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors truncate" title="${emp.name}">${emp.name}</h5>
                          <p class="text-[10px] font-semibold text-slate-400 mt-0.5 tracking-wider uppercase truncate" title="${emp.role}">${emp.role}</p>
                      </div>

                      <!-- Divider -->
                      <div class="w-full my-4 border-t border-slate-100"></div>

                      <!-- Stats Auto Layout Grid -->
                      <div class="grid grid-cols-2 gap-x-2 gap-y-3 w-full bg-slate-50/70 p-3 rounded-xl border border-slate-100/50">
                          <div class="min-w-0">
                              <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Billed</p>
                              <p class="text-[13px] font-black text-indigo-600 truncate mt-0.5" title="${formatCurrencyPlain(emp.billed)}">${formatCurrency(emp.billed)}</p>
                          </div>
                          <div class="min-w-0 border-l border-slate-200/60 pl-2">
                              <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Margin</p>
                              <p class="text-[13px] font-black text-emerald-600 truncate mt-0.5" title="${formatCurrencyPlain(emp.profit)}">${formatCurrency(emp.profit)}</p>
                          </div>
                      </div>

                      <!-- Footer Info (Hours Logged) -->
                      <div class="flex justify-between items-center w-full px-1 text-[10px] text-slate-400 mt-3 font-semibold">
                          <span class="flex items-center gap-1">
                              <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                              Time Logged
                          </span>
                          <span class="font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                              ${emp.hours.toFixed(1)} hrs
                          </span>
                      </div>
                  </div>
                `;
            }
          )
          .join("");
      }

      return `
                <!-- System Alerts -->
                <div class="mb-6 fade-in">
                    <h4 class="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2"><i data-lucide="bell" class="w-4 h-4 text-brand-primary"></i> Project Intelligence & Alerts</h4>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        ${alertsHtml}
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    <!-- Client Cost -->
                    <div class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div class="flex items-center justify-between gap-1 mb-1.5">
                                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Client Cost</p>
                                <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            </div>
                            <h3 class="text-lg sm:text-xl font-black text-emerald-600 tracking-tight truncate" title="${formatCurrencyPlain(clientCost)}">${formatCurrency(clientCost)}</h3>
                        </div>
                        <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Actual Project Revenue</p>
                    </div>

                    <!-- Total Budget -->
                    <div class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div class="flex items-center justify-between gap-1 mb-1.5">
                                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Total Budget</p>
                                <span class="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                            </div>
                            <h3 class="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate" title="${formatCurrencyPlain(budget)}">${formatCurrency(budget)}</h3>
                        </div>
                        <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Max Allowed Burn</p>
                    </div>

                    <!-- Accumulated Cost -->
                    <div class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div class="flex items-center justify-between gap-1 mb-1.5">
                                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Accumulated Cost</p>
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 shrink-0">${burnPct}% Burn</span>
                            </div>
                            <h3 class="text-lg sm:text-xl font-black text-rose-600 tracking-tight truncate" title="${formatCurrencyPlain(totalCost)} (${burnPct}%)">${formatCurrency(totalCost)}</h3>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-slate-500 font-bold mt-2 pt-1.5 border-t border-slate-100/80 gap-1 truncate">
                            <span class="truncate">Emp: <strong class="text-slate-700">${formatCurrency(employeeCost)}</strong></span>
                            <span class="truncate">Ext: <strong class="text-slate-700">${formatCurrency(extraExpenses)}</strong></span>
                        </div>
                    </div>

                    <!-- Task Value (Internal) -->
                    <div class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div class="flex items-center justify-between gap-1 mb-1.5">
                                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Task Value (Internal)</p>
                                <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                            </div>
                            <h3 class="text-lg sm:text-xl font-black text-indigo-600 tracking-tight truncate" title="${formatCurrencyPlain(totalBilled)}">${formatCurrency(totalBilled)}</h3>
                        </div>
                        <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Aggregated Internal Billing</p>
                    </div>

                    <!-- Net Profit Margin -->
                    <div class="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[125px]">
                        <div>
                            <div class="flex items-center justify-between gap-1 mb-1.5">
                                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">Net Profit Margin</p>
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-black ${profit >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"} shrink-0">${profit >= 0 ? '+' : ''}${margin}%</span>
                            </div>
                            <h3 class="text-lg sm:text-xl font-black ${profit >= 0 ? "text-emerald-600" : "text-brand-alert"} tracking-tight truncate" title="${formatCurrencyPlain(profit)} (${margin}%)">${formatCurrency(profit)}</h3>
                        </div>
                        <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Based on Client Cost</p>
                    </div>
                </div>

                <!-- Project Financial & Operational Metrics Grid (PRB-063) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allocated Budget</p>
                            <h3 class="text-xl font-extrabold text-slate-800 font-mono">${formatCurrency(budget)}</h3>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-brand-primary border border-indigo-100">
                            <i data-lucide="wallet" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expenses & Cost</p>
                            <h3 class="text-xl font-extrabold text-slate-800 font-mono">${formatCurrency(totalCost)}</h3>
                            <p class="text-[10px] font-medium text-slate-400 mt-0.5">${burnPct}% of budget</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                            <i data-lucide="trending-up" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remaining Variance</p>
                            <h3 class="text-xl font-extrabold ${budget - totalCost < 0 ? 'text-rose-600' : 'text-emerald-600'} font-mono">${formatCurrency(budget - totalCost)}</h3>
                        </div>
                        <div class="w-10 h-10 rounded-xl ${budget - totalCost < 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} flex items-center justify-center border">
                            <i data-lucide="pie-chart" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Workforce</p>
                            <h3 class="text-xl font-extrabold text-slate-800">${employeesAssignedCount} Members</h3>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                            <i data-lucide="users" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time & Ledger</p>
                            <h3 class="text-xl font-extrabold text-slate-800">${totalHours.toFixed(1)} Hrs <span class="text-xs font-medium text-slate-400">(${totalTasksLogged} logs)</span></h3>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                            <i data-lucide="clock" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                        <div>
                            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Timeline Trajectory</p>
                            <h3 class="text-xl font-extrabold text-slate-800">${daysRemainingText}</h3>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                            <i data-lucide="calendar" class="w-5 h-5"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Gatekeeper Checklists State -->
                <div id="project-gatekeeper-state-panel" class="mb-8"></div>
                
                ${p.project_type === "Content" ? `
                <!-- Content Agreement Tracker -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
                        <div class="flex items-center gap-3 mb-6 relative z-10">
                            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <i data-lucide="layers" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Content Agreement Tracker</h4>
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Real-time Deliverable Counts vs. Targets</p>
                            </div>
                        </div>
                        <div class="space-y-5 relative z-10">
                            ${(function() {
                                let agreement = [];
                                try {
                                    agreement = typeof p.content_agreement === 'string' ? JSON.parse(p.content_agreement) : (p.content_agreement || []);
                                } catch(e) {
                                    agreement = [];
                                }
                                if (!agreement || agreement.length === 0) {
                                    return '<div class="text-xs text-slate-400 italic">No custom tracking fields configured. Go to "Edit Settings" to configure them.</div>';
                                }
                                return agreement.map(item => {
                                    const target = parseInt(item.target) || 0;
                                    const current = parseInt(item.current) || 0;
                                    const monthlyTarget = parseInt(item.monthly_target) || 0;
                                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                                    
                                    return `
                                        <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <div class="flex justify-between items-center mb-2">
                                                <div>
                                                    <span class="text-xs font-bold text-slate-700">${item.name}</span>
                                                    ${monthlyTarget > 0 ? `<span class="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold ml-2">Retainer: ${monthlyTarget}/mo</span>` : ''}
                                                </div>
                                                <span class="text-xs font-black text-brand-primary bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100/50">${current} / ${target}</span>
                                            </div>
                                            <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner mb-1">
                                                <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
                                            </div>
                                            <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                                                <span>Progress</span>
                                                <span>${pct}%</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                            })()}
                        </div>
                    </div>
                    
                    <!-- Content Retainer Deadlines -->
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div class="absolute -right-16 -top-16 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                        <div class="flex items-center gap-3 mb-6 relative z-10">
                            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <i data-lucide="calendar" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Retainer Schedule</h4>
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Retainer Deadlines & Handover Info</p>
                            </div>
                        </div>
                        <div class="space-y-4 relative z-10">
                            <div class="p-4 rounded-xl border border-slate-100 bg-indigo-50/30">
                                <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Next Upload Deadline</span>
                                <span class="text-base font-black text-indigo-700 block">${nextDeadline !== 'N/A' ? new Date(nextDeadline).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'No Upload Logged'}</span>
                                <span class="text-[9px] text-slate-400 block mt-1">${nextDeadline !== 'N/A' ? `Target: ${nextDeadline}` : 'Set when logging task'}</span>
                            </div>
                            <div class="p-4 rounded-xl border border-slate-100 bg-emerald-50/30">
                                <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Next Date of Giving</span>
                                <span class="text-base font-black text-emerald-700 block">${nextDateOfGiving !== 'N/A' ? new Date(nextDateOfGiving).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'No Giving Logged'}</span>
                                <span class="text-[9px] text-slate-400 block mt-1">${nextDateOfGiving !== 'N/A' ? `Target: ${nextDateOfGiving}` : 'Set when logging task'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ` : `
                <!-- Milestone Trajectory Analysis (High Impact) -->
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                    <div class="flex justify-between items-center mb-8 relative z-10">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                <i data-lucide="line-chart" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Milestone Execution Trajectory</h4>
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Real-time Delivery Velocity & Predictions</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-[10px] font-extrabold text-slate-600 border border-slate-200 shadow-sm">
                                 <span class="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shadow-sm"></span> Expected
                             </span>
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-extrabold text-emerald-700 border border-emerald-100 shadow-sm animate-pulse-slow">
                                 <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span> Actual Velocity
                             </span>
                        </div>
                    </div>
                    <div class="w-full h-[320px] relative z-10">
                        <canvas id="milestoneChart"></canvas>
                    </div>
                </div>
                `}

                <!-- High-Fidelity Charts and Performance -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <!-- Financial Trajectory -->
                    <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
                        <div class="flex justify-between items-center mb-6 relative z-10">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                    <i data-lucide="trending-up" class="w-5 h-5"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Financial Trajectory</h4>
                                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Cumulative Cost vs. Billed over Time</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                 <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-[10px] font-extrabold text-indigo-700 border border-indigo-100 shadow-sm">
                                     <span class="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span> Billed
                                 </span>
                                 <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-[10px] font-extrabold text-rose-700 border border-rose-100 shadow-sm">
                                     <span class="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span> Cost
                                 </span>
                            </div>
                        </div>
                        <div class="h-72 relative z-10 w-full">
                            ${allDates.length > 0
          ? '<canvas id="projectTrajectoryChart"></canvas>'
          : '<div class="flex items-center justify-center h-full text-sm text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No financial data available over time yet.</div>'
        }
                        </div>
                    </div>

                    <!-- Burn Down Overview -->
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div class="absolute -right-16 -top-16 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                        <div class="flex items-center gap-3 mb-6 relative z-10">
                            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                                <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Burn-Down</h4>
                                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Budget Allocation</p>
                            </div>
                        </div>
                        <div class="h-64 relative z-10 w-full">
                            <canvas id="projectBurnChart"></canvas>
                        </div>
                        <div class="mt-5 flex flex-wrap gap-2 relative z-10 justify-center">
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-extrabold text-emerald-700 border border-emerald-100 shadow-sm">
                                 <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Client Revenue
                             </span>
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-[10px] font-extrabold text-slate-700 border border-slate-100 shadow-sm">
                                 <span class="w-2 h-2 rounded-full bg-slate-400"></span> Budget
                             </span>
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[10px] font-extrabold text-amber-700 border border-amber-100 shadow-sm">
                                 <span class="w-2 h-2 rounded-full bg-amber-500"></span> Employee Cost
                             </span>
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-[10px] font-extrabold text-rose-700 border border-rose-100 shadow-sm">
                                 <span class="w-2 h-2 rounded-full bg-rose-500"></span> Extra Expenses
                             </span>
                             <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-[10px] font-extrabold text-indigo-700 border border-indigo-100 shadow-sm">
                                 <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Task Value
                             </span>
                        </div>
                    </div>
                </div>

                <!-- Performance Matrix -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <i data-lucide="zap" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Performance Matrix</h4>
                            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Top contributors generating the highest margin</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        ${performanceHtml}
                    </div>
                </div>
            `;
    }

    // Sub-Tab: Team
    function getProjectTeamTab(p) {
      const teamHtml = state.projectAssignments
        .map(
          (e) => `
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center relative group">
                    <button onclick="unassignEmployee('${e.id}')" class="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100" title="Remove from Project">
                        <i data-lucide="user-minus" class="w-4 h-4"></i>
                    </button>
                    <div class="w-14 h-14 bg-indigo-50 text-brand-primary rounded-full flex items-center justify-center font-bold text-xl mb-3 shadow-sm border border-indigo-100">
                        ${e.full_name ? e.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <h4 class="font-bold text-slate-800 text-sm truncate w-full">${e.full_name}</h4>
                    <p class="text-xs text-slate-500 mb-4">${e.job_title || e.department || "Employee"}</p>
                    
                    <div class="w-full bg-slate-50 rounded-lg p-3 text-left border border-slate-100">
                        <div class="flex justify-between items-center mb-1 text-xs">
                            <span class="text-slate-500 font-medium">Cost Rate</span>
                            <span class="font-bold text-slate-800">${e.custom_hourly_cost !== null && e.custom_hourly_cost !== undefined ? formatCurrency(e.custom_hourly_cost) : formatCurrency(e.hourly_cost_rate)} <span class="font-normal text-[10px] text-slate-400">/hr</span></span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-500 font-medium">Billing Rate</span>
                            <span class="font-bold text-brand-primary">${e.custom_hourly_billing !== null && e.custom_hourly_billing !== undefined ? formatCurrency(e.custom_hourly_billing) : formatCurrency(e.hourly_billing_rate)} <span class="font-normal text-[10px] text-brand-primary/50">/hr</span></span>
                        </div>
                    </div>
                    <div class="mt-3 flex items-center justify-between w-full gap-2">
                        <span class="text-[10px] uppercase font-bold tracking-wider ${(e.custom_hourly_cost !== null && e.custom_hourly_cost !== undefined) || (e.custom_hourly_billing !== null && e.custom_hourly_billing !== undefined) ? "text-indigo-600 bg-indigo-50" : "text-slate-500 bg-slate-100"} px-2 py-1 rounded">
                            ${(e.custom_hourly_cost !== null && e.custom_hourly_cost !== undefined) || (e.custom_hourly_billing !== null && e.custom_hourly_billing !== undefined) ? "Custom Rates" : "Default Rates"}
                        </span>
                        <button onclick="openEditAssignmentRatesModal('${e.id}')" class="px-2 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1 border border-indigo-100 shadow-sm" title="Edit Custom Rates">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> Edit Rates
                        </button>
                    </div>
                </div>
            `,
        )
        .join("");

      return `
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">Resource Control</h3>
                        <p class="text-sm text-slate-500">Manage who has access to log timesheets and set custom billing rates per employee.</p>
                    </div>
                    <button onclick="openAssignmentModal()" class="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2">
                        <i data-lucide="user-plus" class="w-4 h-4"></i> Assign Member
                    </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    ${teamHtml || '<div class="col-span-full text-center p-8 text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">No team members assigned to this project yet.</div>'}
                </div>
            `;
    }

    // Sub-Tab: Tasks Ledger
    function getProjectTasksTab(tasks) {
      const sortedTasks = [...tasks].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      const rows =
        sortedTasks
          .map((t) => {
            const date = new Date(
              t.date || t.created_at,
            ).toLocaleDateString();
            const isDev = t.task_type === "developer";
            const employee = state.allEmployees.find(
              (e) => e.id === t.employee_id,
            );
            const empName = employee ? employee.full_name : "Unknown";
            const profit = parseFloat(t.profit_loss || 0);
            const profitClass =
              profit >= 0
                ? "text-brand-accent bg-emerald-50"
                : "text-brand-alert bg-rose-50";

            return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group" onclick="openTaskDetailsModal('${t.id}')">
                        <td class="px-4 py-3 whitespace-nowrap">
                            <div class="font-semibold text-slate-800 text-sm group-hover:text-brand-primary transition-colors">${empName}</div>
                            <div class="text-[11px] text-slate-500">${date}</div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
                                <i data-lucide="${isDev ? "terminal" : "video"}" class="w-3 h-3 mr-1 ${isDev ? "text-indigo-500" : "text-pink-500"}"></i> 
                                ${isDev ? "Engineering" : "Content"}
                                <span class="inline-flex items-center gap-1 text-[8px] font-bold ${
                                  t.task_status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  t.task_status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                } px-1.5 py-0.5 rounded ml-1.5 shrink-0">
                                    ${t.task_status || 'Completed'}
                                </span>
                                ${t.is_edited ? `
                                    <span class="inline-flex items-center gap-1 text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded ml-1.5 shrink-0" title="Edited by ${t.edited_by || 'Unknown'}">
                                        <i data-lucide="edit-2" class="w-2 h-2"></i> Edited
                                    </span>
                                ` : ''}
                            </div>
                            <div class="text-sm text-slate-700 line-clamp-2 w-64" title="${t.task_performed}">${t.task_performed}</div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 text-center">${parseFloat(t.hours_logged).toFixed(1)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-rose-600 text-right">${formatCurrency(t.employee_cost)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600 text-right">${formatCurrency(t.billing_amount)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-bold text-right"><span class="px-2 py-1 rounded ${profitClass}">${formatCurrency(profit)}</span></td>
                    </tr>
                `;
          })
          .join("") ||
        `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No timesheets recorded for this project yet.</td></tr>`;

      return `
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Employee & Date</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Task Description</th>
                                <th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Hours</th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Cost (Burn)</th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Billed (Earn)</th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-200">${rows}</tbody>
                    </table>
                </div>
            `;
    }

    function openTaskDetailsModal(taskId) {
      const t = state.allTasks.find(
        (task) => String(task.id) === String(taskId),
      );
      if (!t) return;

      const isDev = t.task_type === "developer";
      const employee = state.allEmployees.find((e) => e.id === t.employee_id);
      const empName = employee ? employee.full_name : "Unknown Employee";
      const dateStr = new Date(t.date || t.created_at).toLocaleString();

      const project = state.allProjects.find((p) => p.id === t.project_id);
      const projName = project ? project.name : "General Task";

      const sprintVal = t.sprint || "N/A";
      const moduleVal = t.module || "N/A";
      const featureVal = t.feature || "N/A";
      const ticketVal = t.ticket_id || "N/A";
      const workTypeVal = t.work_type || "N/A";
      const statusVal = t.task_status || "Completed";

      let overtimeBadge = '';
      if (t.is_overtime) {
        overtimeBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 mt-1">
              <i data-lucide="clock" class="w-3 h-3"></i> Extended Shift
          </span>
        `;
      }

      let handoverDetailsCard = '';
      if (t.is_handover || t.handover_source_task_id) {
        const colleague = state.allEmployees.find((e) => e.id === t.handover_for_employee_id);
        const colleagueName = colleague ? colleague.full_name : "Unknown Employee";

        if (t.handover_source_task_id) {
          const origTask = state.allTasks.find((task) => String(task.id) === String(t.handover_source_task_id));
          const origDetailsHtml = origTask ? `
            <div class="mt-2 pt-2 border-t border-emerald-100/60">
              <p class="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Original Task Reference</p>
              <p class="text-xs text-slate-700 mt-1 font-medium whitespace-pre-wrap">${origTask.task_performed}</p>
            </div>
          ` : '';

          handoverDetailsCard = `
            <div class="bg-emerald-55/35 border border-emerald-200 rounded-xl p-3 mb-3 text-xs">
              <h5 class="font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <i data-lucide="check-check" class="w-3.5 h-3.5 text-emerald-600"></i> Handover Completed
              </h5>
              <p class="text-emerald-950 font-medium">Logged by ${empName} covering colleague ${colleagueName}.</p>
              ${origDetailsHtml}
            </div>
          `;
        } else {
          handoverDetailsCard = `
            <div class="bg-indigo-50/30 border border-indigo-200 rounded-xl p-3 mb-3 text-xs">
              <h5 class="font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <i data-lucide="share-2" class="w-3.5 h-3.5 text-indigo-600"></i> Handover Assigned
              </h5>
              <p class="text-indigo-950 font-medium">Assigned by ${empName} to covered colleague ${colleagueName}.</p>
            </div>
          `;
        }
      }

      let extraDetails = "";
      if (isDev) {
        extraDetails = `
                    <div class="bg-slate-50/40 border border-slate-150 rounded-xl p-3 mb-3">
                        <span class="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <i data-lucide="git-branch" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i> Git & Repository Details
                        </span>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase block">Repository</span>
                                <span class="font-semibold text-slate-800 truncate block" title="${t.github_repo_name || 'N/A'}">${t.github_repo_name || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase block">Branch</span>
                                <span class="font-semibold text-slate-800 truncate block" title="${t.github_branch_name || 'N/A'}">${t.github_branch_name || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase block">Commits</span>
                                <span class="font-bold text-slate-850 block">${t.github_commit_count || 0}</span>
                            </div>
                            <div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase block">PR Created?</span>
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${t.github_pr_created === 'Yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}">
                                    ${t.github_pr_created || 'No'}
                                </span>
                            </div>
                        </div>
                        ${t.github_link && t.github_link !== "N/A" ? `
                        <div class="mt-2 pt-2 border-t border-slate-150 flex items-center gap-2">
                            <span class="text-[9px] font-bold text-slate-400 uppercase shrink-0">Link:</span>
                            <a href="${t.github_link}" target="_blank" class="text-xs font-semibold text-indigo-650 hover:underline truncate">${t.github_link}</a>
                        </div>
                        ` : ''}
                    </div>

                    <div class="bg-slate-50/40 p-2.5 rounded-xl border border-slate-150 mb-3 flex items-center gap-3">
                        <span class="text-[10px] font-bold text-slate-450 uppercase tracking-wider shrink-0">Tech Stack</span>
                        <div class="flex flex-wrap gap-1">
                            ${(t.tech_stack && t.tech_stack !== 'N/A' ? t.tech_stack.split(',').map(tag => `
                                <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 shadow-sm">${tag.trim()}</span>
                            `).join('') : '<span class="text-[10px] text-slate-550 font-bold">N/A</span>')}
                        </div>
                    </div>

                    <div class="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50 mb-3 text-xs">
                        <span class="font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <i data-lucide="compass" class="w-3.5 h-3.5 text-indigo-500"></i> Tomorrow's Strategy
                        </span>
                        <p class="text-indigo-950 font-medium whitespace-pre-wrap">${t.tomorrow_plan || "N/A"}</p>
                    </div>
                `;
      } else {
        let customVals = {};
        try {
          customVals = t.custom_field_values ? (typeof t.custom_field_values === 'string' ? JSON.parse(t.custom_field_values) : t.custom_field_values) : {};
        } catch(e) {
          customVals = {};
        }

        let customFieldsHtml = '';
        if (customVals && typeof customVals === 'object' && Object.keys(customVals).length > 0) {
          const fieldsList = Object.entries(customVals).map(([k, v]) => `
            <div class="bg-indigo-50/30 px-3 py-1.5 rounded-lg border border-indigo-100/60 flex items-center justify-between">
                <span class="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3 h-3 text-indigo-500 shrink-0"></i> ${k}</span>
                <span class="text-sm font-black text-indigo-950">${v}</span>
            </div>
          `).join('');

          let deadlinesHtml = '';
          if (t.upload_deadline || t.next_delivery_date) {
            deadlinesHtml = `
              <div class="bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200/60 col-span-2 mt-1 grid grid-cols-2 gap-4 text-xs">
                  <div>
                      <span class="text-[9px] font-black text-slate-450 uppercase block">Upload Deadline</span>
                      <span class="font-bold text-slate-700">${t.upload_deadline !== 'N/A' && t.upload_deadline ? new Date(t.upload_deadline).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                      <span class="text-[9px] font-black text-slate-450 uppercase block">Next Date of Giving</span>
                      <span class="font-bold text-slate-700">${t.next_delivery_date !== 'N/A' && t.next_delivery_date ? new Date(t.next_delivery_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
              </div>
            `;
          }

          customFieldsHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              ${fieldsList}
              ${deadlinesHtml}
            </div>
          `;
        } else {
          customFieldsHtml = `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              <div class="bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-550 uppercase flex items-center gap-1"><i data-lucide="smartphone" class="w-3.5 h-3.5 text-pink-500"></i> Reels</span>
                  <span class="text-sm font-bold text-slate-800">${t.reels_count || 0}</span>
              </div>
              <div class="bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-550 uppercase flex items-center gap-1"><i data-lucide="youtube" class="w-3.5 h-3.5 text-red-500"></i> Videos</span>
                  <span class="text-sm font-bold text-slate-800">${t.long_video_count || 0}</span>
              </div>
              <div class="bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-555 uppercase flex items-center gap-1"><i data-lucide="image" class="w-3.5 h-3.5 text-indigo-500"></i> Posters</span>
                  <span class="text-sm font-bold text-slate-800">${t.poster_count || 0}</span>
              </div>
              <div class="bg-slate-50/50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-555 uppercase flex items-center gap-1"><i data-lucide="phone-call" class="w-3.5 h-3.5 text-emerald-500"></i> Calls</span>
                  <span class="text-sm font-bold text-slate-800">${t.calls_made || 0}</span>
              </div>
            </div>
          `;
        }

        extraDetails = `
                    <div class="mb-3">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deliverables Tracking</span>
                        ${customFieldsHtml}
                    </div>
                    
                    <div class="bg-slate-50/40 p-2.5 rounded-xl border border-slate-150 mb-3 flex items-center gap-3">
                        <span class="text-[10px] font-bold text-slate-455 uppercase tracking-wider shrink-0">Platforms</span>
                        <div class="flex flex-wrap gap-1">
                            ${(t.platform && t.platform !== 'N/A' ? t.platform.split(',').map(tag => `
                                <span class="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg border border-rose-100 shadow-sm">${tag.trim()}</span>
                            `).join('') : '<span class="text-[10px] text-slate-550 font-bold">N/A</span>')}
                        </div>
                    </div>
                `;
      }

      const editedBanner = t.is_edited ? `
                        <!-- Edited Banner -->
                        <div class="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-600"></i>
                            <span class="text-xs font-bold">Edited by ${t.edited_by || 'Unknown'}</span>
                        </div>
      ` : "";

      const html = `
                <div class="p-1 text-left">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-brand-primary text-lg font-bold">
                            ${empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-base leading-tight">${empName}</h4>
                            <p class="text-xs text-slate-500">${dateStr}</p>
                        </div>
                        <div class="ml-auto text-right">
                            <div class="flex flex-col items-end gap-0.5">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isDev ? "bg-indigo-100 text-indigo-700" : "bg-pink-100 text-pink-700"}">
                                    <i data-lucide="${isDev ? "terminal" : "video"}" class="w-2.5 h-2.5"></i>
                                    ${isDev ? "Engineering" : "Content"}
                                </span>
                                ${overtimeBadge}
                            </div>
                            <div class="text-xs font-bold mt-0.5 text-slate-650">${parseFloat(t.hours_logged).toFixed(1)} hrs logged</div>
                        </div>
                    </div>

                    ${editedBanner}
                    ${handoverDetailsCard}

                    <!-- Dense Metadata Panel -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-150 text-xs mb-3">
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Workspace</span>
                            <span class="font-bold text-slate-800 truncate block" title="${projName}">${projName}</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Status</span>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              statusVal === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              statusVal === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }">${statusVal}</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Ticket ID</span>
                            <span class="font-bold text-slate-700 block">${ticketVal}</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Work Type</span>
                            <span class="font-bold text-slate-700 block">${workTypeVal}</span>
                        </div>
                        ${!isDev ? '' : `
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Sprint</span>
                            <span class="font-bold text-slate-700 block">${sprintVal}</span>
                        </div>
                        <div>
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Module</span>
                            <span class="font-bold text-slate-700 block">${moduleVal}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-[9px] font-black text-slate-455 uppercase block">Feature</span>
                            <span class="font-bold text-slate-700 truncate block" title="${featureVal}">${featureVal}</span>
                        </div>
                        `}
                        ${(!t.project_id && t.no_project_reason && t.no_project_reason !== "N/A") ? `
                        <div class="col-span-2">
                            <span class="text-[9px] font-black text-slate-455 uppercase block">No Project Reason</span>
                            <span class="font-bold text-slate-700 truncate block" title="${t.no_project_reason}">${t.no_project_reason}</span>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Task Executed Narrative -->
                    <div class="bg-slate-50/50 border border-slate-200 rounded-xl p-3 mb-3 text-xs">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Narrative / Executed</span>
                        <p class="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">${t.task_performed}</p>
                    </div>

                    ${extraDetails}

                    <div class="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button onclick="window.openAdminEditTaskModal('${t.id}', '${t.task_type}')" class="px-4 py-2 bg-brand-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Entry
                        </button>
                        <button onclick="closeModal()" class="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-200 transition-colors focus:outline-none">Close Details</button>
                    </div>
                </div>
            `;
      openModal("Task Log Inspection", html);
    }

    window.showExpenseDetails = function (expenseId) {
      const e = state.projectExpenses.find(x => x.id === expenseId);
      if (!e) return;

      const html = `
        <div class="space-y-6 text-left">
          <div class="bg-rose-50/50 rounded-2xl p-5 border border-rose-100/50 flex items-center justify-between">
            <div>
              <span class="text-[9px] font-black tracking-widest text-rose-500 uppercase">Expense Record</span>
              <h4 class="text-lg font-black text-slate-800 mt-0.5">${e.expense_name}</h4>
            </div>
            <div class="px-4 py-2 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-lg font-extrabold shadow-sm">
              ${formatCurrency(e.amount)}
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <i data-lucide="calendar" class="w-4 h-4 text-rose-600"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Expense</p>
                <p class="text-sm font-semibold text-slate-800">${e.expense_date !== "N/A" ? new Date(e.expense_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}</p>
              </div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <i data-lucide="clock" class="w-4 h-4 text-rose-600"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logged Timestamp</p>
                <p class="text-sm font-semibold text-slate-800">${e.created_at ? new Date(e.created_at).toLocaleString() : "N/A"}</p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-500"></i> Expense Narrative / Description
            </label>
            <p class="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed min-h-[80px] whitespace-pre-wrap">${e.description || "No description provided."}</p>
          </div>
        </div>
      `;
      openModal("Expense Details Log", html);
    };

    window.showPaymentDetails = function (paymentId) {
      const pm = (state.activeProjectPayments || []).find(x => x.id === paymentId);
      if (!pm) return;

      const html = `
        <div class="space-y-6 text-left">
          <div class="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/50 flex items-center justify-between">
            <div>
              <span class="text-[9px] font-black tracking-widest text-emerald-600 uppercase">Payment Receipt</span>
              <h4 class="text-lg font-black text-slate-800 mt-0.5">${pm.payment_method} Transfer</h4>
            </div>
            <div class="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-lg font-extrabold shadow-sm">
              ${formatCurrency(pm.amount)}
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <i data-lucide="calendar" class="w-4 h-4 text-emerald-600"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Date</p>
                <p class="text-sm font-semibold text-slate-800">${pm.payment_date ? new Date(pm.payment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}</p>
              </div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <i data-lucide="file-text" class="w-4 h-4 text-emerald-600"></i>
              </div>
              <div class="min-w-0 flex-1 flex flex-col justify-center">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Ref #</p>
                <p class="text-xs font-mono font-bold text-slate-700 mt-0.5 select-all bg-white px-2 py-0.5 rounded border border-slate-200 w-fit">${pm.reference_number || "N/A"}</p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-emerald-500"></i> Executive Remarks
            </label>
            <p class="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed min-h-[80px] whitespace-pre-wrap">${pm.remarks || "No remarks logged."}</p>
          </div>
        </div>
      `;
      openModal("Payment Ledger Entry Details", html);
    };

    function getProjectExpensesTab(p) {
      let totalExpenses = 0;
      let expenseHtml = "";


      if (!state.projectExpenses || state.projectExpenses.length === 0) {
        expenseHtml =
          '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No expenses recorded yet.</td></tr>';
      } else {
        expenseHtml = state.projectExpenses
          .map((e) => {
            totalExpenses += parseFloat(e.amount);
            return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 group cursor-pointer" onclick="showExpenseDetails('${e.id}')">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${e.expense_name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${e.expense_date !== "N/A" ? new Date(e.expense_date).toLocaleDateString() : "N/A"}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-600">${formatCurrency(e.amount)}</td>
                        <td class="px-6 py-4 text-sm text-slate-500 line-clamp-1 max-w-[200px]" title="${e.description}">${e.description}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                ${state.user && state.user.access_level === 'SystemAdmin' ? `
                                <button onclick="event.stopPropagation(); openEditExpenseModal('${e.id}')" class="text-slate-400 hover:text-brand-primary p-1.5 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                                <button onclick="event.stopPropagation(); deleteExpense('${e.id}')" class="text-slate-400 hover:text-brand-alert p-1.5 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
          })
          .join("");
      }

      return `
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">Financial Ledger</h3>
                        <p class="text-sm text-slate-500">Log software, marketing, or miscellaneous project expenses.</p>
                    </div>
                    <button onclick="openAddExpenseModal()" class="bg-brand-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Expense
                    </button>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h4 class="font-bold text-slate-700 text-sm uppercase tracking-wider">Total Extra Expenses</h4>
                        <span class="text-xl font-black text-rose-600">${formatCurrency(totalExpenses)}</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-white border-b border-slate-200">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Expense Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes</th>
                                    <th class="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-100">
                                ${expenseHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    }

    function getProjectPaymentsTab(p) {

      const payments = state.activeProjectPayments || [];

      if (payments.length === 0) {
        paymentHtml = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No payments recorded yet.</td></tr>';
      } else {
        paymentHtml = payments.map(pm => `
                <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 group cursor-pointer" onclick="showPaymentDetails('${pm.id}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${new Date(pm.payment_date).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">${formatCurrency(pm.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${pm.payment_method}</td>
                    <td class="px-6 py-4 text-sm text-slate-500 truncate max-w-[150px]" title="${pm.reference_number}">${pm.reference_number}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        <button onclick="event.stopPropagation(); deletePayment('${pm.id}')" class="text-slate-400 hover:text-brand-alert p-1.5 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
      }



      const todayStr = new Date().toISOString().split('T')[0];

      return `
            <!-- Billing Details Card -->
            <div class="bg-gradient-to-r from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="w-full">
                    <h4 class="text-sm font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <i data-lucide="receipt-text" class="w-4 h-4 text-indigo-600"></i> Project Billing Profile
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-3">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Type</span>
                            <span class="text-sm font-bold text-slate-800">${p.cost_type || "N/A"}</span>
                        </div>
                        ${p.cost_type === "Fixed Price" ? `
                        <div class="sm:col-span-2">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Terms & Kind</span>
                            <span class="text-sm font-bold text-indigo-700">${p.billing_cycle && p.billing_cycle !== "N/A" ? p.billing_cycle : "Not Configured"}</span>
                        </div>
                        ` : (p.cost_type === "Monthly Retainer" || p.cost_type === "Time & Material" || p.cost_type === "Time and Material" || p.cost_type === "Hourly Billing") ? `
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recurrence & Rate</span>
                            <span class="text-sm font-bold text-emerald-600">${formatCurrency(p.billing_rate || 0)} (${p.billing_cycle && p.billing_cycle !== "N/A" ? p.billing_cycle : "Monthly"})</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next Invoice Date & Time</span>
                            <span class="text-sm font-bold text-rose-600">${p.next_billing_date && p.next_billing_date !== "N/A" ? `${new Date(p.next_billing_date).toLocaleDateString()} ${p.next_billing_time && p.next_billing_time !== "N/A" ? `at ${p.next_billing_time}` : ""}` : "N/A"}</span>
                        </div>
                        ` : `
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                            <span class="text-sm font-semibold text-slate-500">Non-Billable Internal</span>
                        </div>
                        `}
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-lg font-bold text-slate-800">Client Payments Ledger</h3>
                    <p class="text-sm text-slate-500">Track and manage installments received from the client.</p>
                </div>
                                <button onclick="openAddPaymentModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Record Payment
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                ${(function () {
                  const activePayments = state.activeProjectPayments || [];
                  const computedTotalPaid = activePayments.length > 0
                    ? activePayments.reduce((sum, pm) => sum + parseFloat(pm.amount || 0), 0)
                    : (parseFloat(p.total_paid || 0));
                  const contractValue = parseFloat(p.client_cost || 0);
                  const computedPending = Math.max(0, contractValue - computedTotalPaid);

                  return `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Value</p>
                    <p class="text-xl font-black text-slate-800">${formatCurrency(contractValue)}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                    <p class="text-xl font-black text-emerald-600">${formatCurrency(computedTotalPaid)}</p>
                </div>
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                    <p class="text-xl font-black text-rose-600">${formatCurrency(computedPending)}</p>
                </div>
                  `;
                })()}
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Method</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ref #</th>
                            <th class="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-100">
                        ${paymentHtml}
                    </tbody>
                </table>
            </div>

            <!-- Client Receivables Reminder Checklist Section -->
            <div class="mt-8 border-t border-slate-200 pt-8">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">Client Receivables & Payment Reminders</h3>
                        <p class="text-sm text-slate-500 font-medium mt-0.5">Set up scheduled client payments (like hosting, support retainer, or custom milestones) with reminders.</p>
                    </div>
                    <button onclick="openAddReceivableModal()" class="bg-brand-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Set Up Receivable
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Item Name / Title</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Cycle / Frequency</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Due Date</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-100">
                            ${(function () {
          const recs = state.projectReceivables || [];
          if (recs.length === 0) {
            return `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No client receivables configured.</td></tr>`;
          }
          return recs.map(r => {
            const isDue = !r.is_done && r.due_date <= todayStr;
            const statusBadge = r.is_done
              ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-600">Completed</span>`
              : isDue
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-600 animate-pulse">Due / Overdue</span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600">Pending</span>`;
            return `
                                        <tr class="hover:bg-slate-50 transition-colors group">
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">${r.item_name}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${r.frequency}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium ${isDue ? 'text-rose-600' : ''}">${new Date(r.due_date).toLocaleDateString()}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">${formatCurrency(r.amount)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div class="flex items-center justify-end gap-2">
                                                    ${!r.is_done ? `
                                                    <button onclick="handleReceivableReminderDone('${r.id}')" class="text-slate-400 hover:text-emerald-600 p-1.5 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1" title="Mark Paid / Done">
                                                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> <span class="text-[10px]">Mark Received</span>
                                                    </button>
                                                    ` : ''}
                                                    <button onclick="deleteClientReceivable('${r.id}')" class="text-slate-400 hover:text-brand-alert p-1.5 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
          }).join("");
        })()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function openAddPaymentModal() {
      const p = state.activeProject;
      if (!p) return;

      const html = `
            <form onsubmit="handlePaymentSave(event)" class="space-y-4">
                <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-4">
                    <p class="text-xs text-emerald-800 font-medium italic">Recording payment for project: <span class="font-bold">${p.name}</span></p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                    <input type="number" id="pay_amount" required step="0.01" min="1" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="0.00">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Date *</label>
                        <input type="date" id="pay_date" required class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Method</label>
                        <select id="pay_method" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Reference Number / Transaction ID</label>
                    <input type="text" id="pay_ref" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="e.g. TXN123456789">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Remarks</label>
                    <textarea id="pay_remarks" rows="2" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm resize-none" placeholder="Notes about this installment..."></textarea>
                </div>
                <div id="paymentErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm flex items-start shadow-sm">
                    <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                    <span id="paymentErrorMessage">Error message</span>
                </div>
                <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                    <button type="submit" id="btnSubmitPayment" class="px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i> Save Payment
                    </button>
                </div>
            </form>
        `;
      openModal("Record Client Installment", html);
      document.getElementById('pay_date').valueAsDate = new Date();
    }

    async function handlePaymentSave(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitPayment");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Processing...';
      btn.disabled = true;

      try {
        const payload = {
          project_id: state.activeProject.id,
          amount: parseFloat(document.getElementById("pay_amount").value),
          payment_date: new Date(document.getElementById("pay_date").value).toISOString(),
          payment_method: document.getElementById("pay_method").value,
          reference_number: document.getElementById("pay_ref").value || "N/A",
          remarks: document.getElementById("pay_remarks").value || "N/A"
        };

        await apiFetch("/projects/payments/create", {
          method: "POST",
          body: payload
        });

        showToast("Payment recorded successfully", "success");
        closeModal();
        await loadAdminWorkspaceData(); // Refresh global project data (for updated pending_amount)
        await openProjectDetails(state.activeProject.id); // Refresh active project
        state.activeProjectTab = "payments"; // Maintain tab
        renderAdminApp();
      } catch (err) {
        const errBanner = document.getElementById("paymentErrorBanner");
        const errSpan = document.getElementById("paymentErrorMessage");
        if (errSpan) errSpan.innerText = err.message;
        if (errBanner) errBanner.classList.remove("hidden");
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }

    async function deletePayment(paymentId) {
      const isConfirmed = await customConfirm(
        "Delete Payment Record",
        "Are you sure you want to delete this payment record? This will revert the project's financial status.",
        "Delete Record",
        "Keep It",
        true
      );
      if (!isConfirmed) return;

      try {
        await apiFetch(`/projects/payments/delete/${paymentId}`, {
          method: "DELETE"
        });
        showToast("Payment record removed", "success");
        await loadAdminWorkspaceData();
        await openProjectDetails(state.activeProject.id);
        state.activeProjectTab = "payments";
        renderAdminApp();
      } catch (err) {
        showToast("Failed to delete payment: " + err.message, "error");
      }
    }


function openAddExpenseModal() {
  const p = state.activeProject;
  if (!p) return;

  const html = `
    <form onsubmit="handleExpenseSave(event)" class="space-y-4">
        <!-- Expense Name -->
        <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Expense Name / Title *</label>
            <input type="text" id="expense_name" required placeholder="e.g., AWS Hosting, Ads..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
        </div>

        <!-- Amount and Date -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                <input type="number" id="expense_amount" required step="0.01" min="0.01" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="0.00">
            </div>
            <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input type="date" id="expense_date" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
            </div>
        </div>

        <!-- Description -->
        <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea id="expense_desc" rows="3" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm resize-y" placeholder="Additional details..."></textarea>
        </div>

        <!-- Error Banner -->
        <div id="expenseErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
            <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
            <span id="expenseErrorMessage">Error message</span>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" id="btnSubmitExpense" class="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Add Expense
            </button>
        </div>
    </form>
  `;
  openModal("Log Project Expense", html);
}


    async function handleExpenseSave(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitExpense");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;
      document.getElementById("expenseErrorBanner").classList.add("hidden");

      try {
        const payload = {
          project_id: state.activeProject.id,
          expense_name: document.getElementById("expense_name").value,
          amount: parseFloat(document.getElementById("expense_amount").value),
        };

        const ed = document.getElementById("expense_date").value;
        const desc = document.getElementById("expense_desc").value;
        if (ed) payload.expense_date = new Date(ed).toISOString();
        if (desc) payload.description = desc;

        await apiFetch("/projects/expenses/create", {
          method: "POST",
          body: payload,
        });
        showToast("Expense logged successfully", "success");
        closeModal();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        document.getElementById("expenseErrorMessage").innerText =
          err.message;
        document
          .getElementById("expenseErrorBanner")
          .classList.remove("hidden");
        document.getElementById("expenseErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }


    window.openEditExpenseModal = function (expenseId) {
      const e = state.projectExpenses.find(x => x.id === expenseId);
      if (!e) return;

      let formattedDate = "";
      if (e.expense_date && e.expense_date !== "N/A") {
        formattedDate = new Date(e.expense_date).toISOString().split('T')[0];
      }

      const html = `
            <form onsubmit="handleExpenseUpdate(event, '${e.id}')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Expense Name / Title *</label>
                        <input type="text" id="edit_expense_name" required value="${e.expense_name}" placeholder="e.g., AWS Hosting, Ads..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                            <input type="number" id="edit_expense_amount" required step="0.01" min="0.01" value="${e.amount}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="0.00">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                            <input type="date" id="edit_expense_date" value="${formattedDate}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
                        <textarea id="edit_expense_desc" rows="3" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm resize-y" placeholder="Additional details...">${e.description || ""}</textarea>
                    </div>
                    <div id="editExpenseErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="editExpenseErrorMessage">Error message</span>
                    </div>

                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnUpdateExpense" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Save Changes
                        </button>
                    </div>
            </form>
      `;
      openModal("Edit Project Expense", html);
    };

    window.handleExpenseUpdate = async function (event, expenseId) {
      event.preventDefault();
      const btn = document.getElementById("btnUpdateExpense");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;
      document.getElementById("editExpenseErrorBanner").classList.add("hidden");

      try {
        const payload = {
          expense_name: document.getElementById("edit_expense_name").value,
          amount: parseFloat(document.getElementById("edit_expense_amount").value),
        };

        const ed = document.getElementById("edit_expense_date").value;
        const desc = document.getElementById("edit_expense_desc").value;
        if (ed) payload.expense_date = new Date(ed).toISOString();
        if (desc) payload.description = desc;

        await apiFetch(`/projects/expenses/update/${expenseId}`, {
          method: "PUT",
          body: payload,
        });
        showToast("Expense updated successfully", "success");
        closeModal();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        document.getElementById("editExpenseErrorMessage").innerText =
          err.message;
        document
          .getElementById("editExpenseErrorBanner")
          .classList.remove("hidden");
        document.getElementById("editExpenseErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    };

    window.openAddReceivableModal = function () {
      const p = state.activeProject;
      if (!p) return;

      const html = `
            <form onsubmit="handleReceivableSave(event)" class="space-y-4">
                <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                    <p class="text-xs text-indigo-800 font-medium italic">Setting up Client Receivable for: <span class="font-bold">${p.name}</span></p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Item / Charge Name *</label>
                    <input type="text" id="rec_item_name" required placeholder="e.g. Server Payment, Domain, Retainer..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                        <input type="number" id="rec_amount" required step="0.01" min="0" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Frequency *</label>
                        <select id="rec_frequency" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            <option value="Custom Date">One-time / Custom Date</option>
                            <option value="Monthly">Monthly Recurring</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1">Due Date *</label>
                    <input type="date" id="rec_due_date" required class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                </div>
                <div id="receivableErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                    <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                    <span id="receivableErrorMessage">Error message</span>
                </div>

                <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                    <button type="submit" id="btnSubmitReceivable" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i> Add Setup
                    </button>
                </div>
            </form>
      `;
      openModal("Set Up Client Receivable", html);
    };

    window.handleReceivableSave = async function (event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitReceivable");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;
      document.getElementById("receivableErrorBanner").classList.add("hidden");

      try {
        const payload = {
          project_id: state.activeProject.id,
          item_name: document.getElementById("rec_item_name").value,
          amount: parseFloat(document.getElementById("rec_amount").value) || 0.0,
          frequency: document.getElementById("rec_frequency").value,
          due_date: document.getElementById("rec_due_date").value
        };

        await apiFetch("/projects/receivables/create", {
          method: "POST",
          body: payload
        });
        showToast("Receivable item added successfully", "success");
        closeModal();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        document.getElementById("receivableErrorMessage").innerText = err.message;
        document.getElementById("receivableErrorBanner").classList.remove("hidden");
        document.getElementById("receivableErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    };

    window.deleteClientReceivable = async function (receivableId) {
      const isConfirmed = await customConfirm(
        "Delete Receivable Config",
        "Are you sure you want to remove this client payment reminder configuration?",
        "Delete",
        "Cancel",
        true
      );
      if (!isConfirmed) return;

      try {
        await apiFetch(`/projects/receivables/delete/${receivableId}`, {
          method: "DELETE"
        });
        showToast("Receivable item removed successfully", "success");
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to remove: " + err.message, "error");
      }
    };

    window.showReceivableReminderPopup = function (r) {
      if (document.getElementById("receivableReminderModal")) return;

      const html = `
        <div id="receivableReminderModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                <h3 class="text-lg font-black text-slate-800 mb-2 flex items-center gap-2 mt-2">
                    <i data-lucide="bell-ring" class="w-5 h-5 text-amber-500 animate-bounce"></i> Client Payment Reminder
                </h3>
                
                <p class="text-sm text-slate-600 leading-relaxed mb-4">
                    The client receivable item <strong class="text-slate-800">"${r.item_name}"</strong> with amount <strong class="text-slate-800">${formatCurrency(r.amount)}</strong> is due on <span class="font-bold text-amber-600">${new Date(r.due_date).toLocaleDateString()}</span>.
                </p>

                <p class="text-xs text-slate-500 mb-6 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                    Clicking "Yes, Mark Received" will automatically log this payment in the project ledger and update/advance the cycle schedule.
                </p>

                <div class="flex gap-3 justify-end">
                    <button type="button" onclick="document.getElementById('receivableReminderModal').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">Remind Me Later</button>
                    <button type="button" onclick="handleReceivableReminderDone('${r.id}')" class="px-5 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-colors">Yes, Mark Received</button>
                </div>
            </div>
        </div>
      `;
      const div = document.createElement('div');
      div.id = 'receivableReminderModalContainer';
      div.innerHTML = html;
      document.body.appendChild(div);
      if (window.lucide) lucide.createIcons();
    };

    window.handleReceivableReminderDone = async function (id) {
      const modal = document.getElementById('receivableReminderModal');
      try {
        await apiFetch(`/projects/receivables/mark-done/${id}`, {
          method: 'PUT'
        });
        showToast("Receivable marked as done and payment logged!", "success");
        if (modal) modal.remove();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to mark receivable: " + err.message, "error");
      }
    };


    async function deleteExpense(expenseId) {
      const isConfirmed = await customConfirm(
        "Delete Expense",
        "Are you sure you want to delete this expense record?",
        "Delete",
        "Cancel",
        true,
      );
      if (!isConfirmed) return;
      try {
        await apiFetch(`/projects/expenses/delete/${expenseId}`, {
          method: "DELETE",
        });
        showToast("Expense deleted successfully", "success");
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to delete expense: " + err.message, "error");
      }
    }

    // Premium Time-Based Trajectory Engine
    window.renderMilestoneTrajectoryChart = function () {
      const ctx = document.getElementById("milestoneChart");
      if (!ctx) return;

      if (chartInstances.milestoneChart) {
        chartInstances.milestoneChart.destroy();
      }

      const p = state.activeProject;
      if (!p || !state.projectTimeline || state.projectTimeline.length === 0)
        return;

      // Sort milestones by delivery date (expected_end)
      const sortedTimelines = [...state.projectTimeline].sort(
        (a, b) => new Date(a.expected_end || a.expected_start) - new Date(b.expected_end || b.expected_start),
      );

      // Compute project temporal bounds with high-fidelity fallbacks
      let projStart = p.start_date
        ? new Date(p.start_date)
        : new Date(p.created_at || sortedTimelines[0].expected_start);
      let projEnd = p.end_date ? new Date(p.end_date) : new Date();

      // High-Precision Boundary Check: Ensure chart covers all milestones and project dates
      sortedTimelines.forEach(t => {
        const mS = new Date(t.expected_start);
        const mE = new Date(t.expected_end || t.expected_start);
        if (mS < projStart) projStart = mS;
        if (mE > projEnd) projEnd = mE;
      });

      // Ensure end date is not before start date for chart scales
      if (projEnd < projStart)
        projEnd = new Date(projStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      const increment = 100 / sortedTimelines.length;
      let cumulativeProgress = 0;

      const datasetData = [];
      // Project Kickoff Point (0% progress)
      datasetData.push({ x: projStart.getTime(), y: 0, milestone: null });

      sortedTimelines.forEach((t) => {
        cumulativeProgress += increment;
        // Plot the milestone completion point at its expected end date
        const mDate = new Date(t.expected_end || t.expected_start).getTime();

        let yVal = 0;
        if (t.status === "Completed") {
          yVal = cumulativeProgress;
        } else if (t.status === "In Progress" || t.status === "Active") {
          const milestoneTasks = state.allTasks.filter(
            (task) => task.milestone_id === t.id,
          );
          const total = milestoneTasks.length;

          // Timesheets are inherently "completed" logs and don't have a status.
          // Since there is no "total expected tasks" metric, we use an asymptotic curve
          // to show progression (up to ~90% of the increment) based on the volume of tasks logged.
          const partial = total > 0 ? increment * (1 - Math.pow(0.8, total)) : 0;

          yVal = cumulativeProgress - increment + partial;
        } else {
          yVal = Math.max(0, cumulativeProgress - increment);
        }

        datasetData.push({ x: mDate, y: yVal, milestone: t });
      });

      const primaryColor = "#4338ca"; // Indigo-700
      const successColor = "#10b981"; // Emerald-500
      const deadlineColor = "#f43f5e"; // Rose-500

      const gradient = ctx
        .getContext("2d")
        .createLinearGradient(0, 0, 0, 350);
      gradient.addColorStop(0, "rgba(79, 70, 229, 0.16)");
      gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");

      chartInstances.milestoneChart = new Chart(ctx, {
        type: "line",
        data: {
          datasets: [
            {
              label: "Project Velocity",
              data: datasetData,
              borderColor: "#4f46e5",
              borderWidth: 4,
              backgroundColor: gradient,
              fill: true,
              tension: 0.4,
              pointRadius: (ctx) => (ctx.raw && ctx.raw.milestone ? 7 : 4),
              pointBackgroundColor: (ctx) => {
                const m = ctx.raw ? ctx.raw.milestone : null;
                if (!m) return "#ffffff";
                return m.status === "Completed" ? successColor : "#ffffff";
              },
              pointBorderColor: (ctx) => {
                const m = ctx.raw ? ctx.raw.milestone : null;
                if (!m) return primaryColor;
                return m.status === "Completed" ? "#ffffff" : primaryColor;
              },
              pointBorderWidth: 3,
              pointHoverRadius: 10,
              pointHoverBackgroundColor: (ctx) =>
                ctx.raw &&
                  ctx.raw.milestone &&
                  ctx.raw.milestone.status === "Completed"
                  ? successColor
                  : primaryColor,
              pointHoverBorderColor: "#ffffff",
              pointHoverBorderWidth: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "time",
              time: {
                unit: "day",
                displayFormats: { day: "MMM d" },
              },
              min: projStart.getTime() - (12 * 60 * 60 * 1000),
              max: projEnd.getTime() + (24 * 60 * 60 * 1000),
              grid: { display: false },
              ticks: {
                font: { family: "Inter", size: 10, weight: "700" },
                color: "#94a3b8",
              },
            },
            y: {
              beginAtZero: true,
              max: 105,
              ticks: {
                callback: (v) => v + "%",
                font: { family: "Inter", size: 10, weight: "800" },
                color: "#94a3b8",
              },
              grid: {
                color: "rgba(226, 232, 240, 0.4)",
                drawBorder: false,
                borderDash: [5, 5],
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.98)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              titleFont: { family: "Inter", size: 13, weight: "bold" },
              bodyFont: { family: "Inter", size: 12 },
              padding: 16,
              cornerRadius: 12,
              displayColors: true,
              callbacks: {
                label: (context) => {
                  const dp = context.raw;
                  if (!dp.milestone) return "🏁 Project Initialization (0%)";
                  return [
                    `📈 Milestone: ${dp.milestone.milestone_name}`,
                    `⚡ Progress Value: ${context.parsed.y.toFixed(1)}%`,
                    `📍 Status: ${dp.milestone.status}`,
                    `📅 Expected End: ${new Date(dp.milestone.expected_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                  ];
                },
              },
            },
            annotation: {
              annotations: {
                deadlineLine: {
                  type: "line",
                  xMin: projEnd.getTime(),
                  xMax: projEnd.getTime(),
                  borderColor: deadlineColor,
                  borderWidth: 3,
                  borderDash: [6, 6],
                  label: {
                    display: true,
                    content: "PROJECT DEADLINE",
                    position: "start",
                    backgroundColor: deadlineColor,
                    color: "#fff",
                    font: { size: 10, weight: "900", family: "Inter" },
                    padding: 6,
                    borderRadius: 4,
                  },
                },
                todayLine: {
                  type: "line",
                  xMin: new Date().getTime(),
                  xMax: new Date().getTime(),
                  borderColor: "#64748b",
                  borderWidth: 2,
                  label: {
                    display: true,
                    content: "TODAY",
                    position: "end",
                    backgroundColor: "rgba(100, 116, 139, 0.9)",
                    color: "#fff",
                    font: { size: 9, weight: "bold", family: "Inter" },
                    padding: 4,
                    borderRadius: 4,
                  },
                },
              },
            },
          },
          interaction: { intersect: false, mode: "index" },
        },
      });
    };

    // Sub-Tab: Timeline
    function getProjectTimelineTab(p, pTasks) {
      let timelineHtml = "";

      if (!state.projectTimeline || state.projectTimeline.length === 0) {
        timelineHtml =
          '<div class="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-200 rounded-xl max-w-2xl bg-slate-50">No milestones recorded yet. Add the first milestone to track project progress.</div>';
      } else {
        timelineHtml = state.projectTimeline
          .map((t, idx) => {
            let statusColor = "bg-slate-500";
            let ringColor = "ring-slate-50";
            let borderColor = "border-slate-200";

            if (t.status === "Completed") {
              statusColor = "bg-emerald-500";
              borderColor = "border-emerald-200";
              ringColor = "ring-emerald-50";
            }
            if (t.status === "Active" || t.status === "In Progress") {
              statusColor = "bg-indigo-500";
              borderColor = "border-indigo-200";
              ringColor = "ring-indigo-50";
            }
            if (t.status === "Delayed") {
              statusColor = "bg-amber-500";
              borderColor = "border-amber-200";
              ringColor = "ring-amber-50";
            }

            const expectedStartStr = t.expected_start
              ? new Date(t.expected_start).toLocaleDateString()
              : "N/A";
            const actualStr = t.actual_start
              ? `Actual: ${new Date(t.actual_start).toLocaleDateString()}`
              : t.actual_end
                ? `Actual: ${new Date(t.actual_end).toLocaleDateString()}`
                : "";

            // Empirical Aggregation
            const milestoneTasks = pTasks.filter(
              (task) => task.milestone_id === t.id,
            );
            let loggedHours = 0;
            milestoneTasks.forEach((task) => {
              if (task.hours_logged)
                loggedHours += parseFloat(task.hours_logged);
            });

            return `
                    <div class="relative cursor-pointer group w-fit" onclick="openMilestoneDetails('${t.id}')">
                        <div class="absolute -left-[41px] w-5 h-5 ${statusColor} border-4 border-white rounded-full shadow-sm ring-2 ${ringColor} group-hover:scale-110 transition-transform"></div>
                        <div class="bg-white border ${borderColor} rounded-xl p-5 shadow-sm max-w-2xl hover:shadow-md transition-shadow relative">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex-1 pr-4">
                                    <h4 class="font-bold text-slate-900 group-hover:text-brand-primary transition-colors mb-1">${t.milestone_name}</h4>
                                    <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.status === "Completed" ? "bg-emerald-50 text-emerald-700" : t.status === "Active" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"} rounded-md">${t.status}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    ${t.status !== "Completed" ? `<button onclick="event.stopPropagation(); markMilestoneComplete('${t.id}')" class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Mark Complete"><i data-lucide="check-circle" class="w-5 h-5"></i></button>` : ""}
                                    <button onclick="event.stopPropagation(); deleteMilestone('${t.id}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Milestone"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                                </div>
                            </div>
                            <div class="flex items-center gap-4 text-xs font-medium text-slate-500 mb-3 border-b border-slate-100 pb-3">
                                <span><i data-lucide="calendar" class="w-3.5 h-3.5 inline mr-1"></i> Expected: ${expectedStartStr}</span>
                                ${actualStr ? `<span class="text-slate-600"><i data-lucide="check-circle" class="w-3.5 h-3.5 inline mr-1"></i> ${actualStr}</span>` : ""}
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone Execution</div>
                                <div class="flex gap-3">
                                    <span class="inline-flex items-center px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 text-xs font-bold shadow-sm">
                                        <i data-lucide="list-todo" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i> ${milestoneTasks.length} Tasks
                                    </span>
                                    <span class="inline-flex items-center px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-brand-primary text-xs font-bold shadow-sm">
                                        <i data-lucide="clock" class="w-3.5 h-3.5 mr-1.5 text-indigo-400"></i> ${loggedHours.toFixed(1)} Hrs Logged
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
          })
          .join("");
      }

      return `
                 <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">Milestone Ledger</h3>
                        <p class="text-sm text-slate-500">Track execution phases and delivery deadlines.</p>
                    </div>
                    <button onclick="openMilestoneModal()" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Milestone
                    </button>
                </div>
                <div class="relative border-l-2 border-indigo-100 ml-4 py-4 space-y-8 pl-8">
                    ${timelineHtml}
                </div>
            `;
    }

    // Sub-Tab: SRS & Documents
    function getProjectSRSTab(p) {
      let activeDoc =
        state.projectSRS.find((s) => s.id === state.activeSrsId) ||
        state.projectSRS[0];

      let sidebarHtml = state.projectSRS
        .map((s, idx) => {
          const isActive = activeDoc && activeDoc.id === s.id;
          const isCloud = s.file_url_or_path && s.file_url_or_path.startsWith("http");
          const isPasted = s.file_url_or_path === "[Pasted SRS Text]";
          return `
                    <div onclick="selectSRS('${s.id}')" class="p-3 border ${isActive ? "border-indigo-200 bg-indigo-50/50" : "border-slate-100 bg-white hover:bg-slate-50"} rounded-lg cursor-pointer flex justify-between items-center group transition-all">
                        <div>
                            <p class="text-sm font-bold ${isActive ? "text-indigo-900" : "text-slate-700 group-hover:text-brand-primary"} flex items-center gap-1">
                                ${s.version} - ${s.document_title}
                                ${isCloud ? '<i data-lucide="cloud" class="w-3 h-3 text-sky-500"></i>' : isPasted ? '<i data-lucide="align-left" class="w-3 h-3 text-emerald-500"></i>' : '<i data-lucide="file-text" class="w-3 h-3 text-slate-400"></i>'}
                            </p>
                            <p class="text-[10px] text-slate-500">By: ${s.approved_by || "Admin"} | ${new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        ${isActive ? '<i data-lucide="chevron-right" class="w-4 h-4 text-indigo-400"></i>' : ""}
                    </div>
                `;
        })
        .join("");

      if (state.projectSRS.length === 0) {
        sidebarHtml = `<div class="text-xs text-slate-400 p-4 text-center">No specification documents uploaded for this project yet.</div>`;
      }

      let viewerHtml = "";
      if (!activeDoc) {
        viewerHtml = `
                    <div class="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-white">
                        <i data-lucide="file-question" class="w-12 h-12 mb-3 opacity-20"></i>
                        <p class="text-sm">Select a document from the sidebar or upload a new one to view contents.</p>
                    </div>
                `;
      } else {
        const isCloud = activeDoc.file_url_or_path && activeDoc.file_url_or_path.startsWith("http");
        const isPasted = activeDoc.file_url_or_path === "[Pasted SRS Text]";
        let fileLink = "";
        if (isCloud) {
          fileLink = activeDoc.file_url_or_path;
        } else if (!isPasted && activeDoc.file_url_or_path) {
          fileLink = `${CONFIG.API_BASE_URL}/${activeDoc.file_url_or_path.replace(/\\/g, "/")}`;
        }

        // Construct Parsed Content View (Algorithms Output)
        let parsedContentHtml = "";
        try {
          const parsedData = JSON.parse(activeDoc.parsed_content);
          if (Array.isArray(parsedData)) {
            parsedContentHtml = parsedData
              .map((section) => {
                const headingHtml = `<h3 class="text-lg font-bold text-indigo-900 mt-6 mb-3 pb-2 border-b border-indigo-100 flex items-center gap-2">
                                <i data-lucide="bookmark" class="w-4 h-4 text-indigo-400"></i> ${section.heading}
                            </h3>`;
                const contentHtml = section.content
                  .map(
                    (p) =>
                      `<p class="mb-2 text-sm text-slate-700 leading-relaxed text-justify">${p}</p>`,
                  )
                  .join("");
                return `<div class="mb-8">${headingHtml}${contentHtml}</div>`;
              })
              .join("");
          } else {
            parsedContentHtml = `<p class="text-sm text-slate-700 whitespace-pre-wrap">${activeDoc.parsed_content}</p>`;
          }
        } catch (e) {
          // Fallback for legacy text format
          const safeText =
            activeDoc.parsed_content ||
            "No raw text parsed from this document. It may be an image-only PDF or an un-fetchable cloud link.";
          parsedContentHtml = safeText
            .split("\n\n")
            .map(
              (p) =>
                `<p class="mb-3 text-sm text-slate-700 leading-relaxed">${p}</p>`,
            )
            .join("");
        }

        viewerHtml = `
                    <div class="flex flex-col h-full bg-white">
                        <div class="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <div class="flex items-center gap-2">
                                <div class="p-1.5 ${isCloud ? "bg-sky-50 text-sky-600" : isPasted ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"} rounded">
                                    <i data-lucide="${isCloud ? "cloud" : isPasted ? "align-left" : "file-pdf"}" class="w-4 h-4"></i>
                                </div>
                                <div>
                                    <span class="font-bold text-sm text-slate-800">${activeDoc.document_title}</span>
                                    <span class="text-[10px] text-slate-500 ml-2">Version: ${activeDoc.version}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                ${isPasted ? '' : `
                                <button onclick="toggleSRSView()" class="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 shadow-sm">
                                    <i data-lucide="code" class="w-3 h-3"></i> <span id="srs-toggle-text">Show Parsed Text</span>
                                </button>
                                `}
                                <button onclick="deleteSRS('${activeDoc.id}')" class="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1 shadow-sm">
                                    <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                                </button>
                                ${isPasted ? '' : `
                                <a href="${fileLink}" target="_blank" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-sm">
                                    <i data-lucide="external-link" class="w-3 h-3"></i> Open Original
                                </a>
                                `}
                            </div>
                        </div>
                        
                        <!-- SINGLE PANE VIEWER WITH TOGGLE -->
                        <div class="flex-1 relative overflow-hidden bg-slate-100" style="min-height: 500px;">
                            
                            ${isPasted ? `
                            <!-- Pasted Text Pane -->
                            <div class="w-full h-full bg-white flex flex-col relative">
                                <div class="absolute top-0 left-0 right-0 bg-indigo-900 text-indigo-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 z-10 flex justify-between shadow-sm">
                                    <span>Pasted Specification Text</span>
                                    <span>Formatted Pre-wrap View</span>
                                </div>
                                <pre class="p-6 pt-10 overflow-y-auto h-full w-full custom-scrollbar selection:bg-indigo-100 selection:text-indigo-900 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-sans">${activeDoc.srs_text || activeDoc.parsed_content || 'No text content available.'}</pre>
                            </div>
                            ` : `
                            <!-- Visual Viewer Pane -->
                            <div id="srs-visual-pane" class="w-full h-full flex flex-col relative">
                                <iframe src="${fileLink}" class="w-full h-full border-0 bg-white"></iframe>
                            </div>

                            <!-- Parsed Algorithm Text Pane -->
                            <div id="srs-parsed-pane" class="w-full h-full bg-white flex flex-col relative hidden">
                                <div class="absolute top-0 left-0 right-0 bg-indigo-900 text-indigo-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1 z-10 flex justify-between shadow-sm">
                                    <span>Parsed Machine Text</span>
                                    <span>Algorithm Output</span>
                                </div>
                                <div class="p-6 pt-10 overflow-y-auto h-full w-full custom-scrollbar selection:bg-indigo-100 selection:text-indigo-900">
                                    ${parsedContentHtml}
                                </div>
                            </div>
                            `}

                        </div>
                    </div>
                `;
      }

      return `
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                    <div class="lg:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                        <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h4 class="font-bold text-slate-800 text-sm uppercase tracking-wider">Doc Vault</h4>
                            <button onclick="openAddSRSModal()" class="p-1.5 bg-indigo-50 text-brand-primary rounded hover:bg-indigo-100 transition-colors" title="Upload New Spec">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            ${sidebarHtml}
                        </div>
                    </div>
                    
                    <div class="lg:col-span-3 border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col bg-slate-100 max-h-[600px]">
                        ${viewerHtml}
                    </div>
                </div>
            `;
    }

    function selectSRS(srsId) {
      state.activeSrsId = srsId;
      renderAdminApp(); // re-renders the active tab
    }

    function toggleSRSView() {
      const visual = document.getElementById("srs-visual-pane");
      const parsed = document.getElementById("srs-parsed-pane");
      const toggleText = document.getElementById("srs-toggle-text");

      if (visual.classList.contains("hidden")) {
        visual.classList.remove("hidden");
        parsed.classList.add("hidden");
        toggleText.innerText = "Show Parsed Text";
      } else {
        visual.classList.add("hidden");
        parsed.classList.remove("hidden");
        toggleText.innerText = "Show Original PDF";
      }
    }

    async function deleteSRS(srsId) {
      const isConfirmed = await customConfirm(
        "Delete Document",
        "Are you sure you want to permanently delete this SRS document?",
        "Delete",
        "Cancel",
        true,
      );
      if (!isConfirmed) return;

      try {
        const response = await apiFetch(`/projects/srs/delete/${srsId}`, {
          method: "DELETE",
        });
        showToast("SRS Document deleted successfully", "success");

        // Remove from state
        state.projectSRS = state.projectSRS.filter((s) => s.id !== srsId);
        if (state.activeSrsId === srsId) state.activeSrsId = null;

        renderAdminApp();
      } catch (error) {
        showToast(error.message || "Failed to delete SRS document", "error");
      }
    }

    function openAddSRSModal() {
      const html = `
                <form onsubmit="handleSRSUpload(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Document Title *</label>
                        <input type="text" id="up_srs_title" required placeholder="e.g., Phase 2 API Specs" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Version Iteration *</label>
                        <input type="text" id="up_srs_version" required placeholder="v1.1" value="v1.0" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Source Material (Choose One)</p>
                        
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1"><i data-lucide="upload-cloud" class="w-4 h-4 inline mr-1 text-brand-primary"></i> Direct PDF Upload</label>
                            <input type="file" id="up_srs_file" accept="application/pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-brand-primary hover:file:bg-indigo-100 cursor-pointer">
                        </div>
                        
                        <div class="relative flex items-center py-1">
                            <div class="flex-grow border-t border-slate-300"></div>
                            <span class="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">OR</span>
                            <div class="flex-grow border-t border-slate-300"></div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1"><i data-lucide="link" class="w-4 h-4 inline mr-1 text-sky-500"></i> Cloud Document Link</label>
                            <input type="url" id="up_srs_link" placeholder="https://docs.google.com/..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>

                        <div class="relative flex items-center py-1">
                            <div class="flex-grow border-t border-slate-300"></div>
                            <span class="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">OR</span>
                            <div class="flex-grow border-t border-slate-300"></div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1"><i data-lucide="align-left" class="w-4 h-4 inline mr-1 text-emerald-500"></i> Paste SRS Raw Text</label>
                            <textarea id="up_srs_text" rows="5" placeholder="Paste the SRS document contents directly..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm resize-y"></textarea>
                        </div>
                    </div>

                    <div id="srsErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="srsErrorMessage">Error message</span>
                    </div>

                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnSubmitSRS" class="px-5 py-2 bg-slate-900 text-white rounded-lg font-medium shadow-sm hover:bg-black transition-all flex items-center gap-2">
                            <i data-lucide="upload" class="w-4 h-4"></i> Process & Store Spec
                        </button>
                    </div>
                </form>
            `;
      openModal("Add Project Specification", html);
    }

    async function handleSRSUpload(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitSRS");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Processing...';
      btn.disabled = true;
      document.getElementById("srsErrorBanner").classList.add("hidden");
      lucide.createIcons();

      const p = state.activeProject;
      const fileInput = document.getElementById("up_srs_file").files[0];
      const linkInput = document.getElementById("up_srs_link").value;
      const textInput = document.getElementById("up_srs_text").value;

      if (!fileInput && !linkInput && !textInput) {
        document.getElementById("srsErrorMessage").innerText =
          "You must provide either a PDF file, a Cloud link, or pasted SRS text.";
        document.getElementById("srsErrorBanner").classList.remove("hidden");
        document.getElementById("srsErrorBanner").classList.add("flex");
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
        return;
      }

      const formData = new FormData();
      formData.append("project_id", p.id);
      formData.append("project_name", p.name);
      formData.append(
        "document_title",
        document.getElementById("up_srs_title").value,
      );
      formData.append(
        "version",
        document.getElementById("up_srs_version").value,
      );

      if (fileInput) formData.append("file", fileInput);
      if (linkInput) formData.append("cloud_link", linkInput);
      if (textInput) formData.append("srs_text", textInput);

      try {
        // Notice we are using the new Uploads endpoint, not the raw JSON endpoint
        await apiFetch("/uploads/srs/", {
          method: "POST",
          body: formData, // Using FormData for multipart/form-data upload
        });

        showToast("Document uploaded and parsed successfully!", "success");
        closeModal();

        // Detach the background refresh to allow the modal to close smoothly
        setTimeout(() => {
          openProjectDetails(p.id);
        }, 300);
      } catch (err) {
        document.getElementById("srsErrorMessage").innerText = err.message;
        document.getElementById("srsErrorBanner").classList.remove("hidden");
        document.getElementById("srsErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    // --- Assignment Modal & Functions ---
    function openAssignmentModal() {
      const p = state.activeProject;
      if (!p) return;

      const options = state.allEmployees
        .filter(
          (e) =>
            !state.projectAssignments.some((a) => a.employee_id === e.id),
        )
        .map(
          (e) =>
            `<option value="${e.id}">${e.full_name} (${e.department || "Employee"})</option>`,
        )
        .join("");

      window.updateAssignCostDisplay = function () {
        const empId = document.getElementById("assign_employee_id").value;
        const display = document.getElementById("assign_cost_display");
        if (!empId) {
          display.value = "-";
          return;
        }
        const emp = state.allEmployees.find((e) => e.id === empId);
        display.value = emp ? (emp.hourly_cost_rate || 0).toFixed(2) : "-";
      };

      const html = `
                <form onsubmit="handleAssignmentSave(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Select Employee *</label>
                        <select id="assign_employee_id" required onchange="updateAssignCostDisplay()" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            <option value="">-- Choose Employee --</option>
                            ${options}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Fixed Cost Rate (₹/hr)</label>
                            <input type="text" id="assign_cost_display" readonly value="-" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm shadow-sm cursor-not-allowed text-slate-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Custom Billing Rate (₹/hr)</label>
                            <input type="number" id="assign_billing" step="0.01" min="0" placeholder="Optional" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                    </div>
                    <p class="text-xs text-slate-500">Billing rate blank will default to the employee's standard profile rates.</p>
                    <div id="assignErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="assignErrorMessage">Error message</span>
                    </div>                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnSubmitAssign" class="px-5 py-2 bg-slate-900 text-white rounded-lg font-medium shadow-sm hover:bg-black transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Assign Employee
                        </button>
                    </div>
                </form>
            `;
      openModal("Assign Team Member", html);
    }

    async function handleAssignmentSave(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitAssign");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;
      document.getElementById("assignErrorBanner").classList.add("hidden");

      try {
        const payload = {
          project_id: state.activeProject.id,
          employee_id: document.getElementById("assign_employee_id").value,
        };

        const c_bill = document.getElementById("assign_billing").value;
        if (c_bill) payload.custom_hourly_billing = parseFloat(c_bill);

        await apiFetch("/projects/assign", { method: "POST", body: payload });
        showToast("Employee assigned successfully", "success");
        closeModal();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        document.getElementById("assignErrorMessage").innerText = err.message;
        document
          .getElementById("assignErrorBanner")
          .classList.remove("hidden");
        document.getElementById("assignErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    window.openEditAssignmentRatesModal = function (assignmentId) {
      const assignment = (state.projectAssignments || []).find((a) => String(a.id) === String(assignmentId));
      if (!assignment) return;

      const currentCost = assignment.custom_hourly_cost !== null && assignment.custom_hourly_cost !== undefined ? assignment.custom_hourly_cost : "";
      const currentBilling = assignment.custom_hourly_billing !== null && assignment.custom_hourly_billing !== undefined ? assignment.custom_hourly_billing : "";

      const html = `
        <form onsubmit="handleEditAssignmentRatesSubmit(event, '${assignmentId}')" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Employee</label>
                <input type="text" readonly value="${assignment.full_name || "Employee"}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed font-semibold">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Custom Cost Rate (₹/hr)</label>
                    <input type="number" step="0.01" min="0" id="edit_assign_cost" value="${currentCost}" placeholder="Standard profile rate" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none shadow-sm focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Custom Billing Rate (₹/hr)</label>
                    <input type="number" step="0.01" min="0" id="edit_assign_billing" value="${currentBilling}" placeholder="Standard profile rate" class="input-field w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none shadow-sm focus:border-indigo-500">
                </div>
            </div>
            <p class="text-[11px] text-slate-500">Leave fields blank to use employee standard profile rates.</p>
            <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" class="px-4 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Save Rates
                </button>
            </div>
        </form>
      `;
      openModal("Edit Employee Project Rates", html);
    };

    window.handleEditAssignmentRatesSubmit = async function (event, assignmentId) {
      event.preventDefault();
      const costVal = document.getElementById("edit_assign_cost").value.trim();
      const billVal = document.getElementById("edit_assign_billing").value.trim();

      const payload = {
        custom_hourly_cost: costVal !== "" ? parseFloat(costVal) : null,
        custom_hourly_billing: billVal !== "" ? parseFloat(billVal) : null
      };

      try {
        await apiFetch(`/projects/assignments/update/${assignmentId}`, {
          method: "PUT",
          body: payload
        });
        showToast("Employee project rates updated successfully", "success");
        closeModal();
        if (state.activeProject) {
          openProjectDetails(state.activeProject.id);
        }
      } catch (err) {
        showToast(err.message || "Failed to update rates", "error");
      }
    };

    async function unassignEmployee(assignmentId) {
      const isConfirmed = await customConfirm(
        "Remove Employee",
        "Are you sure you want to remove this employee from the project?",
        "Remove",
        "Cancel",
        true,
      );
      if (!isConfirmed) return;
      try {
        await apiFetch(`/projects/unassign/${assignmentId}`, {
          method: "DELETE",
        });
        showToast("Employee removed successfully", "success");
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to remove employee: " + err.message, "error");
      }
    }

    window.filterMilestoneEmployees = function (query, inputEl) {
      const q = query.toLowerCase();
      const container = inputEl ? inputEl.closest('.w-full') : document;
      const items = container.querySelectorAll(".milestone-emp-item");
      items.forEach(item => {
        const name = item.getAttribute("data-name").toLowerCase();
        if (name.includes(q)) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });
    };

    // --- Milestone Modal & Functions ---
    async function openMilestoneModal() {
      const p = state.activeProject;
      if (!p) return;

      let projectAssignments = [];
      try {
        projectAssignments = await apiFetch(`/projects/assignments/${p.id}`).catch(() => []);
      } catch (e) {
        console.error("Error fetching project assignments:", e);
      }

      let employeesChecklistHtml = "";
      if (projectAssignments.length === 0) {
        employeesChecklistHtml = '<span class="text-xs text-slate-400 italic">No employees are assigned to this project yet. Assign employees to the project first.</span>';
      } else {
        employeesChecklistHtml = `
          <div class="mb-2.5">
            <input type="text" placeholder="Search project employees..." 
                   oninput="filterMilestoneEmployees(this.value, this)" 
                   class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
          </div>
          <div class="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-inner w-full">
            ${projectAssignments.map(pa => `
              <label class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all milestone-emp-item" data-name="${pa.full_name}">
                <div class="flex items-center gap-2.5 min-w-0">
                  <input type="checkbox" name="m_assign_employee" value="${pa.employee_id}" class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700 truncate">${pa.full_name}</p>
                    <p class="text-[10px] text-slate-400 truncate">${pa.job_title || "Employee"}</p>
                  </div>
                </div>
              </label>
            `).join("")}
          </div>
        `;
      }

      const html = `
                <form onsubmit="handleMilestoneSave(event)" class="space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="col-span-1 md:col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Milestone Title *</label>
                            <input type="text" id="milestone_name" required placeholder="e.g., Phase 1: Planning" 
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Track Status</label>
                            <select id="milestone_status" 
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                                <option value="Pending">Pending</option>
                                <option value="Active">Active</option>
                                <option value="Delayed">Delayed</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Work Type</label>
                            <select id="ms_work_type" 
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                                <option value="Backend">Backend</option>
                                <option value="Frontend">Frontend</option>
                                <option value="Full Stack">Full Stack</option>
                                <option value="DevOps">DevOps</option>
                                <option value="Design">Design</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sprint Name</label>
                            <input type="text" id="ms_sprint" placeholder="e.g. Sprint 1"
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Module Name</label>
                            <input type="text" id="ms_module" placeholder="e.g. Authentication"
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Feature Name</label>
                            <input type="text" id="ms_feature" placeholder="e.g. OAuth Login"
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Repository (owner/repo)</label>
                            <input type="text" id="ms_repo" placeholder="e.g. yana/core-api"
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        </div>
                        <div class="col-span-1 md:col-span-2 border-t border-slate-100 pt-3 mt-1">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Expected Timeline Setup</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Expected Start</label>
                                    <input type="date" id="milestone_start"
                                      class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                                </div>
                                <div>
                                    <label class="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Expected Complete</label>
                                    <input type="date" id="milestone_end"
                                      class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                                </div>
                            </div>
                        </div>
                        <div class="col-span-1 md:col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Remarks / Progression Log</label>
                            <textarea id="milestone_remarks" rows="2" 
                              class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm resize-none"
                              placeholder="Log internal comments, issues, or initial progression highlights..."></textarea>
                        </div>
                        <div class="col-span-1 md:col-span-2 border-t border-slate-100 pt-4">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assign Employees to Milestone</label>
                            ${employeesChecklistHtml}
                        </div>
                    </div>
                    <div id="milestoneErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="milestoneErrorMessage">Error message</span>
                    </div>
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors border border-slate-300 bg-white">Cancel</button>
                        <button type="submit" id="btnSubmitMilestone" class="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Add Milestone
                        </button>
                    </div>
                </form>
      `;
      openModal("Add Project Milestone", html);
    }

    async function handleMilestoneSave(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitMilestone");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;
      document.getElementById("milestoneErrorBanner").classList.add("hidden");

      try {
        const payload = {
          project_id: state.activeProject.id,
          milestone_name: document.getElementById("milestone_name").value,
          status: document.getElementById("milestone_status").value,
          sprint_name: document.getElementById("ms_sprint")?.value || "N/A",
          module_name: document.getElementById("ms_module")?.value || "N/A",
          feature_name: document.getElementById("ms_feature")?.value || "N/A",
          work_type: document.getElementById("ms_work_type")?.value || "Backend",
          repo_name: document.getElementById("ms_repo")?.value || "N/A",
          remarks: document.getElementById("milestone_remarks")?.value || "N/A",
        };

        const ms = document.getElementById("milestone_start").value;
        const me = document.getElementById("milestone_end").value;
        if (ms) payload.expected_start = new Date(ms).toISOString();
        if (me) payload.expected_end = new Date(me).toISOString();

        const createdMilestone = await apiFetch("/projects/timeline/create", {
          method: "POST",
          body: payload,
        });

        // Sync assignments on creation:
        const checkedEmpIds = Array.from(document.querySelectorAll('input[name="m_assign_employee"]:checked')).map(el => el.value);
        if (createdMilestone && createdMilestone.id && checkedEmpIds.length > 0) {
          for (const empId of checkedEmpIds) {
            await apiFetch("/projects/timeline/assign", {
              method: "POST",
              body: {
                milestone_id: createdMilestone.id,
                employee_id: empId
              }
            }).catch(e => console.error("Error assigning employee to milestone on creation:", e));
          }
        }

        showToast("Milestone added successfully", "success");
        closeModal();
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        document.getElementById("milestoneErrorMessage").innerText =
          err.message;
        document
          .getElementById("milestoneErrorBanner")
          .classList.remove("hidden");
        document.getElementById("milestoneErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    async function markMilestoneComplete(milestoneId) {
      const isConfirmed = await customConfirm(
        "Complete Milestone",
        "Are you sure you want to mark this milestone as Completed? This will set its actual completion date to today.",
        "Complete",
        "Cancel",
        false,
      );
      if (!isConfirmed) return;
      try {
        await apiFetch(`/projects/timeline/update/${milestoneId}`, {
          method: "PUT",
          body: {
            status: "Completed",
            actual_end: new Date().toISOString(),
          },
        });
        showToast("Milestone marked as complete!", "success");
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to update milestone: " + err.message, "error");
      }
    }

    async function deleteMilestone(milestoneId) {
      const isConfirmed = await customConfirm(
        "Delete Milestone",
        "Are you sure you want to delete this milestone? This action cannot be undone.",
        "Delete",
        "Cancel",
        true,
      );
      if (!isConfirmed) return;
      try {
        await apiFetch(`/projects/timeline/delete/${milestoneId}`, {
          method: "DELETE",
        });
        showToast("Milestone deleted successfully", "success");
        await openProjectDetails(state.activeProject.id);
      } catch (err) {
        showToast("Failed to delete milestone: " + err.message, "error");
      }
    }

    let currentViewingMilestoneId = null;
    let currentViewingProjectId = null;
    let currentProjectName = "";

    window.showModal = function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove("hidden");
      }
    };

    window.closeMilestoneDetailsModal = function () {
      const modal = document.getElementById("modal-milestone-details");
      if (modal) {
        modal.classList.add("hidden");
      }
      if (state.activeProject) {
        openProjectDetails(state.activeProject.id);
      }
    };

    window.toggleMilestoneEdit = function (edit) {
      const viewMode = document.getElementById("md_view_mode");
      const editMode = document.getElementById("md_edit_mode");

      const btnEditToggle = document.getElementById("btn-edit-milestone-toggle");
      const btnSaveEdit = document.getElementById("btn-save-milestone-edit");
      const btnCancelEdit = document.getElementById("btn-cancel-milestone-edit");
      const btnCloseDetails = document.getElementById("btn-close-milestone-details");

      if (edit) {
        viewMode.classList.add("hidden");
        editMode.classList.remove("hidden");

        btnEditToggle.classList.add("hidden");
        btnSaveEdit.classList.remove("hidden");
        btnCancelEdit.classList.remove("hidden");
        btnCloseDetails.classList.add("hidden");
      } else {
        viewMode.classList.remove("hidden");
        editMode.classList.add("hidden");

        btnEditToggle.classList.remove("hidden");
        btnSaveEdit.classList.add("hidden");
        btnCancelEdit.classList.add("hidden");
        btnCloseDetails.classList.remove("hidden");
      }
    };

    window.saveMilestoneEdit = async function (event) {
      if (event) event.preventDefault();

      const btn = document.getElementById("btn-save-milestone-edit");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
      btn.disabled = true;

      try {
        const payload = {
          milestone_name: document.getElementById("mde_name").value,
          status: document.getElementById("mde_status").value,
          work_type: document.getElementById("mde_work_type").value,
          sprint_name: document.getElementById("mde_sprint").value || "N/A",
          module_name: document.getElementById("mde_module").value || "N/A",
          feature_name: document.getElementById("mde_feature").value || "N/A",
          repo_name: document.getElementById("mde_repo").value || "N/A",
          remarks: document.getElementById("mde_remarks").value || "",
        };

        const es = document.getElementById("mde_expected_start").value;
        const ee = document.getElementById("mde_expected_end").value;
        const as = document.getElementById("mde_actual_start").value;
        const ae = document.getElementById("mde_actual_end").value;

        payload.expected_start = es ? new Date(es).toISOString() : null;
        payload.expected_end = ee ? new Date(ee).toISOString() : null;
        payload.actual_start = as ? new Date(as).toISOString() : null;
        payload.actual_end = ae ? new Date(ae).toISOString() : null;

        await apiFetch(`/projects/timeline/update/${currentViewingMilestoneId}`, {
          method: "PUT",
          body: payload,
        });

        // Sync milestone employee assignments
        try {
          const currentMilestoneAssignments = await apiFetch(`/projects/timeline/assignments/${currentViewingMilestoneId}`).catch(() => []);
          const currentEmpIds = currentMilestoneAssignments.map(ma => ma.employee_id);

          const checkedEmpIds = Array.from(document.querySelectorAll('input[name="m_assign_employee"]:checked')).map(el => el.value);

          const toAssign = checkedEmpIds.filter(id => !currentEmpIds.includes(id));
          const toUnassign = currentMilestoneAssignments.filter(ma => !checkedEmpIds.includes(ma.employee_id));

          for (const empId of toAssign) {
            await apiFetch("/projects/timeline/assign", {
              method: "POST",
              body: {
                milestone_id: currentViewingMilestoneId,
                employee_id: empId
              }
            });
          }

          for (const ma of toUnassign) {
            await apiFetch(`/projects/timeline/unassign/${ma.id}`, {
              method: "DELETE"
            });
          }
        } catch (assignErr) {
          console.error("Failed to sync milestone assignments:", assignErr);
        }

        showToast("Milestone updated successfully", "success");
        closeMilestoneDetailsModal();
      } catch (err) {
        showToast("Failed to update milestone: " + err.message, "error");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };

    window.openMilestoneDetails = async function (milestoneId, projectId, projectName) {
      currentViewingMilestoneId = milestoneId;

      // Fallbacks if not provided:
      if (!projectId && state.activeProject) {
        projectId = state.activeProject.id;
      }
      if (!projectName && state.activeProject) {
        projectName = state.activeProject.name;
      }

      currentViewingProjectId = projectId;
      currentProjectName = projectName;

      let project = state.allProjects.find(p => String(p.id) === String(projectId));
      if (!project && state.activeProject) {
        project = state.activeProject;
      }
      if (!project) return;

      let milestone = state.projectTimeline.find(m => String(m.id) === String(milestoneId));
      if (!milestone && project.timeline) {
        milestone = project.timeline.find(m => String(m.id) === String(milestoneId));
      }
      if (!milestone) return;

      // Fetch project assignments and milestone assignments
      let projectAssignments = [];
      let milestoneAssignments = [];
      try {
        projectAssignments = await apiFetch(`/projects/assignments/${projectId}`).catch(() => []);
        milestoneAssignments = await apiFetch(`/projects/timeline/assignments/${milestoneId}`).catch(() => []);
      } catch (e) {
        console.error("Error fetching milestone or project assignments:", e);
      }

      // Render view-mode assigned employees
      const viewContainer = document.getElementById('md_assigned_employees_view');
      if (viewContainer) {
        if (milestoneAssignments.length === 0) {
          viewContainer.innerHTML = '<span class="text-xs text-slate-400 italic">No employees assigned to this milestone.</span>';
        } else {
          viewContainer.innerHTML = milestoneAssignments.map(ma => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 shadow-sm">
              ${ma.full_name} (${ma.job_title})
            </span>
          `).join("");
        }
      }

      // Render edit-mode checkboxes (only employees assigned to the project can be assigned to the milestone)
      const editContainer = document.getElementById('md_assigned_employees_edit');
      if (editContainer) {
        if (projectAssignments.length === 0) {
          editContainer.innerHTML = '<span class="text-xs text-slate-400 italic col-span-2">No employees are assigned to this project yet. Assign employees to the project first.</span>';
        } else {
          const assignedEmpIds = milestoneAssignments.map(ma => ma.employee_id);
          editContainer.innerHTML = `
            <div class="mb-2.5">
              <input type="text" placeholder="Search project employees..." 
                     oninput="filterMilestoneEmployees(this.value, this)" 
                     class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
            </div>
            <div class="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-inner w-full">
              ${projectAssignments.map(pa => {
            const isChecked = assignedEmpIds.includes(pa.employee_id);
            return `
                  <label class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all milestone-emp-item" data-name="${pa.full_name}">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <input type="checkbox" name="m_assign_employee" value="${pa.employee_id}" ${isChecked ? "checked" : ""} class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-slate-700 truncate">${pa.full_name}</p>
                        <p class="text-[10px] text-slate-400 truncate">${pa.job_title || "Employee"}</p>
                      </div>
                    </div>
                  </label>
                `;
          }).join("")}
            </div>
          `;
        }
      }

      // Robust Helper to convert SQLite/datetime outputs safely to YYYY-MM-DD
      const cleanDateForInput = (dateStr) => {
        if (!dateStr) return '';
        // Matches YYYY-MM-DD strictly from the start of any string
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : '';
      };

      const formatDate = (dateStr) => {
        if (!dateStr) return '--';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
          return dateStr;
        }
      };

      // Populate View Mode Elements
      document.getElementById('md_project_name').textContent = `Project: ${projectName}`;
      document.getElementById('md_name_view').textContent = milestone.milestone_name || 'N/A';

      // Setup Visual Status Badges
      const statusBadge = document.getElementById('md_status_view_badge');
      const statusVal = milestone.status || 'Pending';
      statusBadge.textContent = statusVal;

      statusBadge.className = "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ";
      if (statusVal === 'Completed') {
        statusBadge.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
      } else if (statusVal === 'Active') {
        statusBadge.classList.add('bg-indigo-50', 'text-indigo-700', 'border', 'border-indigo-200');
      } else if (statusVal === 'Delayed') {
        statusBadge.classList.add('bg-rose-50', 'text-rose-700', 'border', 'border-rose-200');
      } else {
        statusBadge.classList.add('bg-amber-50', 'text-amber-700', 'border', 'border-amber-200');
      }

      // Populate work type badge
      document.getElementById('md_work_type_view_badge').textContent = milestone.work_type || 'General';

      // Formatting comparative display ledger (Expected vs Actual)
      document.getElementById('md_expected_start_view').textContent = milestone.expected_start ? formatDate(milestone.expected_start) : '--';
      document.getElementById('md_expected_end_view').textContent = milestone.expected_end ? formatDate(milestone.expected_end) : '--';
      document.getElementById('md_actual_start_view').textContent = milestone.actual_start ? formatDate(milestone.actual_start) : 'Not Started';
      document.getElementById('md_actual_end_view').textContent = milestone.actual_end ? formatDate(milestone.actual_end) : 'In Progress';

      // Smart Fields Views
      document.getElementById('md_sprint_view').textContent = milestone.sprint_name || 'N/A';
      document.getElementById('md_module_view').textContent = milestone.module_name || 'N/A';
      document.getElementById('md_feature_view').textContent = milestone.feature_name || 'N/A';
      document.getElementById('md_work_type_view').textContent = milestone.work_type || 'Backend';
      document.getElementById('md_repo_view').textContent = milestone.repo_name || 'N/A';
      document.getElementById('md_remarks_view').textContent = milestone.remarks || 'No executive remarks logged.';

      // Pre-fill Edit Mode fields
      document.getElementById('mde_name').value = milestone.milestone_name || '';
      document.getElementById('mde_status').value = milestone.status || 'Pending';
      document.getElementById('mde_work_type').value = milestone.work_type || 'Backend';

      // CRITICAL FIX: Extract clean YYYY-MM-DD from database outputs to prevent dates resetting
      document.getElementById('mde_expected_start').value = cleanDateForInput(milestone.expected_start);
      document.getElementById('mde_expected_end').value = cleanDateForInput(milestone.expected_end);
      document.getElementById('mde_actual_start').value = cleanDateForInput(milestone.actual_start);
      document.getElementById('mde_actual_end').value = cleanDateForInput(milestone.actual_end);

      document.getElementById('mde_sprint').value = milestone.sprint_name || '';
      document.getElementById('mde_module').value = milestone.module_name || '';
      document.getElementById('mde_feature').value = milestone.feature_name || '';
      document.getElementById('mde_repo').value = milestone.repo_name || '';
      document.getElementById('mde_remarks').value = milestone.remarks || '';

      // Reset mode view
      document.getElementById('md_view_mode').classList.remove('hidden');
      document.getElementById('md_edit_mode').classList.add('hidden');

      // Toggle button states
      document.getElementById('btn-edit-milestone-toggle').classList.remove('hidden');
      document.getElementById('btn-save-milestone-edit').classList.add('hidden');
      document.getElementById('btn-cancel-milestone-edit').classList.add('hidden');
      document.getElementById('btn-close-milestone-details').classList.remove('hidden');

      // Re-trigger Lucide icon instantiation inside the modal
      if (window.lucide) {
        setTimeout(() => { lucide.createIcons(); }, 20);
      }

      showModal('modal-milestone-details');
    };

    async function assignMilestoneEmployee(milestoneId) {
      const empId = document.getElementById("assign_milestone_employee_id").value;
      if (!empId) return;
      try {
        await apiFetch("/projects/timeline/assign", { method: "POST", body: { milestone_id: milestoneId, employee_id: empId } });
        showToast("Employee assigned to milestone", "success");
        closeModal();
        setTimeout(() => openMilestoneDetails(milestoneId), 300);
      } catch (err) {
        showToast(err.message, "error");
      }
    }

    async function unassignMilestoneEmployee(assignmentId, milestoneId) {
      const isConfirmed = await customConfirm("Remove Employee", "Remove this employee from the milestone?", "Remove", "Cancel", true);
      if (!isConfirmed) return;
      try {
        await apiFetch(`/projects/timeline/unassign/${assignmentId}`, { method: "DELETE" });
        showToast("Employee removed from milestone", "success");
        closeModal();
        setTimeout(() => openMilestoneDetails(milestoneId), 300);
      } catch (err) {
        showToast(err.message, "error");
      }
    }

    window.handleAddCustomPlatform = function () {
      const input = document.getElementById("custom_platform_input");
      const val = input.value.trim();
      if (!val) return;

      const existing = Array.from(document.querySelectorAll('input[name="p_custom_platforms"], input[name="p_platforms"]:checked'))
        .map(el => el.value);
      if (existing.includes(val)) {
        input.value = "";
        return;
      }

      const container = document.getElementById("custom_platforms_container");
      const pill = document.createElement("span");
      pill.className = "custom-platform-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 mr-2 mb-2 shadow-sm transition-all";
      pill.innerHTML = `
          ${val}
          <button type="button" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-rose-500 font-bold ml-1 focus:outline-none">&times;</button>
          <input type="hidden" name="p_custom_platforms" value="${val}">
      `;
      container.appendChild(pill);
      input.value = "";
    };

    window.toggleEmployeeRateInputs = function (empId) {
      const checkbox = document.querySelector(`input[name="p_assign_employee"][value="${empId}"]`);
      const container = document.getElementById(`rates_container_${empId}`);
      if (checkbox && container) {
        if (checkbox.checked) {
          container.classList.remove("hidden");
        } else {
          container.classList.add("hidden");
        }
      }
    };

    window.updateRoleFilterOptions = function () {
      const dept = document.getElementById("p_assign_filter_dept").value;
      const roleSelect = document.getElementById("p_assign_filter_role");
      if (!roleSelect) return;
      const currentSelectedRole = roleSelect.value;

      let filteredRoles = [];
      if (!dept) {
        filteredRoles = Array.from(new Set(state.allRoles.map(r => r.role_name))).filter(Boolean);
      } else {
        filteredRoles = Array.from(new Set(state.allRoles.filter(r => r.department_name === dept).map(r => r.role_name))).filter(Boolean);
      }

      let html = '<option value="">-- All Roles --</option>';
      html += filteredRoles.map(r => `<option value="${r}">${r}</option>`).join("");
      roleSelect.innerHTML = html;

      if (filteredRoles.includes(currentSelectedRole)) {
        roleSelect.value = currentSelectedRole;
      } else {
        roleSelect.value = "";
      }
    };

    window.filterProjectEmployees = function () {
      const dept = document.getElementById("p_assign_filter_dept").value;
      const role = document.getElementById("p_assign_filter_role").value;

      const cards = document.querySelectorAll(".employee-assign-card");
      cards.forEach(card => {
        const cardDept = card.getAttribute("data-dept");
        const cardRole = card.getAttribute("data-role");
        const matchesDept = !dept || cardDept === dept;
        const matchesRole = !role || cardRole === role;
        if (matchesDept && matchesRole) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    };

    async function openProjectModal(projectId = null) {
      if (!state.allAdmins || state.allAdmins.length === 0 || !state.allEmployees || state.allEmployees.length === 0 || !state.allRoles || state.allRoles.length === 0) {
        try {
          const [admins, employees, roles] = await Promise.all([
            (!state.allAdmins || state.allAdmins.length === 0) ? apiFetch("/admins/all").catch(() => []) : Promise.resolve(state.allAdmins),
            (!state.allEmployees || state.allEmployees.length === 0) ? apiFetch("/employees/all").catch(() => []) : Promise.resolve(state.allEmployees),
            (!state.allRoles || state.allRoles.length === 0) ? apiFetch("/departments-roles/all").catch(() => []) : Promise.resolve(state.allRoles)
          ]);
          if (Array.isArray(admins) && admins.length > 0) state.allAdmins = admins;
          if (Array.isArray(employees) && employees.length > 0) state.allEmployees = employees;
          if (Array.isArray(roles) && roles.length > 0) state.allRoles = roles;
        } catch (err) {
          console.warn("Failed to prefetch modal dependencies:", err);
        }
      }

      let p = null;
      let assignedEmpIds = [];
      let projectAssignments = [];
      if (projectId) {
        p = state.allProjects.find((x) => x.id === projectId);
        try {
          projectAssignments = await apiFetch(`/projects/assignments/${projectId}`);
          if (Array.isArray(projectAssignments)) {
            assignedEmpIds = projectAssignments.map(a => a.employee_id);
          }
        } catch (e) {
          console.error("Failed to fetch project assignments:", e);
        }
      }
      const isEdit = !!p;

      const uniqueDepts = Array.from(new Set(state.allRoles.map(r => r.department_name))).filter(Boolean);
      const uniqueRoles = Array.from(new Set(state.allRoles.map(r => r.role_name))).filter(Boolean);
      const deptOptions = uniqueDepts.map(d => `<option value="${d}">${d}</option>`).join("");
      const roleOptions = uniqueRoles.map(r => `<option value="${r}">${r}</option>`).join("");

      const managerOptions = state.allAdmins
        .filter(
          (a) =>
            a.access_level === "ManagerAdmin" ||
            a.access_level === "SystemAdmin",
        )
        .map(
          (m) =>
            `<option value="${m.username}" ${p && p.manager === m.username ? "selected" : ""}>${m.username} (${m.access_level})</option>`,
        )
        .join("");

      const activePlatforms = p && p.project_platform && p.project_platform !== "N/A"
        ? p.project_platform.split(",").map(x => x.trim()).filter(Boolean)
        : ["Software"];

      // Setup Referrers options
      const defaultReferrers = ["Client Referral", "Ad", "Partner"];
      const existingReferrers = Array.from(new Set(
        state.allProjects
          .map(proj => proj.referred_by)
          .filter(x => x && x !== "N/A" && x.trim() !== "")
      ));
      const allReferrerOptions = Array.from(new Set([...defaultReferrers, ...existingReferrers]));

      const currentReferredBy = p && p.referred_by && p.referred_by !== "N/A" ? p.referred_by : "";
      const isReferredByPredefined = allReferrerOptions.includes(currentReferredBy);
      const referredBySelectValue = currentReferredBy === "" ? "" : (isReferredByPredefined ? currentReferredBy : "Other");
      const referredByOtherValue = isReferredByPredefined ? "" : currentReferredBy;

      // Setup Filled By options
      const currentFilledBy = p && p.filled_by && p.filled_by !== "N/A" ? p.filled_by : "";
      const matchedEmployeeForFilledBy = state.allEmployees.find(e => e.full_name === currentFilledBy);
      const filledBySelectValue = currentFilledBy === "" ? "" : (matchedEmployeeForFilledBy ? currentFilledBy : "Other");
      const filledByOtherValue = matchedEmployeeForFilledBy ? "" : currentFilledBy;

      window.toggleReferredByOther = function (val) {
        const otherInput = document.getElementById("p_referred_by_other");
        if (otherInput) {
          if (val === "Other") {
            otherInput.classList.remove("hidden");
            otherInput.focus();
          } else {
            otherInput.classList.add("hidden");
            otherInput.value = "";
          }
        }
      };

      window.toggleFilledByOther = function (val) {
        const otherInput = document.getElementById("p_filled_by_other");
        if (otherInput) {
          if (val === "Other") {
            otherInput.classList.remove("hidden");
            otherInput.focus();
          } else {
            otherInput.classList.add("hidden");
            otherInput.value = "";
          }
        }
      };


      const formHtml = `
                <form id="adminProjectForm" onsubmit="handleProjectSave(event, '${projectId || ""}')" class="space-y-6">
                    
                    <!-- Section: Core Details -->
                    <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><i data-lucide="info" class="w-4 h-4 mr-2"></i> Core Details</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Project Name *</label>
                                <input type="text" id="p_name" value="${p && p.name !== "N/A" ? p.name : ""}" required class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Project Nature *</label>
                                <select id="p_type" required onchange="window.toggleContentAgreementSection(this.value)" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                                    <option value="Engineering" ${p && p.project_type === "Engineering" ? "selected" : ""}>Engineering / IT</option>
                                    <option value="Content" ${p && p.project_type === "Content" ? "selected" : ""}>Content / Marketing</option>
                                    <option value="Both" ${p && p.project_type === "Both" ? "selected" : ""}>Both</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Project Manager *</label>
                                <select id="p_manager" required class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                                    <option value="">-- Select Manager --</option>
                                    ${managerOptions}
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <div class="flex justify-between items-center mb-1">
                                    <label class="block text-sm font-semibold text-slate-700">Client Name</label>
                                    <button type="button" onclick="openClientCreateModal('projects')" class="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center"><i data-lucide="plus" class="w-3 h-3 mr-1"></i> New Client</button>
                                </div>
                                <select id="p_client" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                                    <option value="">-- Internal / No Client --</option>
                                    ${state.allClients.map((c) => `<option value="${c.name}" ${p && p.client === c.name ? "selected" : ""}>${c.name} ${c.company !== "N/A" ? `(${c.company})` : ""}</option>`).join("")}
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
                                <textarea id="p_description" placeholder="Enter project description, scope or notes..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm h-20 resize-none">${p && p.description && p.description !== "N/A" ? p.description : ""}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Section: Execution & Financials -->
                    <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><i data-lucide="activity" class="w-4 h-4 mr-2"></i> Execution & Financials</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                                <select id="p_status" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                                    <option value="Planning" ${p && p.status === "Planning" ? "selected" : ""}>Planning</option>
                                    <option value="In Progress" ${p && (p.status === "In Progress" || p.status === "Active") ? "selected" : ""}>In Progress</option>
                                    <option value="At Risk" ${p && p.status === "At Risk" ? "selected" : ""}>At Risk</option>
                                    <option value="Completed" ${p && p.status === "Completed" ? "selected" : ""}>Completed</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Progress (%)</label>
                                <div class="flex items-center gap-3 mt-2 pr-4">
                                    <input type="range" id="p_progress_slider" min="0" max="100" value="${p && p.progress ? parseInt(p.progress) : 0}" class="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" oninput="document.getElementById('p_progress_val').innerText = this.value + '%'">
                                    <span id="p_progress_val" class="text-sm font-bold text-slate-700 w-12 text-right">${p && p.progress && p.progress !== "N/A" ? p.progress : "0%"}</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Budget (₹) *</label>
                                <input type="number" id="p_budget" value="${p && p.budget ? p.budget : "0"}" step="0.01" min="0" required class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Client Cost (₹)</label>
                                <input type="number" id="p_client_cost" value="${p && p.client_cost ? p.client_cost : "0"}" step="0.01" min="0" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>

                        </div>
                    </div>

                    <!-- Section: Additional Details -->
                    <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><i data-lucide="calendar" class="w-4 h-4 mr-2"></i> Timeline & Platform Details</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                                <input type="date" id="p_start" value="${p && p.start_date && p.start_date !== "N/A" ? p.start_date.split("T")[0] : ""}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                                <input type="date" id="p_end" value="${p && p.end_date && p.end_date !== "N/A" ? p.end_date.split("T")[0] : ""}" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                             <div class="md:col-span-2">
                                 <label class="block text-sm font-semibold text-slate-700 mb-1.5">Project Platform(s)</label>
                                 <div class="flex flex-wrap gap-2 mt-1">
                                     ${["Mobile App", "Website", "Software", "Social Media", "Graphics"].map(plat => {
        const isChecked = activePlatforms.includes(plat);
        return `
                                             <label class="cursor-pointer select-none">
                                                 <input type="checkbox" name="p_platforms" value="${plat}" ${isChecked ? "checked" : ""} class="hidden peer">
                                                 <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-white bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                                                     ${plat}
                                                 </span>
                                             </label>
                                         `;
      }).join("")}
                                 </div>
                                 <div class="mt-3 bg-slate-50/50 p-3 rounded-lg border border-slate-200/50">
                                     <label class="block text-xs font-semibold text-slate-500 mb-1">Add Custom Platform</label>
                                     <div class="flex gap-2">
                                         <input type="text" id="custom_platform_input" placeholder="e.g. Smart TV, Desktop App" class="input-field flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
                                         <button type="button" onclick="handleAddCustomPlatform()" class="px-3.5 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg font-bold text-xs shadow-sm transition-colors">Add</button>
                                     </div>
                                     <div id="custom_platforms_container" class="flex flex-wrap gap-2 mt-2">
                                         ${activePlatforms.filter(x => !["Mobile App", "Website", "Software", "Social Media", "Graphics"].includes(x)).map(customPlat => `
                                             <span class="custom-platform-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 mr-2 mb-2">
                                                 ${customPlat}
                                                 <button type="button" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-rose-500 font-bold ml-1 focus:outline-none">&times;</button>
                                                 <input type="hidden" name="p_custom_platforms" value="${customPlat}">
                                             </span>
                                         `).join("")}
                                     </div>
                                 </div>
                             </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Billing / Cost Type</label>
                                <select id="p_cost_type" onchange="toggleBillingFields()" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                                    <option value="Fixed Price" ${p && p.cost_type === "Fixed Price" ? "selected" : ""}>Fixed Price</option>
                                    <option value="Time & Material" ${p && (p.cost_type === "Time & Material" || p.cost_type === "Time and Material" || p.cost_type === "Monthly Retainer" || p.cost_type === "Hourly Billing") ? "selected" : ""}>Time & Material</option>
                                    <option value="Internal / Non-Billable" ${(p && p.cost_type === "Internal / Non-Billable") || !p || !p.cost_type ? "selected" : ""}>Internal / Non-Billable</option>
                                </select>
                            </div>
                            <div id="billing_fields_container" class="col-span-full"></div>
                            
                        </div>
                    </div>

                    <!-- Section: Additional Details -->
                    <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><i data-lucide="tags" class="w-4 h-4 mr-2"></i> Tech Stack & Environment</h4>
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Predefined Tech Stack</label>
                                <input type="text" id="p_tech_stack" value="${p && p.tech_stack && p.tech_stack !== "N/A" ? p.tech_stack : ""}" placeholder="e.g. React, Python, FastAPI (comma-separated)" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                        </div>
                    </div>

                    <!-- Section: Content Agreement Config (Dynamic Fields) -->
                    <div id="content_agreement_section" class="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 mt-2 hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center">
                                <i data-lucide="layers" class="w-4 h-4 mr-2 text-indigo-500"></i> Content Deliverables Tracker (Agreement)
                            </h4>
                            <button type="button" onclick="window.addCustomContentFieldRow()" class="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-sm">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Field
                            </button>
                        </div>
                        <p class="text-[10px] text-indigo-600 font-semibold mb-3">Define targets for content creation deliverables (e.g. reels, videos, graphics). For retainers, you can optionally set monthly recurring goals.</p>
                        
                        <div id="content_fields_container" class="space-y-2">
                            <!-- Custom field rows will be added here -->
                        </div>
                    </div>

                    <!-- Section: Team Assignments (Convenience) -->
                    <div class="bg-slate-50/50 p-5 rounded-xl border border-slate-100 mt-2">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                            <i data-lucide="users" class="w-4 h-4 mr-2 text-indigo-500"></i> Team Assignments (Convenience)
                        </h4>
                        <p class="text-[11px] text-slate-500 mb-3">Quickly assign employees to this project. Unchecking will remove them from the project.</p>
                        
                        <!-- Filters -->
                        <div class="flex gap-2.5 mb-3 bg-white p-2.5 rounded-lg border border-slate-200">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Department</label>
                                <select id="p_assign_filter_dept" onchange="updateRoleFilterOptions(); filterProjectEmployees()" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
                                    <option value="">-- All Departments --</option>
                                    ${deptOptions}
                                </select>
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Role</label>
                                <select id="p_assign_filter_role" onchange="filterProjectEmployees()" class="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
                                    <option value="">-- All Roles --</option>
                                    ${roleOptions}
                                </select>
                            </div>
                        </div>

                        <div class="max-h-52 overflow-y-auto border border-slate-200 rounded-lg bg-white p-3 shadow-inner">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${state.allEmployees.map(e => {
        const isAssigned = assignedEmpIds.includes(e.id);
        const matchedAssignment = isAssigned ? projectAssignments.find(a => a.employee_id === e.id) : null;
        const existingCost = matchedAssignment && matchedAssignment.custom_hourly_cost !== null && matchedAssignment.custom_hourly_cost !== undefined ? matchedAssignment.custom_hourly_cost : "";
        const existingBilling = matchedAssignment && matchedAssignment.custom_hourly_billing !== null && matchedAssignment.custom_hourly_billing !== undefined ? matchedAssignment.custom_hourly_billing : "";

        const roleObj = state.allRoles.find(r => r.id === e.role_id);
        const dept = roleObj ? roleObj.department_name : (e.department || "N/A");
        const roleName = roleObj ? roleObj.role_name : "Employee";
        return `
                                        <div class="flex flex-col gap-2 p-2.5 rounded-lg hover:bg-slate-50 transition-all border border-slate-100 hover:border-slate-200 employee-assign-card" 
                                             data-employee-id="${e.id}" data-dept="${dept}" data-role="${roleName}">
                                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                                                <input type="checkbox" name="p_assign_employee" value="${e.id}" ${isAssigned ? "checked" : ""} 
                                                       onchange="toggleEmployeeRateInputs('${e.id}')"
                                                       class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-xs font-semibold text-slate-700 truncate">${e.full_name}</p>
                                                    <p class="text-[10px] text-slate-400 truncate">${roleName} (${dept})</p>
                                                </div>
                                            </label>
                                            <div id="rates_container_${e.id}" class="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-100 ${isAssigned ? "" : "hidden"}">
                                                <div>
                                                    <label class="block text-[9px] font-bold text-slate-400 uppercase">Cost (₹/hr)</label>
                                                    <input type="number" id="p_custom_cost_${e.id}" step="0.01" min="0" placeholder="${e.hourly_cost_rate || 0}" 
                                                           value="${existingCost}"
                                                           class="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs outline-none shadow-sm focus:border-indigo-500"
                                                           onclick="event.stopPropagation()">
                                                </div>
                                                <div>
                                                    <label class="block text-[9px] font-bold text-slate-400 uppercase">Billing (₹/hr)</label>
                                                    <input type="number" id="p_custom_billing_${e.id}" step="0.01" min="0" placeholder="${e.hourly_billing_rate || 0}" 
                                                           value="${existingBilling}"
                                                           class="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs outline-none shadow-sm focus:border-indigo-500"
                                                           onclick="event.stopPropagation()">
                                                </div>
                                            </div>
                                        </div>
                                    `;
      }).join("")}
                            </div>
                        </div>
                    </div>

                    <!-- NEW: SRS Document Integration -->
                    <div class="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 mt-2">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center"><i data-lucide="file-text" class="w-4 h-4 mr-2"></i> SRS Document Configuration</h4>
                            <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">Optional</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-semibold text-slate-700 mb-1">SRS Document (PDF)</label>
                                <input type="file" id="srs_file" accept="application/pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">
                                <p class="text-xs text-slate-500 mt-1">Upload the active SRS document (PDF only).</p>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Document Title</label>
                                <input type="text" id="srs_title" placeholder="e.g., Initial Specs" class="input-field w-full px-4 py-2 bg-white border border-indigo-200 focus:border-indigo-500 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Version</label>
                                <input type="text" id="srs_version" placeholder="v1.0" class="input-field w-full px-4 py-2 bg-white border border-indigo-200 focus:border-indigo-500 rounded-lg outline-none text-sm shadow-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-semibold text-slate-700 mb-1">Paste SRS Raw Text</label>
                                <textarea id="srs_text" rows="4" placeholder="Paste the SRS document contents directly..." class="input-field w-full px-4 py-2 bg-white border border-indigo-200 focus:border-indigo-500 rounded-lg outline-none text-sm shadow-sm resize-y"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Error Banner -->
                    <div id="modalErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="modalErrorMessage">Error message</span>
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnSubmitProject" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Save Project Configuration
                        </button>
                    </div>
                </form>
            `;
      window.addCustomContentFieldRow = function (name = "", target = 0, monthly = 0) {
        const container = document.getElementById("content_fields_container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "flex gap-2.5 items-center bg-white p-3 rounded-lg border border-slate-200 custom-content-field-row";
        row.innerHTML = `
            <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase">Field Name *</label>
                <input type="text" placeholder="e.g. Instagram Reels, Posters" value="${name.replace(/"/g, '&quot;')}" class="cc-field-name w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500" required>
            </div>
            <div class="w-24">
                <label class="block text-[10px] font-bold text-slate-500 uppercase">Total Target *</label>
                <input type="number" min="0" placeholder="100" value="${target || ''}" class="cc-field-target w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500" required>
            </div>
            <div class="w-24">
                <label class="block text-[10px] font-bold text-slate-500 uppercase">Monthly Target</label>
                <input type="number" min="0" placeholder="0" value="${monthly || ''}" class="cc-field-monthly w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500">
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="mt-4 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded border border-transparent hover:border-rose-100 transition-colors">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        container.appendChild(row);
        if (window.lucide) lucide.createIcons();
      };

      window.toggleContentAgreementSection = function (nature) {
        const section = document.getElementById("content_agreement_section");
        if (section) {
          if (nature === "Content" || nature === "Both") {
            section.classList.remove("hidden");
          } else {
            section.classList.add("hidden");
            const container = document.getElementById("content_fields_container");
            if (container) container.innerHTML = "";
          }
        }
      };

      openModal(
        isEdit ? "Edit Project Workspace" : "Initialize New Project",
        formHtml,
      );
      toggleBillingFields();

      // Populate existing content agreement fields
      if (p) {
        window.toggleContentAgreementSection(p.project_type);
        let agreement = [];
        try {
          agreement = typeof p.content_agreement === 'string' ? JSON.parse(p.content_agreement) : (p.content_agreement || []);
        } catch (e) {
          agreement = [];
        }
        if (Array.isArray(agreement)) {
          agreement.forEach(item => {
            window.addCustomContentFieldRow(item.name, item.target, item.monthly_target);
          });
        }
      }
    }


    window.toggleCustomIntervalField = function(val) {
      const container = document.getElementById("custom_interval_container");
      if (!container) return;
      if (val === "Custom Days" || val === "Custom Date") {
        container.classList.remove("hidden");
      } else {
        container.classList.add("hidden");
      }
    };

    window.toggleBillingFields = function () {
      const type = document.getElementById("p_cost_type").value;
      const container = document.getElementById("billing_fields_container");
      if (!container) return;

      const p = state.activeProject;
      let html = "";

      if (type === "Fixed Price") {
        html = `
          <div class="grid grid-cols-2 gap-4 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Payment Terms / Frequency</label>
                  <input type="text" id="p_billing_cycle_input" value="${p && p.cost_type === "Fixed Price" ? p.billing_cycle || "" : ""}" placeholder="e.g. Milestone-based, Upfront" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Expected Payment Method / Kind</label>
                  <input type="text" id="p_payment_kind_input" value="${p && p.cost_type === "Fixed Price" && p.billing_cycle && p.billing_cycle.includes(' | ') ? p.billing_cycle.split(' | ')[1] : ''}" placeholder="e.g. Bank Transfer" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
          </div>
        `;
      } else if (type === "Monthly Retainer" || type === "Time & Material" || type === "Time and Material" || type === "Hourly Billing") {
        let fmtDate = "";
        if (p && p.next_billing_date && p.next_billing_date !== "N/A") {
          fmtDate = p.next_billing_date;
        }
        let fmtTime = "09:00";
        if (p && p.next_billing_time && p.next_billing_time !== "N/A") {
          fmtTime = p.next_billing_time;
        }
        const currentCycle = p ? (p.billing_cycle || "Monthly") : "Monthly";
        const currentInterval = p ? (p.billing_interval_days || 30) : 30;
        const isStandard = ["Hourly","Weekly","15 Days","Monthly","Yearly"].some(c => currentCycle.includes(c)) || [1, 7, 15, 30, 365].includes(currentInterval);

        html = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Payment Schedule / Recurrence *</label>
                  <select id="p_billing_recurrence" onchange="window.toggleCustomIntervalField(this.value)" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
                      <option value="Monthly" ${currentCycle.includes("Monthly") || currentInterval === 30 ? "selected" : ""}>Monthly (30 Days)</option>
                      <option value="Hourly" ${currentCycle.includes("Hourly") || currentInterval === 1 ? "selected" : ""}>Hourly (1 Day / Logged Hours)</option>
                      <option value="Weekly" ${currentCycle.includes("Weekly") || currentInterval === 7 ? "selected" : ""}>Weekly (7 Days)</option>
                      <option value="15 Days" ${currentCycle.includes("15") || currentInterval === 15 ? "selected" : ""}>15 Days (Bi-weekly)</option>
                      <option value="Yearly" ${currentCycle.includes("Yearly") || currentInterval === 365 ? "selected" : ""}>Yearly (365 Days)</option>
                      <option value="Custom Date" ${!isStandard ? "selected" : ""}>Custom Date</option>
                  </select>
              </div>
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Billing Rate (₹) *</label>
                  <input type="number" step="0.01" min="0" id="p_billing_rate_input" value="${p ? p.billing_rate || 0 : 0}" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Next Billing Date *</label>
                  <input type="date" id="p_next_billing_date_input" value="${fmtDate}" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
              <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">Next Billing Time *</label>
                  <input type="time" id="p_next_billing_time_input" value="${fmtTime}" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
              <div id="custom_interval_container" class="${!isStandard ? "" : "hidden"}">
                  <label class="block text-xs font-bold text-slate-700 mb-1">Repeat Every (Days) *</label>
                  <input type="number" min="1" max="1000" id="p_billing_interval_input" value="${currentInterval}" placeholder="e.g. 10, 45, 90" class="input-field w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs shadow-sm">
              </div>
          </div>
        `;
      } else {
        html = "";
      }

      container.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    };


    function openClientCreateModal(source = "clients") {
      const isProjects = source === "projects";
      const closeFn = isProjects ? "closeSecondaryModal()" : "closeModal()";
      const formHtml = `
                <form onsubmit="handleClientSave(event, '${source}')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Client Name *</label>
                        <input type="text" id="new_client_name" required placeholder="e.g. Acme Corp" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Company / Organization</label>
                        <input type="text" id="new_client_company" placeholder="e.g. Acme Corporation" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <input type="email" id="new_client_email" placeholder="contact@acme.com" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                            <input type="text" id="new_client_phone" placeholder="+1 234 567 890" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Physical Address</label>
                        <textarea id="new_client_address" rows="3" placeholder="Enter physical address..." class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm"></textarea>
                    </div>
                    <div id="clientErrorBanner" class="hidden bg-rose-50 border border-rose-200 text-brand-alert px-4 py-3 rounded-lg text-sm items-start shadow-sm mt-4">
                        <i data-lucide="alert-circle" class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"></i>
                        <span id="clientErrorMessage">Error message</span>
                    </div>
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="${closeFn}" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnSubmitClient" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Create Client
                        </button>
                    </div>
                </form>
            `;
      if (isProjects) {
        openSecondaryModal("Create New Client", formHtml);
      } else {
        openModal("Create New Client", formHtml);
      }
    }

    async function handleClientSave(event, source = "clients") {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitClient");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Creating...';
      btn.disabled = true;
      document.getElementById("clientErrorBanner").classList.add("hidden");

      try {
        const payload = {
          name: document.getElementById("new_client_name").value,
          company:
            document.getElementById("new_client_company").value || "N/A",
          email: document.getElementById("new_client_email").value || null,
          phone: document.getElementById("new_client_phone").value || "N/A",
          address:
            document.getElementById("new_client_address").value || "N/A",
        };

        const response = await apiFetch("/clients/create", {
          method: "POST",
          body: payload,
        });

        // Update local state
        state.allClients.push(response);

        showToast("Client created successfully", "success");

        if (source === "projects") {
          closeSecondaryModal();
          const select = document.getElementById("p_client");
          if (select) {
            const option = document.createElement("option");
            option.value = response.name;
            option.text = `${response.name} ${response.company !== "N/A" ? `(${response.company})` : ""}`;
            option.selected = true;
            select.add(option);
          }
        } else {
          closeModal();
          renderAdminApp();
        }
      } catch (err) {
        document.getElementById("clientErrorMessage").innerText = err.message;
        document
          .getElementById("clientErrorBanner")
          .classList.remove("hidden");
        document.getElementById("clientErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    async function handleProjectSave(event, projectId) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitProject");
      const originalText = btn.innerHTML;
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Processing...';
      btn.disabled = true;
      document.getElementById("modalErrorBanner").classList.add("hidden");
      lucide.createIcons();

      const isEdit = !!projectId;

      // 1. Gather Project Payload
      const payload = {
        name: document.getElementById("p_name").value,
        project_type: document.getElementById("p_type").value,
        manager: document.getElementById("p_manager").value,
        client: document.getElementById("p_client").value || "N/A",
        client_cost:
          parseFloat(document.getElementById("p_client_cost").value) || 0,
        budget: parseFloat(document.getElementById("p_budget").value) || 0,
        content_agreement: (function () {
          const type = document.getElementById("p_type").value;
          if (type === "Content" || type === "Both") {
            const rows = document.querySelectorAll(".custom-content-field-row");
            const fields = [];
            rows.forEach((row) => {
              const name = row.querySelector(".cc-field-name").value.trim();
              const target = parseInt(row.querySelector(".cc-field-target").value) || 0;
              const monthly = parseInt(row.querySelector(".cc-field-monthly").value) || 0;
              if (name) {
                fields.push({ name, target, monthly_target: monthly });
              }
            });
            return JSON.stringify(fields);
          }
          return "[]";
        })(),

        project_platform: (function () {
          const standard = Array.from(document.querySelectorAll('input[name="p_platforms"]:checked')).map(el => el.value);
          const custom = Array.from(document.querySelectorAll('input[name="p_custom_platforms"]')).map(el => el.value);
          const combined = [...standard, ...custom];
          return combined.length > 0 ? combined.join(", ") : "Software";
        })(),
        cost_type: document.getElementById("p_cost_type").value,
        billing_cycle: (function () {
          const type = document.getElementById("p_cost_type").value;
          if (type === "Fixed Price") {
            const cycle = document.getElementById("p_billing_cycle_input").value;
            const kind = document.getElementById("p_payment_kind_input").value;
            return kind ? `${cycle} | ${kind}` : cycle;
          } else if (type === "Monthly Retainer" || type === "Time & Material" || type === "Time and Material" || type === "Hourly Billing") {
            const recEl = document.getElementById("p_billing_recurrence");
            return recEl ? recEl.value : "Monthly";
          }
          return "N/A";
        })(),
        billing_interval_days: (function () {
          const type = document.getElementById("p_cost_type").value;
          if (type === "Monthly Retainer" || type === "Time & Material" || type === "Time and Material" || type === "Hourly Billing") {
            const recEl = document.getElementById("p_billing_recurrence");
            const recVal = recEl ? recEl.value : "Monthly";
            if (recVal === "Yearly") return 365;
            if (recVal === "15 Days") return 15;
            if (recVal === "Hourly") return 1;
            if (recVal === "Weekly") return 7;
            if (recVal === "Custom Days" || recVal === "Custom Date") {
              const intEl = document.getElementById("p_billing_interval_input");
              return intEl && intEl.value ? parseInt(intEl.value) || 30 : 30;
            }
            return 30;
          }
          return 30;
        })(),
        billing_rate: (function () {
          const type = document.getElementById("p_cost_type").value;
          if (type === "Fixed Price" || type === "Internal / Non-Billable") {
            return 0.0;
          }
          const el = document.getElementById("p_billing_rate_input");
          return el ? (parseFloat(el.value) || 0.0) : 0.0;
        })(),
        next_billing_date: (function () {
          const type = document.getElementById("p_cost_type").value;
          if (type === "Monthly Retainer" || type === "Time & Material" || type === "Time and Material" || type === "Hourly Billing") {
            const el = document.getElementById("p_next_billing_date_input");
            return el && el.value ? el.value : "N/A";
          }
          return "N/A";
        })(),
        next_billing_time: (function () {
          const type = document.getElementById("p_cost_type").value;
          if (type === "Monthly Retainer" || type === "Time & Material" || type === "Time and Material" || type === "Hourly Billing") {
            const el = document.getElementById("p_next_billing_time_input");
            return el && el.value ? el.value : "09:00";
          }
          return "N/A";
        })(),
        start_date: document.getElementById("p_start").value || "N/A",
        end_date: document.getElementById("p_end").value || "N/A",
        status: document.getElementById("p_status").value,
        progress: document.getElementById("p_progress_slider").value + "%",
        description: document.getElementById("p_description").value || "N/A",
        tech_stack: document.getElementById("p_tech_stack").value || "N/A",

      };

      // 2. Gather SRS Data
      const srsFileInput = document.getElementById("srs_file");
      const srsFile = srsFileInput ? srsFileInput.files[0] : null;
      const srsTitle = document.getElementById("srs_title").value;
      const srsVersion =
        document.getElementById("srs_version").value || "v1.0";
      const srsTextVal = document.getElementById("srs_text") ? document.getElementById("srs_text").value.trim() : "";

      const endpoint = isEdit
        ? `/projects/update/${projectId}`
        : `/projects/create`;
      const method = isEdit ? "PUT" : "POST";

      try {
        // Execute Project Save
        const response = await apiFetch(endpoint, { method, body: payload });
        const savedProjectId = isEdit ? projectId : response.id; // API returns created object

        // INSTANT STATE UPDATE (Optimistic UI)
        if (!isEdit) {
          state.allProjects.unshift(response);
        } else {
          const idx = state.allProjects.findIndex(
            (p) => p.id === savedProjectId,
          );
          if (idx !== -1) state.allProjects[idx] = { ...state.allProjects[idx], ...response };
        }
        if (state.activeProject && String(state.activeProject.id) === String(savedProjectId)) {
          state.activeProject = { ...state.activeProject, ...response };
        }

        // Execute SRS Link if provided
        if (srsFile || srsTextVal) {
          btn.innerHTML =
            '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Uploading SRS...';
          lucide.createIcons();

          const formData = new FormData();
          formData.append("project_id", savedProjectId);
          formData.append("project_name", payload.name);
          formData.append(
            "document_title",
            srsTitle || `${payload.name} Specifications`,
          );
          formData.append("version", srsVersion);
          if (srsFile) formData.append("file", srsFile);
          if (srsTextVal) formData.append("srs_text", srsTextVal);

          await apiFetch("/uploads/srs/", {
            method: "POST",
            body: formData,
          }).catch((e) => console.warn("SRS Upload failed:", e));
        }

        // 3. Handle Team Assignments (Convenience)
        try {
          const currentAssignments = await apiFetch(`/projects/assignments/${savedProjectId}`).catch(() => []);
          const currentEmpIds = currentAssignments.map(a => a.employee_id);

          const checkedEmpIds = Array.from(document.querySelectorAll('input[name="p_assign_employee"]:checked')).map(el => el.value);

          const toAssign = checkedEmpIds.filter(id => !currentEmpIds.includes(id));
          const toUnassign = currentAssignments.filter(a => !checkedEmpIds.includes(a.employee_id));
          const toUpdate = currentAssignments.filter(a => checkedEmpIds.includes(a.employee_id));

          for (const empId of toAssign) {
            const costVal = parseFloat(document.getElementById(`p_custom_cost_${empId}`).value);
            const billVal = parseFloat(document.getElementById(`p_custom_billing_${empId}`).value);
            await apiFetch("/projects/assign", {
              method: "POST",
              body: {
                project_id: savedProjectId,
                employee_id: empId,
                custom_hourly_cost: isNaN(costVal) ? null : costVal,
                custom_hourly_billing: isNaN(billVal) ? null : billVal
              }
            });
          }

          for (const assignment of toUnassign) {
            await apiFetch(`/projects/unassign/${assignment.id}`, {
              method: "DELETE"
            });
          }

          for (const assignment of toUpdate) {
            const empId = assignment.employee_id;
            const costVal = parseFloat(document.getElementById(`p_custom_cost_${empId}`).value);
            const billVal = parseFloat(document.getElementById(`p_custom_billing_${empId}`).value);

            const custom_hourly_cost = isNaN(costVal) ? null : costVal;
            const custom_hourly_billing = isNaN(billVal) ? null : billVal;

            if (assignment.custom_hourly_cost !== custom_hourly_cost || assignment.custom_hourly_billing !== custom_hourly_billing) {
              await apiFetch(`/projects/assignments/update/${assignment.id}`, {
                method: "PUT",
                body: {
                  custom_hourly_cost,
                  custom_hourly_billing
                }
              });
            }
          }
        } catch (assignErr) {
          console.error("Error updating convenience assignments:", assignErr);
        }

        showToast(
          `Project ${isEdit ? "updated" : "initialized"} successfully`,
          "success",
        );
        closeModal();

        // ARCHITECTURE FIX: If we are currently viewing this project, refresh the Command Center
        if (
          state.activeProject &&
          String(state.activeProject.id) === String(savedProjectId)
        ) {
          state.activeProject = response;
          await openProjectDetails(savedProjectId);
        } else {
          renderAdminProjectsTable();
        }
      } catch (err) {
        document.getElementById("modalErrorMessage").innerText = err.message;
        document
          .getElementById("modalErrorBanner")
          .classList.remove("hidden");
        document.getElementById("modalErrorBanner").classList.add("flex");
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
      }
    }

    function confirmDeleteProject(id) {
      const formHtml = `
                <div class="text-center pb-4">
                    <div class="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-brand-alert"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Delete Project?</h3>
                    <p class="text-sm text-slate-500 mb-6 px-4">Are you sure you want to permanently delete this project? This will orphan all associated timesheets and tasks.</p>
                    <div class="flex space-x-3 px-8">
                        <button onclick="closeModal()" class="flex-1 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onclick="executeDeleteProject('${id}')" id="btnConfirmDelete" class="flex-1 py-2.5 px-4 bg-brand-alert hover:bg-rose-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center">
                            Delete
                        </button>
                    </div>
                </div>
            `;
      openModal("Confirm Deletion", formHtml);
    }

    async function executeDeleteProject(id) {
      const btn = document.getElementById("btnConfirmDelete");
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
      btn.disabled = true;
      lucide.createIcons();

      try {
        await apiFetch(`/projects/delete/${id}`, { method: "DELETE" });
        showToast("Project deleted successfully", "success");
        closeModal();
        state.allProjects = state.allProjects.filter((p) => p.id !== id);
        renderAdminProjectsTable();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        if (btn) {
          btn.innerHTML = "Delete";
          btn.disabled = false;
        }
      }
    }

    function confirmDeleteEmployee(id) {
      const emp = state.allEmployees.find(e => e.id === id);
      const name = emp ? emp.full_name : "this employee";
      const escapedName = (name || "").replace(/'/g, "\\'");
      const formHtml = `
                <div class="text-center pb-4">
                    <div class="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-brand-alert"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Manage Profile: ${name}</h3>
                    <p class="text-sm text-slate-500 mb-6 px-6 leading-relaxed">
                        Deleting this employee will permanently remove their credentials and unassign them from all projects, milestones, and handover tasks. Timesheet entries will be preserved under a generic "Deleted Employee" record labeled with their name.
                    </p>
                    <div class="flex flex-col space-y-3 px-8">
                        <button onclick="deactivateEmployeeFromModal('${id}')" id="btnModalDeactivate" class="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm">
                            Deactivate Employee (Safe)
                        </button>
                        <button onclick="confirmFinalDeleteEmployee('${id}', '${escapedName}')" class="w-full py-2.5 px-4 bg-brand-alert hover:bg-rose-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                            Delete Permanently (Risky)
                        </button>
                        <button onclick="closeModal()" class="w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
      openModal("Confirm Employee Action", formHtml);
      lucide.createIcons();
    }

    async function deactivateEmployeeFromModal(id) {
      const btn = document.getElementById("btnModalDeactivate");
      btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
      btn.disabled = true;
      lucide.createIcons();

      try {
        await apiFetch(`/employees/update/${id}`, {
          method: "PUT",
          body: { is_active: false },
        });
        showToast("Employee deactivated successfully", "success");
        closeModal();
        const emp = state.allEmployees.find(e => e.id === id);
        if (emp) emp.is_active = false;
        routeApp("workforce", "employees");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        if (btn) {
          btn.innerHTML = "Deactivate Employee (Safe)";
          btn.disabled = false;
        }
      }
    }

    function confirmFinalDeleteEmployee(id, name) {
      const escapedName = (name || "").replace(/'/g, "\\'");
      const formHtml = `
                <div class="text-center pb-4">
                    <div class="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-brand-alert"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Final Warning</h3>
                    <p class="text-sm text-slate-500 mb-6 px-6 leading-relaxed">
                        Are you absolutely sure you want to permanently delete <strong>${name}</strong>? 
                        This will unassign them from every project, milestone, and handover task, and completely delete their credentials. 
                        <strong>This action is irreversible.</strong>
                    </p>
                    <div class="flex space-x-3 px-8">
                        <button onclick="confirmDeleteEmployee('${id}')" class="flex-1 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                            Go Back
                        </button>
                        <button onclick="executeDeleteEmployee('${id}')" id="btnConfirmEmpDelete" class="flex-1 py-2.5 px-4 bg-brand-alert hover:bg-rose-700 text-white rounded-lg font-medium transition-colors flex justify-center items-center">
                            Delete Permanently
                        </button>
                    </div>
                </div>
            `;
      openModal("Irreversible Action Warning", formHtml);
      lucide.createIcons();
    }

    async function executeDeleteEmployee(id) {
      const btn = document.getElementById("btnConfirmEmpDelete");
      btn.innerHTML =
        '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
      btn.disabled = true;
      lucide.createIcons();

      try {
        await apiFetch(`/employees/delete/${id}`, { method: "DELETE" });
        showToast("Employee deleted successfully", "success");
        closeModal();
        state.allEmployees = state.allEmployees.filter((e) => e.id !== id);
        routeApp("workforce", "employees");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        if (btn) {
          btn.innerHTML = "Delete Permanently";
          btn.disabled = false;
        }
      }
    }

    async function toggleEmployeeStatusFromPage(empId) {
      const emp = state.allEmployees.find((e) => e.id === empId);
      if (!emp) return;
      const nextStatus = !emp.is_active;

      try {
        await apiFetch(`/employees/update/${empId}`, {
          method: "PUT",
          body: { is_active: nextStatus },
        });
        showToast(
          `Employee account ${nextStatus ? "enabled" : "disabled"} successfully.`,
          "success",
        );
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find(
            (e) => e.id === empId,
          );
        }
        renderAdminApp();
      } catch (err) {
        showToast("Failed to toggle status: " + err.message, "error");
      }
    }

    async function approveEmployeeUnlock(empId) {
      try {
        const res = await apiFetch(`/employees/approve-unlock/${empId}`, { method: 'POST', body: {} });
        showToast(res.message || "Profile unlock approved.", "success");
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find((e) => e.id === empId);
        }
        renderAdminApp();
      } catch (err) {
        showToast("Failed to approve unlock: " + err.message, "error");
      }
    }

    async function denyEmployeeUnlock(empId) {
      try {
        const res = await apiFetch(`/employees/deny-unlock/${empId}`, { method: 'POST', body: {} });
        showToast(res.message || "Profile unlock request denied.", "success");
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find((e) => e.id === empId);
        }
        renderAdminApp();
      } catch (err) {
        showToast("Failed to deny unlock: " + err.message, "error");
      }
    }

    async function openEmployeeDetails(empId) {
      if (!empId) return;
      state.adminView = "workforce";
      sessionStorage.setItem("lastAdminView", "workforce");

      const idStr = String(empId).trim().toLowerCase();

      // Robust matching against local state (by id, _id, username, or email)
      let emp = (state.allEmployees || []).find(
        (e) =>
          (e.id && String(e.id).trim().toLowerCase() === idStr) ||
          (e._id && String(e._id).trim().toLowerCase() === idStr) ||
          (e.username && String(e.username).trim().toLowerCase() === idStr) ||
          (e.email && String(e.email).trim().toLowerCase() === idStr) ||
          (e.full_name && String(e.full_name).trim().toLowerCase() === idStr)
      );

      // Fallback: Fetch directly from backend if missing from local state
      if (!emp) {
        try {
          emp = await apiFetch(`/employees/get/${encodeURIComponent(empId)}`);
          if (emp && emp.id) {
            if (!Array.isArray(state.allEmployees)) state.allEmployees = [];
            const idx = state.allEmployees.findIndex(
              (e) => String(e.id).trim() === String(emp.id).trim()
            );
            if (idx >= 0) {
              state.allEmployees[idx] = emp;
            } else {
              state.allEmployees.push(emp);
            }
          }
        } catch (err) {
          console.error("Failed to fetch employee details for ID:", empId, err);
        }
      }

      // Secondary Fallback: match first employee if list has items and single item exists
      if (!emp && Array.isArray(state.allEmployees) && state.allEmployees.length > 0) {
        if (empId === 'undefined' || empId === 'null') {
          emp = state.allEmployees[0];
        }
      }

      if (!emp) {
        showToast("Employee details could not be found.", "error");
        return;
      }

      state.activeEmployee = emp;
      state.activeEmployeeTab = "overview";
      state.activeEmployeeAnalytics = null; // Reset analytics for new view
      state.activeEmployeeProjects = null; // Reset projects for new view
      state.isEditingEmployee = false;
      renderAdminApp();
    }

    function closeEmployeeDetails() {
      state.activeEmployee = null;
      state.isEditingEmployee = false;
      renderAdminApp();
    }

    // Expose handlers globally for inline DOM click events
    window.openEmployeeDetails = openEmployeeDetails;
    window.closeEmployeeDetails = closeEmployeeDetails;


    async function switchEmployeeTab(activeTab) {
      state.activeEmployeeTab = activeTab;

      // Immediate UI update for tab active state
      renderAdminApp();

      if (activeTab === "analytics" && state.activeEmployee) {
        // Fetch fresh analytics
        try {
          // Show "Synchronizing" loader by clearing previous data
          state.activeEmployeeAnalytics = null;
          renderAdminApp();

          const analytics = await apiFetch(
            `/dashboard/employee-analytics/${state.activeEmployee.id}`,
          );
          state.activeEmployeeAnalytics = analytics;
          renderAdminApp();
        } catch (err) {
          console.error("Analytics Load Error:", err);
          showToast("Failed to load analytics performance data.", "error");
        }
      }

      if (activeTab === "projects" && state.activeEmployee) {
        try {
          state.activeEmployeeProjects = null;
          renderAdminApp();
          const projects = await apiFetch(
            `/projects/employee/${state.activeEmployee.id}`,
          );
          state.activeEmployeeProjects = Array.isArray(projects)
            ? projects
            : [];
          renderAdminApp();
        } catch (err) {
          console.error("Employee Projects Load Error:", err);
        }
      }
    }

    function toggleEmployeeEditMode(isEditing) {
      state.isEditingEmployee = isEditing;
      renderAdminApp();
    }

    async function uploadEmployeeImage(empId, type, subType, inputId) {
      const fileInput = document.getElementById(inputId);
      if (!fileInput.files || fileInput.files.length === 0) return;

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const url = `/uploads/image/?image_type=${type}&sub_type=${subType}&employee_id=${empId}`;
        const result = await apiFetch(url, {
          method: "POST",
          body: formData,
          headers: {}, // Let browser set boundary for FormData
        });

        showToast(
          `${type.toUpperCase()} ${subType} uploaded successfully.`,
          "success",
        );
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find(
            (e) => e.id === empId,
          );
        }
        renderAdminApp();
      } catch (err) {
        showToast("Upload failed: " + err.message, "error");
      }
    }

    async function deleteEmployeeImage(empId, type, subType) {
      const confirmDelete = await customConfirm(
        "Delete Image",
        `Are you sure you want to delete this ${type} image?`,
        "Delete",
        "Cancel",
        true
      );
      if (!confirmDelete) return;

      try {
        const url = `/uploads/image/?image_type=${type}&sub_type=${subType}&employee_id=${empId}`;
        await apiFetch(url, {
          method: "DELETE"
        });

        showToast(
          `${type.toUpperCase()} image deleted successfully.`,
          "success"
        );
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find(
            (e) => e.id === empId,
          );
        }
        renderAdminApp();
      } catch (err) {
        showToast("Deletion failed: " + err.message, "error");
      }
    }

    async function uploadEmployeeFile(empId, type, inputId) {
      const fileInput = document.getElementById(inputId);
      if (!fileInput.files || fileInput.files.length === 0) return;

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        // For files like resume, we might need a slightly different endpoint if it's not strictly an 'image'
        // But for now let's check if the backend /uploads/image handles it or if there's /uploads/file
        // Actually I'll use a placeholder or check if I should add /uploads/file
        const url = `/uploads/image/?image_type=${type}&sub_type=${type}&employee_id=${empId}`;
        await apiFetch(url, {
          method: "POST",
          body: formData,
          headers: {},
        });

        showToast(`${type.toUpperCase()} uploaded successfully.`, "success");
        await loadAdminWorkspaceData();
        if (state.activeEmployee && state.activeEmployee.id === empId) {
          state.activeEmployee = state.allEmployees.find(
            (e) => e.id === empId,
          );
        }
        renderAdminApp();
      } catch (err) {
        showToast("Upload failed: " + err.message, "error");
      }
    }

    async function saveEmployeeEdits() {
      const empId = state.activeEmployee.id;
      const btn = document.getElementById("btnEmployeeSave");
      if (!btn) return;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving...`;
      lucide.createIcons();

      const salaryEl = document.getElementById("v_salary");
      const billingRateEl = document.getElementById("v_billing_rate");
      const costRateEl = document.getElementById("v_cost_rate");
      const workingDaysEl = document.getElementById("v_working_days");
      const shiftHoursEl = document.getElementById("v_shift_hours");

      const payload = {
        full_name: document.getElementById("v_full_name") ? document.getElementById("v_full_name").value : state.activeEmployee.full_name,
        role_id: document.getElementById("v_role_select") ? document.getElementById("v_role_select").value : state.activeEmployee.role_id,
      };

      if (salaryEl) payload.salary = parseFloat(salaryEl.value) || 0;
      if (billingRateEl) payload.hourly_billing_rate = parseFloat(billingRateEl.value) || 0;
      if (costRateEl) payload.hourly_cost_rate = parseFloat(costRateEl.value) || 0;
      if (workingDaysEl) payload.working_days = parseInt(workingDaysEl.value) || 22;
      if (shiftHoursEl) payload.shift_hours = parseInt(shiftHoursEl.value) || 8;

      const ecNameEl = document.getElementById("v_emergency_name");
      const ecPhoneEl = document.getElementById("v_emergency_phone");
      if (ecNameEl && ecPhoneEl) {
        const ecName = ecNameEl.value.trim();
        const ecPhone = ecPhoneEl.value.trim();
        if (ecName || ecPhone) {
          payload["emergency_contact"] = `${ecName || 'N/A'} - ${ecPhone || 'N/A'}`;
        }
      }

      const complianceVerifiedEl = document.getElementById("v_compliance_verified");
      if (complianceVerifiedEl) {
        payload["compliance_verified"] = complianceVerifiedEl.checked;
      }

      const remarksEl = document.getElementById("v_additional_info");
      if (remarksEl) {
        payload["additional_info"] = remarksEl.value.trim() || "N/A";
      }

      const textFields = [

        "fathers_name",
        "dob",
        "gender",
        "doj",
        "manager",
        "exp",
        "prev",
        "qualification",
        "specialization",
        "email",
        "alt_email",
        "phone",
        "alt_phone",
        "emergency_rel",
        "ref",
        "address",
        "bank_name",
        "bank_account",
        "ifsc_code",
        "upi_id",
        "pan_number",
        "adhar_number",
        "account_holder_name",
        "pf_number",
        "esic_number",
        "tax_details",
        "prev_role",
      ];
      textFields.forEach((field) => {
        const el = document.getElementById(`v_${field}`);
        if (el) {
          const mappedKey =
            field === "manager"
              ? "reporting_manager"
              : field === "exp"
                ? "experience"
                : field === "prev"
                  ? "previous_employer"
                  : field === "prev_role"
                    ? "previous_job_role"
                    : field === "dob"
                      ? "date_of_birth"
                      : field === "doj"
                        ? "date_of_joining"
                        : field === "qualification"
                          ? "highest_qualification"
                          : field === "alt_email"
                            ? "alternate_email"
                            : field === "phone"
                              ? "contact_number"
                              : field === "alt_phone"
                                ? "alternate_contact"
                                : field === "emergency_rel"
                                  ? "relationship_with_emergency_contact"
                                  : field === "ref"
                                    ? "reference_name"
                                    : field;
          payload[mappedKey] = el.value || "N/A";
        }
      });

      try {
        const updated = await apiFetch(`/employees/update/${empId}`, {
          method: "PUT",
          body: payload,
        });

        showToast("Profile updated successfully", "success");
        await loadAdminWorkspaceData();
        state.activeEmployee = state.allEmployees.find((e) => e.id === empId);
        state.isEditingEmployee = false;
        renderAdminApp();
      } catch (err) {
        showToast("Failed to update: " + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        lucide.createIcons();
      }
    }

    function getEmployeeOverviewTab(emp) {
      const isEdit = state.isEditingEmployee;
      const inputClass = isEdit
        ? "w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
        : "w-full bg-transparent border-none px-0 py-0.5 text-sm font-semibold text-slate-800 outline-none";

      const roleOptions = state.allRoles
        .map(
          (r) =>
            `<option value="${r.id}" ${emp.role_id === r.id ? "selected" : ""}>${r.role_name} (${r.department_name})</option>`,
        )
        .join("");

      return `
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
                    <div class="lg:col-span-2 space-y-4">
                        <div>
                            <div class="flex items-center gap-1.5 mb-2.5">
                                <div class="w-6 h-6 rounded-md bg-indigo-50 text-brand-primary flex items-center justify-center">
                                    <i data-lucide="briefcase" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Professional Identity</h3>
                            </div>
                            <div class="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div class="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 md:col-span-2">
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Legal Registered Name</p>
                                        <input type="text" id="v_full_name" value="${emp.full_name !== "N/A" ? emp.full_name : ""}" ${isEdit ? "" : "readonly"} class="${inputClass} ${!isEdit ? "text-base font-extrabold text-slate-900" : ""}">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Primary Designation</p>
                                        ${isEdit
                                          ? `
                                            <select id="v_role_select" class="${inputClass}">
                                                <option value="">Select Corporate Role</option>
                                                ${roleOptions}
                                            </select>
                                          `
                                          : `
                                            <p class="text-xs font-bold text-slate-800">${state.allRoles.find((r) => r.id === emp.role_id)?.role_name || "N/A"}</p>
                                            <input type="hidden" id="v_role_select" value="${emp.role_id || ""}">
                                          `
                                        }
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Direct Supervisor</p>
                                        ${isEdit
                                          ? (() => {
                                            const managerOptions = (state.allEmployees || [])
                                              .map(e => `<option value="${e.full_name}" ${emp.reporting_manager === e.full_name || emp.reporting_manager === e.username || emp.reporting_manager === e.id ? 'selected' : ''}>${e.full_name} (${e.username})</option>`)
                                              .join('');
                                            return `<select id="v_manager" class="${inputClass}">
                                                                  <option value="N/A">Select Reporting Manager</option>
                                                                  ${managerOptions}
                                                              </select>`;
                                          })()
                                          : `<input type="text" id="v_manager" value="${emp.reporting_manager !== "N/A" ? emp.reporting_manager : ""}" readonly class="${inputClass}">`
                                        }
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Onboarding Date</p>
                                        <input type="date" id="v_doj" value="${emp.date_of_joining && emp.date_of_joining !== "N/A" ? emp.date_of_joining : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Professional Tenure</p>
                                        <input type="text" id="v_exp" value="${emp.experience !== "N/A" ? emp.experience : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="Total Experience">
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Previous Employer</p>
                                        <input type="text" id="v_prev" value="${emp.previous_employer !== "N/A" ? emp.previous_employer : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="Previous Employer">
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Previous Job Role</p>
                                        <input type="text" id="v_prev_role" value="${emp.previous_job_role !== "N/A" ? emp.previous_job_role : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="Previous Job Role">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center gap-1.5 mb-2.5">
                                <div class="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <i data-lucide="graduation-cap" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Academic Credentials</h3>
                            </div>
                            <div class="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Paternal / Guardian Reference</p>
                                    <input type="text" id="v_fathers_name" value="${emp.fathers_name !== "N/A" ? emp.fathers_name : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Certification / Degree</p>
                                        ${isEdit
                                          ? `<select id="v_qualification" class="${inputClass}">
                                                   <option value="10th" ${emp.highest_qualification === '10th' ? 'selected' : ''}>10th</option>
                                                   <option value="12th" ${emp.highest_qualification === '12th' ? 'selected' : ''}>12th</option>
                                                   <option value="Diploma" ${emp.highest_qualification === 'Diploma' ? 'selected' : ''}>Diploma</option>
                                                   <option value="Graduate" ${emp.highest_qualification === 'Graduate' ? 'selected' : ''}>Graduate</option>
                                                   <option value="Post Graduate" ${emp.highest_qualification === 'Post Graduate' ? 'selected' : ''}>Post Graduate</option>
                                                   <option value="PhD" ${emp.highest_qualification === 'PhD' ? 'selected' : ''}>PhD</option>
                                                   <option value="N/A" ${!emp.highest_qualification || emp.highest_qualification === 'N/A' ? 'selected' : ''}>Not Specified</option>
                                                </select>`
                                          : `<input type="text" id="v_qualification" value="${emp.highest_qualification !== "N/A" ? emp.highest_qualification : ""}" readonly class="${inputClass}">`
                                        }
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Major / Specialization</p>
                                        <input type="text" id="v_specialization" value="${emp.specialization !== "N/A" ? emp.specialization : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="bg-slate-900 text-white rounded-xl p-3.5 shadow-md relative overflow-hidden">
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-6 h-6 rounded-md bg-white/10 text-brand-accent flex items-center justify-center">
                                    <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Metadata</h3>
                            </div>
                            <div class="space-y-2.5">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Global System ID</p>
                                    <p class="text-xs font-mono text-indigo-300 truncate">${emp.id}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Creation</p>
                                    <p class="text-xs font-bold text-white">${emp.created_at ? new Date(emp.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}</p>
                                </div>
                                <div class="pt-2 border-t border-white/10">
                                    <div class="flex items-center justify-between mb-1">
                                        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Profile Completion</p>
                                        <p class="text-[10px] font-bold text-brand-accent">85%</p>
                                    </div>
                                    <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div class="h-full bg-brand-accent rounded-full" style="width: 85%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Login Credentials Card -->
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                            <div class="flex items-center gap-2 mb-2.5">
                                <div class="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/60">
                                    <i data-lucide="key-round" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Login Credentials</h3>
                            </div>
                            <div class="space-y-2.5">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">System Username</p>
                                    <p class="text-xs font-bold text-slate-800">${emp.username || "N/A"}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Access Password</p>
                                    <div class="mt-1">
                                        <button onclick="resetEmployeePassword('${emp.id}')" id="btnResetPwd-${emp.id}" class="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-md text-[10px] font-bold hover:bg-rose-100 transition-all flex items-center gap-1">
                                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Reset to Default
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                            <div class="flex items-center justify-between mb-1.5">
                                <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Internal Administrative Remarks</h4>
                                <span class="text-[9px] font-bold text-slate-400">Super Admin Notes</span>
                            </div>
                            ${isEdit
                              ? `<textarea id="v_additional_info" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium outline-none focus:ring-1 focus:ring-brand-primary min-h-[70px] resize-y placeholder:text-slate-400" placeholder="Enter administrative notes, performance logs, or internal remarks...">${emp.additional_info && emp.additional_info !== "N/A" ? emp.additional_info : ""}</textarea>`
                              : `<p class="text-xs text-slate-700 leading-relaxed ${emp.additional_info && emp.additional_info !== "N/A" ? "font-medium" : "italic text-slate-400"}">
                                  ${emp.additional_info && emp.additional_info !== "N/A" ? emp.additional_info : "No administrative remarks recorded for this operative."}
                                 </p>`
                            }
                        </div>

                    </div>
                </div>
            `;
    }

    function getEmployeeContactTab(emp) {
      const isEdit = state.isEditingEmployee;
      const inputClass = isEdit
        ? "w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-2xs"
        : "w-full bg-transparent border-none px-0 py-0.5 text-xs font-semibold text-slate-800 outline-none";

      return `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div>
                        <div class="flex items-center gap-1.5 mb-2.5">
                            <div class="w-6 h-6 rounded-md bg-indigo-50 text-brand-primary flex items-center justify-center">
                                <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                            </div>
                            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Digital Connectivity</h3>
                        </div>
                        <div class="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                            <div>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Corporate Email Alias</p>
                                <input type="email" id="v_email" value="${emp.email !== "N/A" ? emp.email : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                            </div>
                            <div>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Secondary Personal Email</p>
                                <input type="email" id="v_alt_email" value="${emp.alternate_email !== "N/A" ? emp.alternate_email : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Primary Phone</p>
                                    <input type="text" id="v_phone" value="${emp.contact_number !== "N/A" ? emp.contact_number : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Secondary Contact</p>
                                    <input type="text" id="v_alt_phone" value="${emp.alternate_contact !== "N/A" ? emp.alternate_contact : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center gap-1.5 mb-2.5">
                            <div class="w-6 h-6 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center">
                                <i data-lucide="heart-pulse" class="w-3.5 h-3.5"></i>
                            </div>
                            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Emergency & Residency</h3>
                        </div>
                        <div class="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Emergency Liaison</p>
                                    ${isEdit
                                      ? (() => {
                                        let emergencyName = '';
                                        let emergencyPhone = '';
                                        const rawEmergency = emp.emergency_contact || '';
                                        if (rawEmergency.includes('-')) {
                                          const parts = rawEmergency.split('-');
                                          emergencyName = parts[0].trim();
                                          emergencyPhone = parts[1].trim();
                                        } else {
                                          emergencyName = rawEmergency;
                                        }
                                        return `<div class="grid grid-cols-2 gap-1.5">
                                                              <input type="text" id="v_emergency_name" value="${emergencyName !== 'N/A' ? emergencyName : ''}" class="${inputClass}" placeholder="Name">
                                                              <input type="text" id="v_emergency_phone" value="${emergencyPhone}" class="${inputClass}" placeholder="Phone">
                                                          </div>`;
                                      })()
                                      : `<input type="text" id="v_emergency" value="${emp.emergency_contact !== "N/A" ? emp.emergency_contact : ""}" readonly class="${inputClass}">`
                                    }
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Relationship</p>
                                    ${isEdit
                                      ? `<select id="v_emergency_rel" class="${inputClass}">
                                               <option value="Father" ${emp.relationship_with_emergency_contact === 'Father' ? 'selected' : ''}>Father</option>
                                               <option value="Mother" ${emp.relationship_with_emergency_contact === 'Mother' ? 'selected' : ''}>Mother</option>
                                               <option value="Brother" ${emp.relationship_with_emergency_contact === 'Brother' ? 'selected' : ''}>Brother</option>
                                               <option value="Sister" ${emp.relationship_with_emergency_contact === 'Sister' ? 'selected' : ''}>Sister</option>
                                               <option value="Spouse" ${emp.relationship_with_emergency_contact === 'Spouse' ? 'selected' : ''}>Spouse</option>
                                               <option value="Friend" ${emp.relationship_with_emergency_contact === 'Friend' ? 'selected' : ''}>Friend</option>
                                               <option value="Guardian" ${emp.relationship_with_emergency_contact === 'Guardian' ? 'selected' : ''}>Guardian</option>
                                               <option value="Other" ${emp.relationship_with_emergency_contact === 'Other' ? 'selected' : ''}>Other</option>
                                               <option value="N/A" ${!emp.relationship_with_emergency_contact || emp.relationship_with_emergency_contact === 'N/A' ? 'selected' : ''}>Not Specified</option>
                                            </select>`
                                      : `<input type="text" id="v_emergency_rel" value="${emp.relationship_with_emergency_contact !== "N/A" ? emp.relationship_with_emergency_contact : ""}" readonly class="${inputClass}">`
                                    }
                                </div>
                            </div>
                            <div>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Residential Address</p>
                                <textarea id="v_address" ${isEdit ? "" : "readonly"} class="${inputClass} min-h-[60px] resize-none">${emp.address !== "N/A" ? emp.address : ""}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;

    }

    function getEmployeeFinancialsTab(emp) {
      const isEdit = state.isEditingEmployee;
      const inputClass = isEdit
        ? "w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
        : "w-full bg-transparent border-none px-0 py-0.5 text-sm font-semibold text-slate-800 outline-none";

      const currentSalary = parseFloat(emp.salary) || 0;
      const currentDays = parseInt(emp.working_days) || 22;
      const currentHours = parseInt(emp.shift_hours) || 8;
      let calculatedCostRate = 0;
      if (currentDays > 0 && currentHours > 0) {
        calculatedCostRate = currentSalary / (currentDays * currentHours);
      } else {
        calculatedCostRate = parseFloat(emp.hourly_cost_rate) || 0;
      }
      const formattedCostRate = calculatedCostRate.toFixed(2);

      return `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <div class="flex items-center gap-1.5 mb-3">
                            <div class="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <i data-lucide="banknote" class="w-3.5 h-3.5"></i>
                            </div>
                            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Payroll & Compensation</h3>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                            <!-- 3 Metric Boxes Row (Matching Image 3) -->
                            <div class="grid grid-cols-3 gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Monthly Gross Remuneration</p>
                                    <div class="flex items-center text-sm font-extrabold text-slate-900">
                                        <span class="mr-1 text-slate-400">₹</span>
                                        <input type="number" id="v_salary" value="${emp.salary || 0}" ${isEdit ? 'oninput="window.recalculateEmployeeDetailHourlyCost()"' : "readonly"} class="${inputClass} ${!isEdit ? "text-sm font-extrabold" : ""}">
                                    </div>
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Effective Hourly Cost</p>
                                    <div class="flex items-center text-sm font-extrabold text-slate-800">
                                        <span class="mr-1 text-slate-400">₹</span>
                                        <input type="number" id="v_cost_rate" value="${formattedCostRate}" readonly class="w-full bg-transparent border-none p-0 outline-none cursor-not-allowed text-sm font-extrabold text-slate-800">
                                    </div>
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-brand-primary uppercase tracking-wider mb-0.5">Standard Billing Rate</p>
                                    <div class="flex items-center text-sm font-extrabold text-brand-primary">
                                        <span class="mr-1 opacity-70">₹</span>
                                        <input type="number" id="v_billing_rate" value="${emp.hourly_billing_rate || 0}" ${isEdit ? "" : "readonly"} class="${inputClass.replace("text-slate-800", "text-brand-primary")} font-extrabold text-sm">
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Working Days / Month</p>
                                    <input type="number" id="v_working_days" value="${currentDays}" min="1" max="31" ${isEdit ? 'oninput="window.recalculateEmployeeDetailHourlyCost()"' : "readonly"} class="${inputClass}">
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shift Hours / Day</p>
                                    <input type="number" id="v_shift_hours" value="${currentHours}" min="1" max="24" ${isEdit ? 'oninput="window.recalculateEmployeeDetailHourlyCost()"' : "readonly"} class="${inputClass}">
                                </div>
                            </div>

                            <div class="text-[10px] text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/70 leading-relaxed">
                                <span class="font-bold text-slate-800">Calculation Formula:</span> <code class="bg-indigo-100/70 px-1 py-0.5 rounded text-indigo-700 font-mono text-[9px]">Salary / (Days * Hours)</code>
                                <div class="mt-1 text-slate-500">Current Base: <span id="v_formula_example" class="font-semibold text-slate-700">₹${currentSalary} / (${currentDays} * ${currentHours}) = ₹${formattedCostRate} / hr</span></div>
                            </div>
                            <p class="text-[10px] text-slate-400 flex items-center gap-1">
                                <i data-lucide="info" class="w-3 h-3 text-slate-400"></i> These rates are invisible to the employee and drive all profit/loss calculations.
                            </p>

                            <div class="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PAN / Tax Info</p>
                                    <input type="text" id="v_tax_details" value="${emp.tax_details !== "N/A" ? emp.tax_details : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="--">
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PF Number</p>
                                    <input type="text" id="v_pf_number" value="${emp.pf_number !== "N/A" ? emp.pf_number : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="Provident Fund ID">
                                </div>
                                <div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ESIC Number</p>
                                    <input type="text" id="v_esic_number" value="${emp.esic_number !== "N/A" ? emp.esic_number : ""}" ${isEdit ? "" : "readonly"} class="${inputClass}" placeholder="ESIC ID">
                                </div>
                            </div>
                        </div>

                        <!-- Leave Inventory & Quotas Card -->
                        <div class="mt-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-1.5">
                                    <div class="w-6 h-6 rounded-md bg-indigo-50 text-brand-primary flex items-center justify-center">
                                        <i data-lucide="calendar-range" class="w-3.5 h-3.5"></i>
                                    </div>
                                    <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Leave Inventory & Quotas</h3>
                                </div>
                                <button onclick="window.openManageLeaveQuotaModal('${emp.id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200/80 transition-all flex items-center gap-1 cursor-pointer">
                                    <i data-lucide="sliders" class="w-3 h-3"></i> Manage Quotas
                                </button>
                            </div>
                            <div class="grid grid-cols-3 gap-2.5">
                                <div class="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/80">
                                    <p class="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Paid Leaves</p>
                                    <div class="text-xs font-extrabold text-slate-900">
                                        ${((emp.total_paid_leaves !== undefined && emp.total_paid_leaves !== null ? emp.total_paid_leaves : 18.0) - (emp.used_paid_leaves || 0.0)).toFixed(1)} <span class="text-[9px] text-slate-500 font-medium">/ ${emp.total_paid_leaves !== undefined && emp.total_paid_leaves !== null ? emp.total_paid_leaves : 18.0} Days Left</span>
                                    </div>
                                </div>
                                <div class="bg-blue-50/60 p-2 rounded-xl border border-blue-100/80">
                                    <p class="text-[9px] font-bold text-blue-700 uppercase tracking-wider mb-0.5">Casual Leaves</p>
                                    <div class="text-xs font-extrabold text-slate-900">
                                        ${((emp.total_casual_leaves !== undefined && emp.total_casual_leaves !== null ? emp.total_casual_leaves : 6.0) - (emp.used_casual_leaves || 0.0)).toFixed(1)} <span class="text-[9px] text-slate-500 font-medium">/ ${emp.total_casual_leaves !== undefined && emp.total_casual_leaves !== null ? emp.total_casual_leaves : 6.0} Days Left</span>
                                    </div>
                                </div>
                                <div class="bg-purple-50/60 p-2 rounded-xl border border-purple-100/80">
                                    <p class="text-[9px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">Sick Leaves</p>
                                    <div class="text-xs font-extrabold text-slate-900">
                                        ${((emp.total_sick_leaves !== undefined && emp.total_sick_leaves !== null ? emp.total_sick_leaves : 6.0) - (emp.used_sick_leaves || 0.0)).toFixed(1)} <span class="text-[9px] text-slate-500 font-medium">/ ${emp.total_sick_leaves !== undefined && emp.total_sick_leaves !== null ? emp.total_sick_leaves : 6.0} Days Left</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Settlement Repository Dark Card -->
                        <div class="mt-4">
                            <div class="flex items-center gap-1.5 mb-2.5">
                                <div class="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
                                    <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Settlement Repository</h3>
                            </div>
                            <div class="bg-slate-950 text-white rounded-xl p-3.5 shadow-md relative overflow-hidden group">
                                <div class="space-y-3 relative">
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Holder Name</p>
                                            <input type="text" id="v_account_holder_name" value="${emp.account_holder_name !== "N/A" ? emp.account_holder_name : ""}" ${isEdit ? "" : "readonly"} class="w-full bg-transparent border-none p-0 text-xs font-bold text-white outline-none placeholder:text-slate-700" placeholder="Account Holder Name">
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Financial Institution</p>
                                            <input type="text" id="v_bank_name" value="${emp.bank_name !== "N/A" ? emp.bank_name : ""}" ${isEdit ? "" : "readonly"} class="w-full bg-transparent border-none p-0 text-xs font-bold text-white outline-none placeholder:text-slate-700" placeholder="Bank Name">
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Account Registry</p>
                                            <input type="text" id="v_bank_account" value="${emp.bank_account !== "N/A" ? emp.bank_account : ""}" ${isEdit ? "" : "readonly"} class="w-full bg-transparent border-none p-0 text-xs font-mono tracking-wider text-white outline-none placeholder:text-slate-700" placeholder="0000 0000 0000">
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Transit Routing (IFSC)</p>
                                            <input type="text" id="v_ifsc_code" value="${emp.ifsc_code !== "N/A" ? emp.ifsc_code : ""}" ${isEdit ? "" : "readonly"} class="w-full bg-transparent border-none p-0 text-xs font-mono text-white outline-none placeholder:text-slate-700" placeholder="BANK0000123">
                                        </div>
                                    </div>
                                    <div class="pt-2.5 border-t border-white/10 flex items-center justify-between">
                                        <div class="flex-1">
                                            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">UPI Identifier</p>
                                            <input type="text" id="v_upi_id" value="${emp.upi_id !== "N/A" ? emp.upi_id : ""}" ${isEdit ? "" : "readonly"} class="w-full bg-transparent border-none p-0 text-xs font-bold text-brand-accent outline-none placeholder:text-slate-700" placeholder="user@upi">
                                        </div>
                                        <div class="relative group/qr">
                                            <div class="w-10 h-10 bg-white rounded-lg p-1 overflow-hidden shadow-sm">
                                                ${emp.qr_code && emp.qr_code !== "N/A" ? `<img src="${emp.qr_code.startsWith("http") ? emp.qr_code : CONFIG.API_BASE_URL + "/" + emp.qr_code.replace(/\\/g, "/")}" class="w-full h-full object-contain cursor-pointer" onclick="openImageModal(this.src)">` : `<div class="w-full h-full bg-slate-50 flex items-center justify-center"><i data-lucide="qr-code" class="w-5 h-5 text-slate-300"></i></div>`}
                                            </div>
                                            ${isEdit
                                              ? `
                                                <div class="absolute -top-2 -right-2 flex flex-col gap-0.5">
                                                    <button onclick="document.getElementById('up_qr_${emp.id}').click()" class="w-5 h-5 bg-brand-primary text-white rounded shadow-sm flex items-center justify-center hover:scale-105 transition-all" title="Replace QR">
                                                        <i data-lucide="upload" class="w-3 h-3"></i>
                                                    </button>
                                                    <input type="file" id="up_qr_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'qr_code', 'none', this.id)">
                                                </div>
                                              `
                                              : ""
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column (Compliance Vault & Professional Resume Matching Image 3) -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-1.5">
                                <div class="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                                </div>
                                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Compliance Vault</h3>
                            </div>
                            <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                                <input type="checkbox" id="v_compliance_verified" ${emp.compliance_verified ? 'checked' : ''} ${isEdit ? '' : 'disabled'} class="w-3.5 h-3.5 rounded text-brand-primary border-slate-300 focus:ring-brand-primary cursor-pointer">
                                <label for="v_compliance_verified" class="text-[10px] font-semibold text-slate-700 cursor-pointer select-none">Verify & Lock Uploads</label>
                            </div>
                        </div>
                        
                        <div class="space-y-3">
                            <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                                <div class="flex items-center justify-between mb-2">
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">PAN Verification</p>
                                    <input type="text" id="v_pan_number" value="${emp.pan_number !== "N/A" ? emp.pan_number : ""}" ${isEdit ? "" : "readonly"} class="w-32 bg-slate-50 rounded-md px-2.5 py-1 text-xs font-mono font-bold text-slate-900 text-right outline-none" placeholder="ABCDE1234F">
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1 relative group">
                                        <p class="text-[9px] text-center font-semibold text-slate-400 uppercase tracking-wider">Document Front</p>
                                        <div class="h-20 w-full overflow-hidden rounded-lg border border-slate-200 relative bg-slate-50">
                                            ${emp.pan_front && emp.pan_front !== "N/A" ? `<img src="${emp.pan_front.startsWith("http") ? emp.pan_front : CONFIG.API_BASE_URL + "/" + emp.pan_front.replace(/\\/g, "/")}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onclick="openImageModal(this.src)">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="file-text" class="w-5 h-5"></i></div>`}
                                            ${isEdit
                                              ? `
                                                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white gap-2">
                                                    <button onclick="document.getElementById('up_pan_f_${emp.id}').click()" class="p-1.5 bg-brand-primary rounded hover:scale-105" title="Replace"><i data-lucide="upload" class="w-3.5 h-3.5"></i></button>
                                                </div>
                                              `
                                              : ""
                                            }
                                        </div>
                                        <input type="file" id="up_pan_f_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'pancard', 'front', this.id)">
                                    </div>
                                    <div class="space-y-1 relative group">
                                        <p class="text-[9px] text-center font-semibold text-slate-400 uppercase tracking-wider">Document Reverse</p>
                                        <div class="h-20 w-full overflow-hidden rounded-lg border border-slate-200 relative bg-slate-50">
                                            ${emp.pan_back && emp.pan_back !== "N/A" ? `<img src="${emp.pan_back.startsWith("http") ? emp.pan_back : CONFIG.API_BASE_URL + "/" + emp.pan_back.replace(/\\/g, "/")}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onclick="openImageModal(this.src)">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="file-text" class="w-5 h-5"></i></div>`}
                                            ${isEdit
                                              ? `
                                                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white gap-2">
                                                    <button onclick="document.getElementById('up_pan_b_${emp.id}').click()" class="p-1.5 bg-brand-primary rounded hover:scale-105" title="Replace"><i data-lucide="upload" class="w-3.5 h-3.5"></i></button>
                                                </div>
                                              `
                                              : ""
                                            }
                                        </div>
                                        <input type="file" id="up_pan_b_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'pancard', 'back', this.id)">
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                                <div class="flex items-center justify-between mb-2">
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Aadhaar Authentication</p>
                                    ${(() => {
                                      const maskAadhaar = (val) => {
                                        if (!val || val === 'N/A') return val;
                                        const digits = val.replace(/\D/g, '');
                                        if (digits.length === 12) {
                                          return `XXXX XXXX ${digits.slice(8)}`;
                                        }
                                        return val;
                                      };
                                      const adharVal = emp.adhar_number !== "N/A" ? (isEdit ? emp.adhar_number : maskAadhaar(emp.adhar_number)) : "";
                                      return `<input type="text" id="v_adhar_number" value="${adharVal}" ${isEdit ? "" : "readonly"} class="w-36 bg-slate-50 rounded-md px-2.5 py-1 text-xs font-mono font-bold text-slate-900 text-right outline-none" placeholder="XXXX XXXX 9012">`;
                                    })()}
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1 relative group">
                                        <p class="text-[9px] text-center font-semibold text-slate-400 uppercase tracking-wider">Aadhaar Front</p>
                                        <div class="h-20 w-full overflow-hidden rounded-lg border border-slate-200 relative bg-slate-50">
                                            ${emp.adhar_front && emp.adhar_front !== "N/A" ? `<img src="${emp.adhar_front.startsWith("http") ? emp.adhar_front : CONFIG.API_BASE_URL + "/" + emp.adhar_front.replace(/\\/g, "/")}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onclick="openImageModal(this.src)">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="image" class="w-5 h-5"></i></div>`}
                                            ${isEdit
                                              ? `
                                                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white gap-2">
                                                    <button onclick="document.getElementById('up_adhar_f_${emp.id}').click()" class="p-1.5 bg-brand-primary rounded hover:scale-105" title="Replace"><i data-lucide="upload" class="w-3.5 h-3.5"></i></button>
                                                </div>
                                              `
                                              : ""
                                            }
                                        </div>
                                        <input type="file" id="up_adhar_f_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'adhar', 'front', this.id)">
                                    </div>
                                    <div class="space-y-1 relative group">
                                        <p class="text-[9px] text-center font-semibold text-slate-400 uppercase tracking-wider">Aadhaar Reverse</p>
                                        <div class="h-20 w-full overflow-hidden rounded-lg border border-slate-200 relative bg-slate-50">
                                            ${emp.adhar_back && emp.adhar_back !== "N/A" ? `<img src="${emp.adhar_back.startsWith("http") ? emp.adhar_back : CONFIG.API_BASE_URL + "/" + emp.adhar_back.replace(/\\/g, "/")}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onclick="openImageModal(this.src)">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i data-lucide="image" class="w-5 h-5"></i></div>`}
                                            ${isEdit
                                              ? `
                                                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white gap-2">
                                                    <button onclick="document.getElementById('up_adhar_b_${emp.id}').click()" class="p-1.5 bg-brand-primary rounded hover:scale-105" title="Replace"><i data-lucide="upload" class="w-3.5 h-3.5"></i></button>
                                                </div>
                                              `
                                              : ""
                                            }
                                        </div>
                                        <input type="file" id="up_adhar_b_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'adhar', 'back', this.id)">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Professional Resume Card (Exact Match to Image 3!) -->
                            ${(() => {
                              const hasResume = emp.resume && emp.resume !== "N/A";
                              const resumeUrl = hasResume ? (emp.resume.startsWith("http") ? emp.resume : CONFIG.API_BASE_URL + "/" + emp.resume.replace(/\\/g, "/")) : "#";
                              const resumeFileName = `${(emp.full_name || 'Operative').replace(/\s+/g, '_')}_Resume.pdf`;
                              return `
                                <div class="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-brand-primary flex items-center justify-center">
                                                <i data-lucide="file-check" class="w-4 h-4"></i>
                                            </div>
                                            <div>
                                                <h4 class="text-xs font-bold text-slate-900 leading-none">Professional Resume</h4>
                                                <p class="text-[9px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">Verified Career Document</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            ${hasResume 
                                              ? `<a href="${resumeUrl}" target="_blank" class="px-3 py-1 bg-white hover:bg-slate-50 text-brand-primary text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-all flex items-center gap-1">
                                                   View File
                                                 </a>`
                                              : ""
                                            }
                                            ${isEdit 
                                              ? `<button onclick="document.getElementById('up_resume_${emp.id}').click()" class="px-3 py-1 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1">
                                                   <i data-lucide="upload" class="w-3 h-3"></i> ${hasResume ? 'Update' : 'Upload'}
                                                 </button>
                                                 <input type="file" id="up_resume_${emp.id}" class="hidden" accept=".pdf,.doc,.docx,image/*" onchange="uploadEmployeeFile('${emp.id}', 'resume', this.id)">`
                                              : ""
                                            }
                                        </div>
                                    </div>

                                    ${hasResume 
                                      ? `
                                        <div class="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <div class="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 font-bold text-xs uppercase">
                                                    <i data-lucide="file-text" class="w-4 h-4"></i>
                                                </div>
                                                <div class="min-w-0">
                                                    <p class="text-xs font-bold text-slate-800 truncate">${resumeFileName}</p>
                                                    <p class="text-[10px] text-slate-400 font-medium">Uploaded on ${formatJoinedDate(emp.date_of_joining).replace("Joined on ", "")} · 2.4 MB</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <a href="${resumeUrl}" download="${resumeFileName}" target="_blank" class="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center justify-center" title="Download Resume">
                                                    <i data-lucide="download" class="w-4 h-4 text-slate-600"></i>
                                                </a>
                                            </div>
                                        </div>
                                      `
                                      : `
                                        <div class="bg-white/70 border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400 font-medium">
                                            No professional resume uploaded for this operative.
                                        </div>
                                      `
                                    }
                                </div>
                              `;
                            })()}
                        </div>
                    </div>
                </div>
            `;
    }

    function getEmployeeProjectsTab(emp) {
      if (state.activeEmployeeProjects === null) {
        return `
                    <div class="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 relative">
                            <i data-lucide="folder-kanban" class="w-6 h-6 text-slate-200"></i>
                            <div class="absolute inset-0 border-3 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p class="text-xs font-bold text-slate-900">Synchronizing Projects</p>
                        <p class="text-[10px]">Mapping project involvements and management roles...</p>
                    </div>
                `;
      }

      // Combine explicitly assigned projects from API with any projects where they are listed as manager in the global list
      const projects = state.allProjects.filter((p) => {
        const isAssigned = state.activeEmployeeProjects.some(
          (ap) => String(ap.id) === String(p.id),
        );
        const isManager = p.manager === emp.username;
        return isAssigned || isManager;
      });

      let projectsHtml = "";
      if (projects.length === 0) {
        projectsHtml =
          '<div class="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200"><div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3"><i data-lucide="folder-x" class="w-6 h-6 text-slate-300"></i></div><p class="text-xs font-bold text-slate-900">No Projects Assigned</p><p class="text-[10px] mt-0.5">This employee is not currently assigned to any active projects.</p></div>';
      } else {
        projectsHtml = projects
          .map(
            (p) => `
                    <div class="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-brand-primary hover:shadow-md transition-all cursor-pointer group" onclick="routeApp('projects'); setTimeout(()=>openProjectDetails('${p.id}'), 100);">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-brand-primary transition-colors">
                                <i data-lucide="layout" class="w-4.5 h-4.5"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors">${p.name}</h4>
                                <div class="flex items-center gap-1.5 mt-0.5">
                                    <span class="px-1.2 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">${p.status}</span>
                                    ${p.manager === emp.username ? '<span class="px-1.2 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-brand-primary border border-indigo-100">Managing</span>' : ""}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-right">
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progress</p>
                                <p class="text-xs font-bold text-slate-900">${p.progress || "0%"}</p>
                            </div>
                            <i data-lucide="arrow-right" class="w-4 h-4 text-slate-300 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all"></i>
                        </div>
                    </div>
                `,
          )
          .join("");
      }

      return `
                <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <i data-lucide="folder-kanban" class="w-3.5 h-3.5 text-brand-primary"></i> Current Project Portfolio
                                </h3>
                                <p class="text-[10px] text-slate-500 mt-0.5">Live assignments and managed projects for this employee.</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${projectsHtml}
                        </div>
                    </div>
                </div>
            `;
    }

    function getEmployeeAnalyticsTab(emp) {
      try {
        const data = state.activeEmployeeAnalytics;
        if (!data) {
          return `
                        <div class="flex flex-col items-center justify-center py-16 text-slate-400">
                            <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 relative">
                                <i data-lucide="bar-chart-2" class="w-6 h-6 text-slate-200"></i>
                                <div class="absolute inset-0 border-3 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p class="text-xs font-bold text-slate-900">Synchronizing Analytics</p>
                            <p class="text-[10px]">Calculating performance indices and data points...</p>
                        </div>
                    `;
        }

        const projectEntries = Object.entries(
          data.lifelong?.project_distribution || {},
        );
        const projectBadges =
          projectEntries.length > 0
            ? projectEntries
              .map(
                ([name, count]) => `
                        <div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span class="text-[11px] font-bold text-slate-700 truncate mr-2">${name}</span>
                            <span class="px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-[9px] font-bold text-brand-primary shrink-0">${count} Tasks</span>
                        </div>
                    `,
              )
              .join("")
            : '<p class="text-[10px] text-slate-400 py-3 text-center italic">No project data available.</p>';

        return `
                    <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <!-- Top Performance Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand-primary transition-all">
                                <div class="absolute -right-4 -top-4 w-12 h-12 bg-brand-primary opacity-5 rounded-full group-hover:scale-150 transition-transform"></div>
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-lg bg-indigo-50 text-brand-primary flex items-center justify-center">
                                        <i data-lucide="zap" class="w-4 h-4"></i>
                                    </div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Daily Focus</p>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900">${data.daily?.hours || 0} <span class="text-xs font-normal text-slate-400 tracking-normal">hrs</span></h3>
                                <p class="text-[9px] text-slate-500 mt-0.5">Output: ${data.daily?.content_pieces || 0} pieces</p>
                            </div>

                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-brand-accent transition-all">
                                <div class="absolute -right-4 -top-4 w-12 h-12 bg-brand-accent opacity-5 rounded-full group-hover:scale-150 transition-transform"></div>
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-brand-accent flex items-center justify-center">
                                        <i data-lucide="trending-up" class="w-4 h-4"></i>
                                    </div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly Yield</p>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900">${data.monthly?.hours || 0} <span class="text-xs font-normal text-slate-400 tracking-normal">hrs</span></h3>
                                <p class="text-[9px] text-brand-accent font-bold mt-0.5">Generated: ${formatCurrency(data.monthly?.billed || 0)}</p>
                            </div>

                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-all">
                                <div class="absolute -right-4 -top-4 w-12 h-12 bg-amber-500 opacity-5 rounded-full group-hover:scale-150 transition-transform"></div>
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                                        <i data-lucide="calendar" class="w-4 h-4"></i>
                                    </div>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Yearly Trajectory</p>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900">${data.yearly?.hours || 0} <span class="text-xs font-normal text-slate-400 tracking-normal">hrs</span></h3>
                                <p class="text-[9px] text-slate-500 mt-0.5">Projected: ${(((data.yearly?.hours || 0) / (new Date().getMonth() + 1)) * 12).toFixed(0)} hrs</p>
                            </div>

                            <div class="bg-slate-900 text-white p-4 rounded-xl shadow-md relative overflow-hidden group">
                                <div class="absolute -right-6 -bottom-6 w-20 h-20 bg-brand-primary opacity-20 rounded-full blur-2xl"></div>
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-lg bg-white/10 text-brand-accent flex items-center justify-center">
                                        <i data-lucide="medal" class="w-4 h-4"></i>
                                    </div>
                                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Lifelong Impact</p>
                                </div>
                                <h3 class="text-xl font-bold text-white">${formatNumber((data.lifelong?.total_revenue || 0) / 100000)} <span class="text-xs font-normal text-slate-400 tracking-normal">Lakhs</span></h3>
                                <p class="text-[9px] text-brand-accent font-bold mt-0.5">Career Revenue</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div class="lg:col-span-2 space-y-4">
                                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                        <i data-lucide="activity" class="w-3.5 h-3.5 text-brand-primary"></i> Productivity Analysis
                                    </h4>
                                    <div class="space-y-4">
                                        <div>
                                            <div class="flex justify-between items-end mb-1">
                                                <p class="text-[10px] font-bold text-slate-500">Efficiency Ratio (ROI)</p>
                                                <p class="text-xs font-bold text-brand-accent">${(((data.lifelong?.total_revenue || 0) / (data.lifelong?.total_cost || 1)) * 100).toFixed(1)}%</p>
                                            </div>
                                            <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div class="h-full bg-brand-accent rounded-full" style="width: ${Math.min(((data.lifelong?.total_revenue || 0) / (data.lifelong?.total_cost || 1)) * 20, 100)}%"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Hours Logged</p>
                                                <p class="text-lg font-bold text-slate-900">${data.lifelong?.total_hours || 0}</p>
                                            </div>
                                            <div>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lifetime Cost-to-Company</p>
                                                <p class="text-lg font-bold text-slate-900">${formatCurrency(data.lifelong?.total_cost || 0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-indigo-900 text-white rounded-xl p-4 shadow-md relative overflow-hidden">
                                    <div class="absolute right-0 top-0 w-24 h-24 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                    <h4 class="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Strategic Insight</h4>
                                    <p class="text-sm font-medium leading-relaxed">
                                        This employee generates <span class="text-brand-accent font-bold">${((data.lifelong?.total_revenue || 0) / (data.lifelong?.total_hours || 1)).toFixed(0)} INR</span> revenue per hour. 
                                        Based on their trajectory, they are a <span class="text-indigo-200 underline decoration-indigo-400 decoration-2 underline-offset-4 font-bold">High Yield Asset</span> with stable consistency.
                                    </p>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <i data-lucide="pie-chart" class="w-3.5 h-3.5 text-brand-primary"></i> Project Allocation
                                </h4>
                                <div class="space-y-2">
                                    ${projectBadges}
                                </div>
                                <div class="mt-4 pt-4 border-t border-slate-100">
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Engagement Volume</p>
                                    <div class="flex items-end gap-1 h-12">
                                        <div class="flex-1 bg-slate-100 rounded-t-sm h-[40%]"></div>
                                        <div class="flex-1 bg-slate-100 rounded-t-sm h-[60%]"></div>
                                        <div class="flex-1 bg-brand-primary rounded-t-sm h-[90%]"></div>
                                        <div class="flex-1 bg-brand-primary rounded-t-sm h-[75%]"></div>
                                        <div class="flex-1 bg-slate-200 rounded-t-sm h-[50%]"></div>
                                        <div class="flex-1 bg-brand-accent rounded-t-sm h-[100%]"></div>
                                        <div class="flex-1 bg-slate-100 rounded-t-sm h-[30%]"></div>
                                    </div>
                                    <div class="flex justify-between mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span>Mon</span>
                                        <span>Sun</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
      } catch (err) {
        console.error("Analytics Component Error:", err);
        return `<div class="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200"><i data-lucide="alert-circle" class="mx-auto mb-2 w-8 h-8 text-slate-200"></i><p class="text-xs font-bold text-slate-900">Analytics Display Error</p><p class="text-[10px]">There was an issue rendering the performance metrics.</p></div>`;
      }
    }

    function openCreateEmployeeModal() {
      const depts = [...new Set(state.allRoles.map((r) => r.department_name))]
        .filter((d) => d)
        .sort();
      const deptOptions = depts
        .map((d) => `<option value="${d}">${d}</option>`)
        .join("");

      const roleOptions = state.allRoles
        .map(
          (r) =>
            `<option value="${r.id}" data-dept="${r.department_name}">${r.role_name} (${r.department_name})</option>`,
        )
        .join("");

      const formHtml = `
                <form onsubmit="handleAdminCreateEntity(event, '/employees/create', 'workforce')" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                            <input type="text" name="full_name" required class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-text">
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <input type="email" name="email" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-text">
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                            <input type="text" name="contact_number" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-text">
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Monthly Salary (₹)</label>
                            <input type="number" name="salary" id="emp_salary" min="0" step="1000" oninput="window.recalculateHourlyCost()" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-text">
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Department *</label>
                            <select name="department_select" id="emp_dept_select" required onchange="handleAdminDeptChange()" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer">
                                <option value="">-- Select Department --</option>
                                ${deptOptions}
                                <option value="__CREATE_NEW__" class="font-bold text-brand-primary">+ Create New Department...</option>
                            </select>
                            <input type="text" name="department_custom" id="emp_dept_custom" placeholder="Enter new department" class="hidden mt-2 input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Job Role *</label>
                            <select name="role_id" id="emp_role_select" required onchange="handleAdminRoleChange()" class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer">
                                <option value="">-- Select Job Role --</option>
                                ${roleOptions}
                                <option value="__CREATE_NEW__" class="font-bold text-brand-primary">+ Create New Job Role...</option>
                            </select>
                            <input type="text" name="job_title_custom" id="emp_role_custom" placeholder="Enter new job role" class="hidden mt-2 input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                        </div>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                        <h4 class="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Financial Rates (Auto-Calculation)</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Hourly Cost (₹) - Auto</label>
                                <input type="number" name="hourly_cost_rate" id="emp_hourly_cost" min="0" step="0.5" value="0" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-text">
                            </div>
                            <div>
                                <label class="block text-xs uppercase tracking-wider font-semibold text-brand-primary mb-1">Hourly Billing (₹)</label>
                                <input type="number" name="hourly_billing_rate" min="0" step="0.5" value="0" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none">
                            </div>
                            
                            <div class="col-span-2 grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Working Days / Month</label>
                                    <input type="number" id="emp_calc_days" value="22" min="1" max="31" oninput="window.recalculateHourlyCost()" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-500 mb-1">Shift Hours / Day</label>
                                    <input type="number" id="emp_calc_hours" value="8" min="1" max="24" oninput="window.recalculateHourlyCost()" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none">
                                </div>
                            </div>
                            
                            <div class="col-span-2 mt-2 text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shadow-sm leading-relaxed">
                                <span class="font-bold text-slate-700">Calculation Formula:</span> <code class="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">Salary / (Days * Hours)</code>
                                <div class="mt-1.5 text-slate-400">Current Base: <span id="formula-example" class="font-medium text-slate-600">₹0 / (22 * 8) = ₹0.00 / hr</span></div>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 mt-3">These rates are invisible to the employee and drive all profit/loss calculations.</p>
                    </div>
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"><i data-lucide="check" class="w-4 h-4"></i>Register Employee</button>
                    </div>
                </form>
            `;
      openModal("Register New Employee", formHtml);
    }

    window.recalculateHourlyCost = function () {
      const salaryInput = document.getElementById("emp_salary");
      const daysInput = document.getElementById("emp_calc_days");
      const hoursInput = document.getElementById("emp_calc_hours");
      const costInput = document.getElementById("emp_hourly_cost");
      const exampleSpan = document.getElementById("formula-example");

      if (!salaryInput || !daysInput || !hoursInput || !costInput) return;

      const salary = parseFloat(salaryInput.value) || 0;
      const days = parseFloat(daysInput.value) || 22;
      const hours = parseFloat(hoursInput.value) || 8;

      let rate = 0;
      if (days > 0 && hours > 0) {
        rate = salary / (days * hours);
      }

      costInput.value = rate.toFixed(2);

      if (exampleSpan) {
        exampleSpan.innerText = `₹${salary} / (${days} * ${hours}) = ₹${rate.toFixed(2)} / hr`;
      }
    };

    window.recalculateEmployeeDetailHourlyCost = function () {
      const salaryInput = document.getElementById("v_salary");
      const daysInput = document.getElementById("v_working_days");
      const hoursInput = document.getElementById("v_shift_hours");
      const costInput = document.getElementById("v_cost_rate");
      const exampleSpan = document.getElementById("v_formula_example");

      if (!salaryInput || !costInput) return;

      const salary = parseFloat(salaryInput.value) || 0;
      const days = daysInput ? (parseFloat(daysInput.value) || 22) : 22;
      const hours = hoursInput ? (parseFloat(hoursInput.value) || 8) : 8;

      let rate = 0;
      if (days > 0 && hours > 0) {
        rate = salary / (days * hours);
      }

      costInput.value = rate.toFixed(2);
      if (exampleSpan) {
        exampleSpan.innerText = `₹${salary} / (${days} * ${hours}) = ₹${rate.toFixed(2)} / hr`;
      }
    };



    window.handleAdminDeptChange = function () {
      const val = document.getElementById("emp_dept_select").value;
      const customDeptInput = document.getElementById("emp_dept_custom");
      const roleSelect = document.getElementById("emp_role_select");

      if (val === "__CREATE_NEW__") {
        customDeptInput.classList.remove("hidden");
        customDeptInput.required = true;
        Array.from(roleSelect.options).forEach((opt) => (opt.hidden = false));
      } else {
        customDeptInput.classList.add("hidden");
        customDeptInput.required = false;
        customDeptInput.value = "";

        let visibleCount = 0;
        Array.from(roleSelect.options).forEach((opt) => {
          if (opt.value === "" || opt.value === "__CREATE_NEW__") {
            opt.hidden = false;
          } else if (val === "") {
            opt.hidden = false;
            visibleCount++;
          } else {
            const isMatch = opt.getAttribute("data-dept") === val;
            opt.hidden = !isMatch;
            if (isMatch) visibleCount++;
          }
        });

        if (roleSelect.options[roleSelect.selectedIndex].hidden) {
          roleSelect.value = "";
        }
      }
    };

    window.handleAdminRoleChange = function () {
      const val = document.getElementById("emp_role_select").value;
      const customRoleInput = document.getElementById("emp_role_custom");
      if (val === "__CREATE_NEW__") {
        customRoleInput.classList.remove("hidden");
        customRoleInput.required = true;
      } else {
        customRoleInput.classList.add("hidden");
        customRoleInput.required = false;
        customRoleInput.value = "";
      }
    };

    window.switchAttendanceTab = function (tab) {
      state.attendanceTab = tab;
      routeApp("attendance");
    };

    window.exportActiveTableToCSV = function () {
      const table = document
        .getElementById("attendanceDataBlock")
        .querySelector("table");
      if (!table) return;
      let csv = [];
      const rows = table.querySelectorAll("tr");
      for (let i = 0; i < rows.length; i++) {
        let rowData = [];
        const cols = rows[i].querySelectorAll("td, th");
        if (cols.length === 0) continue;

        for (let j = 0; j < cols.length; j++) {
          // Clean text and escape quotes
          let text = cols[j].innerText.trim().replace(/\s+/g, " ");
          rowData.push('"' + text.replace(/"/g, '""') + '"');
        }
        csv.push(rowData.join(","));
      }

      // Standard CSV structure: Newline separated rows with UTF-8 BOM for Excel compatibility
      const csvString = "\uFEFF" + csv.join("\n");
      const csvFile = new Blob([csvString], {
        type: "text/csv;charset=utf-8;",
      });

      const downloadLink = document.createElement("a");
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      downloadLink.download = `export_${state.attendanceTab}_${timestamp}.csv`;
      downloadLink.href = window.URL.createObjectURL(csvFile);
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    window.filterActiveTableByDate = function (dateVal) {
      const tbody = document.getElementById("attendanceDataBody");
      if (!tbody) return;
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((row) => {
        // The date column is generally the second column in all our tables
        const dateCell = row.cells[1];
        if (!dateCell) return;
        const cellText = dateCell.innerText.trim();

        if (!dateVal) {
          row.style.display = "";
          return;
        }

        // format dateVal (YYYY-MM-DD) to locale string roughly matching our cellText
        const filterDate = new Date(dateVal);
        const cellDate = new Date(cellText);

        if (
          filterDate.toDateString() === cellDate.toDateString() ||
          cellText.includes(dateVal)
        ) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    };

    

    

    async function handleAdminCreateEntity(
      event,
      endpoint,
      refreshView,
      methodOverride = "POST",
    ) {
      event.preventDefault();
      const form = event.target;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerHTML =
        '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      if (payload.budget) payload.budget = parseFloat(payload.budget);
      if (payload.hourly_cost_rate)
        payload.hourly_cost_rate = parseFloat(payload.hourly_cost_rate);
      if (payload.hourly_billing_rate)
        payload.hourly_billing_rate = parseFloat(payload.hourly_billing_rate);
      if (payload.salary) payload.salary = parseFloat(payload.salary);

      // Special handling for employee creations
      if (payload.department_select !== undefined) {
        let isNewRole =
          payload.role_id === "__CREATE_NEW__" ||
          payload.department_select === "__CREATE_NEW__";

        if (isNewRole) {
          let deptName =
            payload.department_select === "__CREATE_NEW__"
              ? payload.department_custom
              : payload.department_select;
          let roleName =
            payload.role_id === "__CREATE_NEW__"
              ? payload.job_title_custom
              : state.allRoles.find(
                (r) => String(r.id) === String(payload.role_id),
              )?.role_name;
          if (!roleName) roleName = "General Employee";

          try {
            const roleResp = await apiFetch("/departments-roles/create", {
              method: "POST",
              body: { department_name: deptName, role_name: roleName },
            });
            payload.role_id = roleResp.id;
            if (!payload.role_id && roleResp.data)
              payload.role_id = roleResp.data.id;
          } catch (err) {
            showToast("Failed to create new department/role.", "error");
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return; // Abort employee creation
          }
        }

        // Strip any fields not in the Employees database table to prevent 500 errors
        delete payload.department_select;
        delete payload.department_custom;
        delete payload.job_title_custom;
        delete payload.department;
        delete payload.job_title;
        delete payload.role_name;
      }

      // Special handling for role creations
      if (payload.department_name_select !== undefined) {
        payload.department_name =
          payload.department_name_select === "__CREATE_NEW__"
            ? payload.department_name_custom
            : payload.department_name_select;
        delete payload.department_name_select;
        delete payload.department_name_custom;
      }

      try {
        const response = await apiFetch(endpoint, {
          method: methodOverride,
          body: payload,
        });

        // ALWAYS UPDATE STATE INSTANTLY
        if (!endpoint.includes("/update/")) {
          if (refreshView === "workforce") {
            if (endpoint.includes("/employees/"))
              state.allEmployees.unshift(response);
            if (endpoint.includes("/admins/"))
              state.allAdmins.unshift(response);
            if (endpoint.includes("/roles/"))
              state.allRoles.unshift(response);
          } else if (refreshView === "projects") {
            state.allProjects.unshift(response);
          }
        } else {
          if (
            refreshView === "workforce" &&
            endpoint.includes("/employees/update/")
          ) {
            const idx = state.allEmployees.findIndex(
              (e) => e.id === response.id,
            );
            if (idx !== -1) state.allEmployees[idx] = response;
          } else if (
            refreshView === "projects" &&
            endpoint.includes("/projects/update/")
          ) {
            const idx = state.allProjects.findIndex(
              (p) => p.id === response.id,
            );
            if (idx !== -1) state.allProjects[idx] = response;
          }
        }

        if (
          response.generated_password ||
          (response.data && response.data.generated_password)
        ) {
          const pwd =
            response.generated_password || response.data.generated_password;
          const uname =
            response.username || (response.data && response.data.username);
          const eml =
            payload.email ||
            response.email ||
            (response.data && response.data.email);

          // ARCHITECTURE FIX: Close the creation modal immediately to prevent UI conflicts
          closeModal();

          // Update the background table instantly
          routeApp(refreshView);

          // Open the credentials modal independently after the first modal finishes closing
          setTimeout(() => {
            openCredentialsModal(uname, pwd, eml, null);
          }, 350);
        } else {
          showToast(
            `Record ${endpoint.includes("/update/") ? "updated" : "created"} successfully!`,
            "success",
          );
          closeModal();

          if (
            endpoint.includes("/employees/update/") &&
            state.activeEmployee
          ) {
            const idPart = endpoint.split("/").pop();
            if (idPart) openEmployeeDetails(idPart);
          }
          routeApp(refreshView);
        }
      } catch (error) {
        showToast(error.message, "error");
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        if (window.lucide) lucide.createIcons();
      }
    }

    function openAdminDrawer(adminId) {
      const adm = state.allAdmins.find((a) => a.id === adminId);
      if (!adm) return;
      const currentAdmin = state.user; // Decoded JWT from state

      const getInitials = (name) =>
        name ? name.substring(0, 2).toUpperCase() : "AD";

      document.getElementById("ad_avatar").innerText = getInitials(
        adm.username,
      );
      document.getElementById("ad_username").innerText = "@" + adm.username;
      document.getElementById("ad_access").innerText = adm.access_level;
      document.getElementById("ad_email").innerText = adm.email;
      document.getElementById("ad_email").href = `mailto:${adm.email}`;
      document.getElementById("ad_id").innerText = adm.id;

      // RBAC Logic for Delete Button
      const actionsArea = document.getElementById("ad_actions_area");
      let deleteBtnHtml = '';

      if (currentAdmin && currentAdmin.access_level === 'SystemAdmin') {
        const isSelf = adm.id === currentAdmin.id;
        const targetIsSuper = adm.access_level === 'SystemAdmin';

        // Allow deletion if target is not SuperAdmin OR if it is the user themselves
        if (!targetIsSuper || isSelf) {
          deleteBtnHtml = `
                    <button onclick="deleteAdminAccount('${adm.id}', '${adm.username}', ${isSelf})" 
                        class="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        ${isSelf ? 'Delete My Account' : 'Delete Administrator'}
                    </button>
                `;
        }
      }

      actionsArea.innerHTML = deleteBtnHtml || `
            <div class="flex items-center justify-center gap-2 text-slate-400">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span class="text-[10px] font-bold uppercase tracking-widest">Account Protected</span>
            </div>
        `;

      const overlay = document.getElementById("adminDrawerOverlay");
      const panel = document.getElementById("adminDrawerPanel");
      overlay.classList.remove("hidden");
      setTimeout(() => {
        overlay.classList.remove("opacity-0");
        panel.classList.remove("translate-x-full");
      }, 10);

      if (window.lucide) lucide.createIcons();
    }

    async function deleteAdminAccount(adminId, username, isSelf) {
      const confirmMsg = isSelf
        ? "CRITICAL ACTION: You are about to delete YOUR OWN administrator account. This will immediately terminate your session and you will lose all access to the system. Are you absolutely sure?"
        : `Are you sure you want to permanently delete the administrator account for @${username}? This action cannot be undone.`;

      const confirmed = await customConfirm(
        isSelf ? "CRITICAL: Delete Self" : "Delete Administrator",
        confirmMsg,
        isSelf ? "Delete My Account" : "Confirm Deletion",
        "Cancel",
        true
      );

      if (!confirmed) return;

      try {
        await apiFetch(`/admins/delete/${adminId}`, { method: 'DELETE' });
        showToast(`Administrator @${username} deleted successfully.`, "success");

        if (isSelf) {
          logout(false);
          return;
        }

        closeAdminDrawer();
        await loadAdminWorkspaceData();
        routeApp("workforce", "admins");
      } catch (error) {
        showToast(error.message, "error");
      }
    }

    async function deleteEmployeeAccount(empId, name) {
      const confirmed = await customConfirm(
        "Permanent Deletion",
        `Are you sure you want to permanently delete the operative profile for ${name}? This will purge all their records from the system including attendance and timesheets. This action is irreversible.`,
        "Delete Profile",
        "Cancel",
        true
      );
      if (!confirmed) return;

      try {
        await apiFetch(`/employees/delete/${empId}`, { method: 'DELETE' });
        showToast(`${name} has been removed from the organization database.`, "success");
        closeEmployeeDetails();
        await loadAdminWorkspaceData();
        routeApp("workforce", "employees");
      } catch (err) {
        showToast("Deletion failed: " + err.message, "error");
      }
    }

    function closeAdminDrawer() {
      const overlay = document.getElementById("adminDrawerOverlay");
      const panel = document.getElementById("adminDrawerPanel");
      overlay.classList.add("opacity-0");
      panel.classList.add("translate-x-full");
      setTimeout(() => {
        overlay.classList.add("hidden");
      }, 300);
    }

    function openCreateAdminModal() {
      const formHtml = `
                <form onsubmit="handleAdminCreateEntity(event, '/admins/create', 'workforce')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Username *</label>
                        <input type="text" name="username" required class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                        <input type="email" name="email" required class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Access Level *</label>
                        <select name="access_level" required class="input-field w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer">
                            <option value="SystemAdmin">System Admin</option>
                            <option value="ManagerAdmin">Manager Admin</option>
                        </select>
                    </div>
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium shadow-sm hover:bg-black transition-colors">Create Admin</button>
                    </div>
                </form>
            `;
      openModal("Register New System Admin", formHtml);
    }

    function openImageModal(imgSrc) {
      if (!imgSrc || imgSrc === window.location.href) return;
      const imgModalOverlay = document.getElementById("imageModalOverlay");
      const imgModalContent = document.getElementById("imageModalContent");
      imgModalContent.src = imgSrc;
      imgModalOverlay.classList.remove("hidden");
      setTimeout(() => {
        imgModalOverlay.classList.remove("opacity-0");
        imgModalContent.classList.remove("scale-95");
      }, 10);
    }

    function closeImageModal() {
      const imgModalOverlay = document.getElementById("imageModalOverlay");
      const imgModalContent = document.getElementById("imageModalContent");
      imgModalOverlay.classList.add("opacity-0");
      imgModalContent.classList.add("scale-95");
      setTimeout(() => {
        imgModalOverlay.classList.add("hidden");
        imgModalContent.src = "";
      }, 300);
    }

    // Add Escape key handler for drawer/modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const imgModalOverlay = document.getElementById("imageModalOverlay");
        const adminDrawerOverlay =
          document.getElementById("adminDrawerOverlay"); // Get admin drawer overlay

        if (
          imgModalOverlay &&
          !imgModalOverlay.classList.contains("hidden")
        ) {
          closeImageModal();
        } else if (state.activeEmployee) {
          closeEmployeeDetails();
        } else if (
          adminDrawerOverlay &&
          !adminDrawerOverlay.classList.contains("hidden")
        ) {
          // Check for admin drawer
          closeAdminDrawer();
        }
      }
    });

    // --- Credentials Modal Logic ---
    let credentialsPostRoute = null; // Store route to navigate to after closing

    function openCredentialsModal(
      username,
      password,
      email,
      targetRoute = null,
    ) {
      credentialsPostRoute = targetRoute;
      document.getElementById("cred_username").innerText = username;
      document.getElementById("cred_password").value = password;

      // Set up email link
      const emailBtn = document.getElementById("cred_email_btn");
      if (email && email !== "N/A") {
        const subject = encodeURIComponent(
          "Your New Account Credentials - Yana Technologies",
        );
        const body = encodeURIComponent(
          `Hello,\n\nYour new employee account has been created.\n\nUsername: ${username}\nTemporary Password: ${password}\n\nPlease log in and change your password immediately.\n\nRegards,\nYana Administration`,
        );
        emailBtn.href = `mailto:${email}?subject=${subject}&body=${body}`;
        emailBtn.classList.remove("opacity-50", "pointer-events-none");
      } else {
        emailBtn.removeAttribute("href");
        emailBtn.classList.add("opacity-50", "pointer-events-none");
      }

      const overlay = document.getElementById("credentialsModalOverlay");
      const panel = document.getElementById("credentialsModalPanel");
      overlay.classList.remove("hidden");
      setTimeout(() => {
        overlay.classList.remove("opacity-0");
        panel.classList.remove("scale-95");
      }, 10);

      if (window.lucide) lucide.createIcons();
    }

    function closeCredentialsModal() {
      const overlay = document.getElementById("credentialsModalOverlay");
      const panel = document.getElementById("credentialsModalPanel");
      overlay.classList.add("opacity-0");
      panel.classList.add("scale-95");
      setTimeout(() => {
        overlay.classList.add("hidden");
        document.getElementById("btnCopyCreds").innerHTML =
          `<i data-lucide="copy" class="w-4 h-4"></i> Copy Password`;

        // The background was already updated when the credentials modal opened.
        // We just safely close this overlay now.
        if (credentialsPostRoute) {
          routeApp(credentialsPostRoute);
          credentialsPostRoute = null;
        }
      }, 600);
    }

    function copyCredentialsToClipboard() {
      const pwd = document.getElementById("cred_password").value;
      navigator.clipboard
        .writeText(pwd)
        .then(() => {
          const btn = document.getElementById("btnCopyCreds");
          btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> <span class="text-emerald-600">Copied!</span>`;
          setTimeout(() => {
            btn.innerHTML = `<i data-lucide="copy" class="w-4 h-4"></i> Copy Password`;
            if (window.lucide) lucide.createIcons();
          }, 2000);
          
          // Clear clipboard after 30 seconds for security
          setTimeout(() => {
            try {
              navigator.clipboard.readText().then((text) => {
                if (text === pwd) {
                  navigator.clipboard.writeText("");
                  showToast("Clipboard cleared for security.", "info");
                }
              }).catch(() => {
                navigator.clipboard.writeText("");
                showToast("Clipboard cleared for security.", "info");
              });
            } catch (e) {
              navigator.clipboard.writeText("");
            }
          }, 30000);
        })
        .catch((err) => {
          showToast("Failed to copy", "error");
        });
    }

    function togglePasswordVisibility() {
      const pwdInput = document.getElementById("cred_password");
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
      } else {
        pwdInput.type = "password";
      }
    }

    function toggleAdminPasswordVisibility(inputId, eyeIconId) {
      const pwdInput = document.getElementById(inputId);
      const eyeIcon = document.getElementById(eyeIconId);
      if (pwdInput.type === "password") {
        pwdInput.type = "text";
        eyeIcon.setAttribute("data-lucide", "eye-off");
      } else {
        pwdInput.type = "password";
        eyeIcon.setAttribute("data-lucide", "eye");
      }
      if (window.lucide) lucide.createIcons();
    }

    async function resetEmployeePassword(empId) {
      const isConfirmed = await customConfirm(
        "Emergency Password Reset",
        "Are you sure you want to reset this employee's password to the default (YanaUser123!)? This action will immediately overwrite their current credentials.",
        "Reset Password",
        "Cancel",
        true
      );
      if (!isConfirmed) return;

      const btn = document.getElementById(`btnResetPwd-${empId}`);
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Resetting...';
      btn.disabled = true;

      try {
        await apiFetch(`/employees/update/${empId}`, {
          method: "PUT",
          body: { password: "YanaUser123!" },
        });
        showToast("Password has been reset to default successfully.", "success");
      } catch (err) {
        showToast("Failed to reset password: " + err.message, "error");
      } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
      }
    }

    window.openAdminEditTaskModal = async function(taskId, taskType) {
        const task = (state.allTasks || []).find(t => t.id === taskId);
        if (!task) {
            showToast("Task not found.", "error");
            return;
        }

        const isDev = taskType === 'developer';

        // Common hour options prepopulated
        let hourOptions = '';
        for (let h = 0.5; h <= 24; h += 0.5) {
            const whole = Math.floor(h);
            const mins = (h % 1) === 0 ? '00' : '30';
            const label = `${whole}:${mins}`;
            const selected = parseFloat(task.hours_logged) === h ? 'selected' : '';
            hourOptions += `<option value="${h}" ${selected}>${label}</option>`;
        }

        // Fetch target employee projects dynamically
        const empProjects = await apiFetch(`/projects/employee/${task.employee_id}`).catch(() => []);

        // Generate Project Options
        let projectOptions = '<option value="">-- General / No Project --</option>';
        empProjects.forEach(p => {
            const selected = String(p.id) === String(task.project_id) ? 'selected' : '';
            projectOptions += `<option value="${p.id}" ${selected}>${p.name}</option>`;
        });

        let fieldsHtml = '';

        if (isDev) {
            // Generate Milestone Options
            let milestoneOptions = '<option value="">General Task (No Milestone)</option>';
            if (task.project_id) {
                const milestones = await apiFetch(`/projects/timeline/${task.project_id}`).catch(() => []);
                milestones.forEach(m => {
                    const selected = String(m.id) === String(task.milestone_id) ? 'selected' : '';
                    milestoneOptions += `<option value="${m.id}" ${selected}>${m.milestone_name} (${m.status})</option>`;
                });
            }

            fieldsHtml = `
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Project / Workspace *</label>
                        <div class="relative">
                            <select id="edit-task-project" onchange="window.updateAdminEditTaskProjectChange(this, true)" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                ${projectOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Milestone / Task</label>
                        <div class="relative">
                            <select id="edit-task-milestone" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                ${milestoneOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Hours Logged *</label>
                        <div class="relative">
                            <select id="edit-task-hours" required class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                ${hourOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Task Status *</label>
                        <div class="relative">
                            <select id="edit-task-status" required class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                <option value="Completed" ${task.task_status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="In Progress" ${task.task_status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="On Hold" ${task.task_status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Sprint</label>
                        <input type="text" id="edit-task-sprint" value="${task.sprint || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Module</label>
                        <input type="text" id="edit-task-module" value="${task.module || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Feature</label>
                        <input type="text" id="edit-task-feature" value="${task.feature || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Ticket ID</label>
                        <input type="text" id="edit-task-ticket" value="${task.ticket_id || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Work Type</label>
                        <input type="text" id="edit-task-worktype" value="${task.work_type || 'Development'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">GitHub Repo Name</label>
                        <input type="text" id="edit-task-repo" value="${task.github_repo_name || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">GitHub Link</label>
                        <input type="url" id="edit-task-ghlink" value="${task.github_link || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">GitHub Branch Name</label>
                        <input type="text" id="edit-task-branch" value="${task.github_branch_name || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">GitHub PR Created?</label>
                        <div class="relative">
                            <select id="edit-task-pr" class="input-field w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm appearance-none">
                                <option value="No" ${task.github_pr_created === 'No' ? 'selected' : ''}>No</option>
                                <option value="Yes" ${task.github_pr_created === 'Yes' ? 'selected' : ''}>Yes</option>
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Commit Count</label>
                        <input type="number" id="edit-task-commits" min="0" value="${task.github_commit_count || 0}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Tech Stack (Comma Separated)</label>
                    <input type="text" id="edit-task-tech" value="${task.tech_stack || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" placeholder="e.g., Python, FastAPI, SQLite">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">No Project Reason (If no project assigned)</label>
                    <input type="text" id="edit-task-reason" value="${task.no_project_reason || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                </div>

                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-xs font-bold text-slate-500">Tasks Performed *</label>
                        <span id="edit-char-counter" class="text-[10px] text-slate-400">0 / 5000</span>
                    </div>
                    <textarea id="edit-task-performed" required rows="4" minlength="20" maxlength="5000" oninput="document.getElementById('edit-char-counter').innerText = this.value.length + ' / 5000'" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-350 rounded-xl outline-none text-sm text-slate-700">${task.task_performed || ''}</textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Plan for Tomorrow *</label>
                    <textarea id="edit-task-tomorrow" required rows="2" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-350 rounded-xl outline-none text-sm text-slate-700">${task.tomorrow_plan || ''}</textarea>
                </div>
            `;
        } else {
            const p = (state.allProjects || []).find(proj => String(proj.id) === String(task.project_id));
            let agreement = [];
            try {
                agreement = p && typeof p.content_agreement === 'string' ? JSON.parse(p.content_agreement) : (p ? (p.content_agreement || []) : []);
            } catch (e) {
                agreement = [];
            }

            let metricsHtml = '';
            if (p && (p.project_type === 'Content' || agreement.length > 0)) {
                let existingVals = {};
                try {
                    existingVals = typeof task.custom_field_values === 'string' ? JSON.parse(task.custom_field_values) : (task.custom_field_values || {});
                } catch(e) {
                    existingVals = {};
                }

                const fieldsHtmlStr = agreement.map(item => {
                    const val = existingVals[item.name] || 0;
                    return `
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">${item.name}</label>
                            <input type="number" data-field-name="${item.name.replace(/"/g, '&quot;')}" class="edit-task-custom-field input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" min="0" value="${val}">
                        </div>
                    `;
                }).join('');

                metricsHtml = `
                    <div class="grid grid-cols-2 gap-4">
                        ${fieldsHtmlStr}
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Upload Deadline</label>
                            <input type="date" id="edit-task-upload-deadline" value="${task.upload_deadline && task.upload_deadline !== 'N/A' ? task.upload_deadline : ''}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Next Date of Giving</label>
                            <input type="date" id="edit-task-next-delivery-date" value="${task.next_delivery_date && task.next_delivery_date !== 'N/A' ? task.next_delivery_date : ''}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                    </div>
                `;
            } else {
                metricsHtml = `
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Reels Count</label>
                            <input type="number" id="edit-task-reels" min="0" value="${task.reels_count || 0}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Long Video Count</label>
                            <input type="number" id="edit-task-videos" min="0" value="${task.long_video_count || 0}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Poster Count</label>
                            <input type="number" id="edit-task-posters" min="0" value="${task.poster_count || 0}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Calls Made</label>
                            <input type="number" id="edit-task-calls" min="0" value="${task.calls_made || 0}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                        </div>
                    </div>
                `;
            }

            fieldsHtml = `
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Project / Workspace *</label>
                        <div class="relative">
                            <select id="edit-task-project" onchange="window.updateAdminEditTaskProjectChange(this, false)" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                ${projectOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Hours Logged *</label>
                        <div class="relative">
                            <select id="edit-task-hours" required class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
                                ${hourOptions}
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Platform</label>
                        <input type="text" id="edit-task-platform" value="${task.platform || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Ticket ID</label>
                        <input type="text" id="edit-task-ticket" value="${task.ticket_id || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Work Type</label>
                        <input type="text" id="edit-task-worktype" value="${task.work_type || 'Development'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 mb-1">Task Status</label>
                        <div class="relative">
                            <select id="edit-task-status" class="input-field w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm appearance-none">
                                <option value="Completed" ${task.task_status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="In Progress" ${task.task_status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="On Hold" ${task.task_status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                            </select>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <div id="edit-task-metrics-container" class="space-y-4">
                    ${metricsHtml}
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">No Project Reason (If no project assigned)</label>
                    <input type="text" id="edit-task-reason" value="${task.no_project_reason || 'N/A'}" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                </div>

                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-xs font-bold text-slate-500">Tasks Performed *</label>
                        <span id="edit-char-counter" class="text-[10px] text-slate-400">0 / 5000</span>
                    </div>
                    <textarea id="edit-task-performed" required rows="4" minlength="20" maxlength="5000" oninput="document.getElementById('edit-char-counter').innerText = this.value.length + ' / 5000'" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-350 rounded-xl outline-none text-sm text-slate-700">${task.task_performed || ''}</textarea>
                </div>
            `;
        }

        const html = `
            <form onsubmit="window.submitAdminEditTaskForm(event, '${taskId}', '${taskType}')" class="space-y-4">
                <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    ${fieldsHtml}
                </div>
                <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button type="button" onclick="window.openTaskDetailsModal('${taskId}')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Back</button>
                    <button type="submit" id="btnAdminEditSubmit" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <i data-lucide="save" class="w-4 h-4"></i> Save Changes
                    </button>
                </div>
            </form>
        `;

        openModal('Edit Timesheet Entry (Admin)', html);
        const textEl = document.getElementById('edit-task-performed');
        if (textEl) {
            document.getElementById('edit-char-counter').innerText = textEl.value.length + ' / 5000';
        }
    };

    window.updateAdminEditTaskProjectChange = async function(selectEl, isDev) {
        const projectId = selectEl.value;
        const modal = selectEl.closest('form');
        
        if (isDev) {
            const milestoneSelect = modal.querySelector('#edit-task-milestone');
            if (milestoneSelect) {
                milestoneSelect.disabled = true;
                milestoneSelect.innerHTML = '<option value="">Loading Milestones...</option>';
                
                let milestoneOptions = '<option value="">General Task (No Milestone)</option>';
                if (projectId) {
                    const milestones = await apiFetch(`/projects/timeline/${projectId}`).catch(() => []);
                    milestones.forEach(m => {
                        milestoneOptions += `<option value="${m.id}">${m.milestone_name} (${m.status})</option>`;
                    });
                }
                milestoneSelect.innerHTML = milestoneOptions;
                milestoneSelect.disabled = false;
            }
        } else {
            const p = (state.allProjects || []).find(proj => String(proj.id) === String(projectId));
            let agreement = [];
            try {
                agreement = p && typeof p.content_agreement === 'string' ? JSON.parse(p.content_agreement) : (p ? (p.content_agreement || []) : []);
            } catch (e) {
                agreement = [];
            }
            
            const metricsContainer = modal.querySelector('#edit-task-metrics-container');
            if (metricsContainer) {
                if (p && (p.project_type === 'Content' || agreement.length > 0)) {
                    const fieldsHtmlStr = agreement.map(item => {
                        return `
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">${item.name}</label>
                                <input type="number" data-field-name="${item.name.replace(/"/g, '&quot;')}" class="edit-task-custom-field input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" min="0" value="0">
                            </div>
                        `;
                    }).join('');
                    metricsContainer.innerHTML = `
                        <div class="grid grid-cols-2 gap-4">
                            ${fieldsHtmlStr}
                        </div>
                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Upload Deadline</label>
                                <input type="date" id="edit-task-upload-deadline" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Next Date of Giving</label>
                                <input type="date" id="edit-task-next-delivery-date" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                        </div>
                    `;
                } else {
                    metricsContainer.innerHTML = `
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Reels Count</label>
                                <input type="number" id="edit-task-reels" min="0" value="0" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Long Video Count</label>
                                <input type="number" id="edit-task-videos" min="0" value="0" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Poster Count</label>
                                <input type="number" id="edit-task-posters" min="0" value="0" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 mb-1">Calls Made</label>
                                <input type="number" id="edit-task-calls" min="0" value="0" class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                            </div>
                        </div>
                    `;
                }
            }
        }
        if (window.lucide) lucide.createIcons();
    };

    window.submitAdminEditTaskForm = async function(event, taskId, taskType) {
        event.preventDefault();
        const btn = document.getElementById('btnAdminEditSubmit');
        const og = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
        btn.disabled = true;

        const isDev = taskType === 'developer';
        const payload = {
            project_id: document.getElementById('edit-task-project')?.value || null,
            milestone_id: document.getElementById('edit-task-milestone')?.value || null,
            hours_logged: parseFloat(document.getElementById('edit-task-hours').value),
            task_performed: document.getElementById('edit-task-performed').value,
            sprint: document.getElementById('edit-task-sprint')?.value || 'N/A',
            module: document.getElementById('edit-task-module')?.value || 'N/A',
            feature: document.getElementById('edit-task-feature')?.value || 'N/A',
            ticket_id: document.getElementById('edit-task-ticket').value,
            no_project_reason: document.getElementById('edit-task-reason').value,
            task_status: document.getElementById('edit-task-status').value,
            work_type: document.getElementById('edit-task-worktype').value
        };

        if (isDev) {
            payload.tomorrow_plan = document.getElementById('edit-task-tomorrow').value;
            payload.tech_stack = document.getElementById('edit-task-tech').value;
            payload.github_link = document.getElementById('edit-task-ghlink').value;
            payload.github_branch_name = document.getElementById('edit-task-branch').value;
            payload.github_pr_created = document.getElementById('edit-task-pr').value;
            payload.github_commit_count = parseInt(document.getElementById('edit-task-commits').value) || 0;
            payload.github_repo_name = document.getElementById('edit-task-repo').value;
        } else {
            payload.platform = document.getElementById('edit-task-platform').value;

            const customInputs = document.querySelectorAll('.edit-task-custom-field');
            if (customInputs.length > 0) {
                const customVals = {};
                let reelsVal = 0;
                let videosVal = 0;
                let postersVal = 0;
                let callsVal = 0;

                customInputs.forEach(inp => {
                    const name = inp.getAttribute('data-field-name');
                    const val = parseInt(inp.value) || 0;
                    customVals[name] = val;
                    
                    const lowerName = name.toLowerCase();
                    if (lowerName.includes("reel")) reelsVal += val;
                    else if (lowerName.includes("video")) videosVal += val;
                    else if (lowerName.includes("poster") || lowerName.includes("graphic")) postersVal += val;
                    else if (lowerName.includes("call")) callsVal += val;
                });

                payload.custom_field_values = JSON.stringify(customVals);
                payload.reels_count = reelsVal;
                payload.long_video_count = videosVal;
                payload.poster_count = postersVal;
                payload.calls_made = callsVal;
                payload.upload_deadline = document.getElementById('edit-task-upload-deadline')?.value || "N/A";
                payload.next_delivery_date = document.getElementById('edit-task-next-delivery-date')?.value || "N/A";
            } else {
                payload.reels_count = parseInt(document.getElementById('edit-task-reels')?.value) || 0;
                payload.long_video_count = parseInt(document.getElementById('edit-task-videos')?.value) || 0;
                payload.poster_count = parseInt(document.getElementById('edit-task-posters')?.value) || 0;
                payload.calls_made = parseInt(document.getElementById('edit-task-calls')?.value) || 0;
                payload.custom_field_values = "[]";
                payload.upload_deadline = "N/A";
                payload.next_delivery_date = "N/A";
            }
        }

        try {
            const endpoint = isDev ? `/tasks/developer/update/${taskId}` : `/tasks/content/update/${taskId}`;
            await apiFetch(endpoint, {
                method: 'PUT',
                body: payload
            });
            showToast("Timesheet entry updated successfully!", "success");
            
            // Reload all workspace data
            await loadAdminWorkspaceData();
            
            // Re-open inspection modal with updated data
            openTaskDetailsModal(taskId);
            
            // Re-render the active template to reflect changes under the modal
            if (state.activeProject) {
                await openProjectDetails(state.activeProject.id);
            } else {
                routeApp(state.adminView);
            }
        } catch (err) {
            showToast("Failed to save changes: " + err.message, "error");
        } finally {
            if (btn) { btn.innerHTML = og; btn.disabled = false; lucide.createIcons(); }
        }
    };

    function isUserBusy() {
      // 1. Check if the user is currently typing in an input, textarea, or select
      const activeEl = document.activeElement;
      const isTyping = activeEl && 
                       (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT') && 
                       !activeEl.readOnly && 
                       !activeEl.disabled;
                       
      if (isTyping) return true;

      // 2. Check if any modal or drawer overlay is open and visible
      const modalIds = [
        'global-modal', 'secondary-modal', 'credentialsModalOverlay', 
        'adminDrawerOverlay', 'imageModalOverlay', 'globalModal', 
        'otpModal', 'otpModalContainer', 'leaveDetailsModal', 'leaveDetailsModalContainer'
      ];
      for (const id of modalIds) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden') && window.getComputedStyle(el).display !== 'none') {
          return true;
        }
      }

      // 3. Check for any dirty forms (non-empty user-entered inputs)
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');
      for (const input of inputs) {
        if (!input.disabled && !input.readOnly && input.value.trim() !== '' && input.value !== input.defaultValue) {
          return true;
        }
      }

      // 4. Check if dropdowns have been changed from their default selected option
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        if (!select.disabled) {
          const options = select.options;
          for (let i = 0; i < options.length; i++) {
            if (options[i].selected && !options[i].defaultSelected && options[i].value !== 'N/A' && options[i].value !== '') {
              return true;
            }
          }
        }
      }
      
      // 5. Special views check for active task logs with added rows
      if (typeof state !== 'undefined') {
        if (state.currentView === 'log-dev' || state.currentView === 'log-content') {
          const container = document.getElementById('dev-task-container') || document.getElementById('content-task-container');
          if (container && container.children.length > 0) {
            return true;
          }
        }
      }

      return false;
    }

    let ws;
    function setupWebSocket() {
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      )
        return;
      const token = localStorage.getItem(CONFIG.TOKEN_KEY);
      if (!token) {
        console.log("No token found. WebSocket connection skipped.");
        return;
      }
      const wsUrl = CONFIG.API_BASE_URL.replace("http", "ws") + "/ws?token=" + encodeURIComponent(token);
      ws = new WebSocket(wsUrl);

      ws.onopen = () =>
        console.log("WebSocket connected for real-time updates");
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action === "REFRESH_WORKSPACE") {
            console.log(
              "WebSocket update received. Performing silent refresh.",
            );

            // Silent data refresh
            await loadAdminWorkspaceData();

            if (state.adminView === "dashboard") {
              await loadDashboardData();
              if (state.isDailyReportVisible) {
                try {
                  const data = await apiFetch("/dashboard/daily-report");
                  state.dailyReportDataCache = data;
                } catch (e) {
                  console.error("Silent daily report refresh failed:", e);
                }
              }
            }

            // Guard the UI refresh/rerender
            if (isUserBusy()) {
              console.log("User is currently busy (editing or typing). Skipping DOM refresh to prevent data loss.");
              return;
            }

            if (state.activeProject) {
              await openProjectDetails(state.activeProject.id);
            } else {
              // Background update: Re-render with new data cache
              renderAdminApp();
            }
          }
        } catch (e) {
          console.error("Error processing websocket message", e);
        }
      };
      
      ws.onclose = (event) => {
        if (event.code === 1008) {
          console.log("WebSocket connection rejected due to authentication failure. Stopping reconnection.");
          return;
        }
        setTimeout(setupWebSocket, 3000);
      };
      ws.onerror = () => ws.close();
    }

    // Mobile & Desktop Sidebar Toggle Logic
    window.toggleMobileSidebar = function () {
      const sidebar = document.getElementById("main-sidebar");
      const overlay = document.getElementById("mobile-sidebar-overlay");
      if (!sidebar) return;

      if (window.innerWidth < 768) {
        if (!overlay) return;
        const isOpen = !sidebar.classList.contains("-translate-x-full");
        if (isOpen) {
          // Close it
          sidebar.classList.add("-translate-x-full");
          overlay.classList.add("opacity-0");
          setTimeout(() => overlay.classList.add("hidden"), 300);
        } else {
          // Open it
          overlay.classList.remove("hidden");
          // Small delay to allow display:block to apply before animating opacity
          setTimeout(() => {
            overlay.classList.remove("opacity-0");
            sidebar.classList.remove("-translate-x-full");
          }, 10);
        }
      } else {
        // Desktop collapse
        const isCollapsed = sidebar.classList.toggle("sidebar-collapsed");
        localStorage.setItem(
          "yanaSidebarCollapsed",
          isCollapsed ? "true" : "false",
        );

        // Trigger window resize to auto-adjust charts
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 310);
      }
    };

    // --- Bootstrap Application ---
    async function bootstrapApp() {
      try {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);

        if (!token) {
          window.location.href = CONFIG.LOGIN_URL;
          return;
        }

        state.user = parseJwt(token);

        if (
          !state.user ||
          !state.user.exp ||
          state.user.exp * 1000 < Date.now()
        ) {
          console.warn("Session expired or invalid token. Redirecting to login.");
          localStorage.removeItem(CONFIG.TOKEN_KEY);
          window.location.href = CONFIG.LOGIN_URL;
          return;
        }

        if (!state.user.role || state.user.role.toLowerCase() !== "admin") {
          console.warn("User role is not admin. Redirecting to employee portal.");
          window.location.href = "../employee/employee.html";
          return;
        }

        if (state.user.access_level === "ManagerAdmin") {
          console.warn("User access level is ManagerAdmin. Redirecting to manager portal.");
          window.location.href = "../manager/manager.html";
          return;
        }

        // Restore the last visited view and tab, or default to dashboard
        const lastView = sessionStorage.getItem("lastAdminView") || "dashboard";
        const lastTab =
          sessionStorage.getItem("lastWorkforceTab") || "employees";

        setupWebSocket();
        await routeApp(lastView, lastTab);
      } catch (err) {
        console.error("Critical error during app bootstrap:", err);
        const appDiv = document.getElementById("app");
        if (appDiv) {
          appDiv.innerHTML = `
            <div class="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
              <div class="p-4 bg-rose-100 text-rose-600 rounded-2xl mb-4">
                <i data-lucide="alert-triangle" class="w-10 h-10"></i>
              </div>
              <h2 class="text-xl font-bold text-slate-800 mb-2">Workspace Load Error</h2>
              <p class="text-xs text-slate-500 mb-4">An unexpected error occurred while initializing the admin workspace.</p>
              <button onclick="localStorage.removeItem('${CONFIG.TOKEN_KEY}'); window.location.href='${CONFIG.LOGIN_URL}';" class="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md">Return to Login</button>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrapApp);
    } else {
      bootstrapApp();
    }

    async function updateLeaveStatus(leaveId, status) {
      const isConfirmed = await customConfirm(
        "Update Leave Request",
        `Are you sure you want to mark this leave request as ${status}?`,
        status,
        "Cancel",
        status === "Rejected",
      );
      if (!isConfirmed) return;
      try {
        await apiFetch(`/attendance/leave-requests/${leaveId}/status`, {
          method: "PUT",
          body: { status: status },
        });
        showToast(
          `Leave request ${status.toLowerCase()} successfully!`,
          "success",
        );
        await loadAdminWorkspaceData();
        routeApp("attendance", "leave");
      } catch (error) {
        showToast(
          `Failed to update leave request: ${error.message}`,
          "error",
        );
      }
    }

    

    async function handleAdminProfileUpdate(event) {
      event.preventDefault();
      if (!state.activeAdminProfile) return;

      const fullName = document.getElementById('admin-profile-name-input').value;
      const email = document.getElementById('admin-profile-email-input').value;
      const password = document.getElementById('admin-profile-password').value;
      const confirmPassword = document.getElementById('admin-profile-confirm-password').value;

      if (password && password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
      }

      const body = {
        full_name: fullName,
        email: email
      };

      if (password) {
        body.password = password;
      }

      try {
        const res = await apiFetch(`/admins/update/${state.activeAdminProfile.id}`, {
          method: 'PUT',
          body: body
        });

        if (res) {
          showToast("Profile updated successfully!", "success");
          state.activeAdminProfile = res;
          renderAdminApp();
        }
      } catch (err) {
        showToast("Failed to update profile: " + err.message, "error");
      }
    }
    

    function getProjectChecklistsTab(p) {
      setTimeout(() => loadProjectChecklistTemplates(p.id), 50);
      return `
              <div class="animate-in">
                  <div class="mb-6">
                      <h3 class="text-xl font-bold text-slate-800 tracking-tight">Project Gatekeeper Checklists</h3>
                      <p class="text-sm text-slate-500 mt-1">Define mandatory tasks that must be verified when THIS project starts or ends.</p>
                  </div>

                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                      <div class="p-6">
                          <!-- Add New Form -->
                          <form id="add-project-checklist-form" onsubmit="handleAddProjectChecklist(event, '${p.id}')" class="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-end">
                              <div class="flex-1 w-full">
                                  <label class="block text-xs font-semibold text-slate-700 mb-1">Checklist Task Description</label>
                                  <input type="text" id="proj-checklist-desc" required placeholder="e.g. Verify client purchased server" class="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-brand-primary" />
                              </div>
                              <div class="w-full sm:w-48">
                                  <label class="block text-xs font-semibold text-slate-700 mb-1">Phase</label>
                                  <select id="proj-checklist-phase" required class="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-brand-primary bg-white">
                                      <option value="START">Project Start</option>
                                      <option value="END">Project End</option>
                                      
                                  </select>
                              </div>
                              <button type="submit" class="w-full sm:w-auto px-6 py-2 bg-brand-primary hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors h-[42px] flex items-center justify-center">
                                  <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Add Item
                              </button>
                          </form>

                          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <!-- START Checklists -->
                              <div>
                                  <h4 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                      <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                                      Start Phase Requirements
                                  </h4>
                                  <div id="proj-settings-start-checklists" class="space-y-3">
                                      <div class="animate-pulse h-12 bg-slate-100 rounded-lg"></div>
                                  </div>
                              </div>

                              <!-- END Checklists -->
                              <div>
                                  <h4 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                      <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                                      End Phase Requirements
                                  </h4>
                                  <div id="proj-settings-end-checklists" class="space-y-3">
                                      <div class="animate-pulse h-12 bg-slate-100 rounded-lg"></div>
                                  </div>
                              </div>

                          </div>
                      </div>
                  </div>
              </div>
          `;
    }

    async function loadProjectChecklistTemplates(projectId) {
      try {
        const templates = await apiFetch(`/checklists/templates/${projectId}`);

        const startContainer = document.getElementById("proj-settings-start-checklists");
        const endContainer = document.getElementById("proj-settings-end-checklists");

        if (!startContainer || !endContainer) return;

        let startHtml = "";
        let endHtml = "";


        templates.forEach(t => {
          const itemHtml = `
                      <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                          <span class="text-sm font-medium text-slate-700">${t.task_description}</span>
                          <button onclick="deleteProjectChecklistTemplate('${t.id}', '${projectId}')" class="text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                          </button>
                      </div>
                  `;
          if (t.phase === "START") startHtml += itemHtml;
          else if (t.phase === "END") endHtml += itemHtml;

        });

        startContainer.innerHTML = startHtml || '<p class="text-sm text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">No start checklists defined.</p>';
        endContainer.innerHTML = endHtml || '<p class="text-sm text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">No end checklists defined.</p>';

        lucide.createIcons();
      } catch (err) {
        console.error(err);
        showToast("Failed to load checklists", "error");
      }
    }

    async function handleAddProjectChecklist(e, projectId) {
      e.preventDefault();
      const desc = document.getElementById("proj-checklist-desc").value;
      const phase = document.getElementById("proj-checklist-phase").value;
      if (!desc) return;

      try {
        await apiFetch("/checklists/templates", {
          method: "POST",
          body: { project_id: projectId, task_description: desc, phase: phase }
        });
        showToast("Checklist item added", "success");
        document.getElementById("proj-checklist-desc").value = "";
        loadProjectChecklistTemplates(projectId);
      } catch (err) {
        showToast(err.message, "error");
      }
    }

    

    async function loadProjectGatekeeperState(projectId) {
      const panel = document.getElementById("project-gatekeeper-state-panel");
      if (!panel) return;

      try {
        let startRes, endRes;
        if (state.projectChecklistsCache && String(state.activeProject?.id) === String(projectId)) {
          startRes = state.projectChecklistsCache.START;
          endRes = state.projectChecklistsCache.END;
        } else {
          [startRes, endRes] = await Promise.all([
            apiFetch(`/checklists/projects/${projectId}?phase=START`).catch(() => ({ items: [] })),
            apiFetch(`/checklists/projects/${projectId}?phase=END`).catch(() => ({ items: [] }))
          ]);
        }

        const startItems = startRes.items || [];
        const endItems = endRes.items || [];

        if (startItems.length === 0 && endItems.length === 0) {
          panel.innerHTML = '';
          return;
        }

        const renderChecklists = (items, colorClass, iconHtml) => {
          if (items.length === 0) return `<p class="text-xs text-slate-400 italic mt-2">No requirements defined.</p>`;
          return `<ul class="mt-3 space-y-2">` + items.map(item => `
                      <li class="flex items-start gap-2 text-sm">
                          ${item.is_checked ?
              `<i data-lucide="check-square" class="w-4 h-4 mt-0.5 ${colorClass}"></i><span class="text-slate-700 line-through opacity-70">${item.task_description}</span>` :
              `<i data-lucide="square" class="w-4 h-4 mt-0.5 text-slate-300"></i><span class="text-slate-700 font-medium">${item.task_description}</span>`
            }
                      </li>
                  `).join('') + `</ul>`;
        };

        panel.innerHTML = `
                  <h4 class="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <i data-lucide="list-checks" class="w-4 h-4 text-brand-primary"></i> Mandatory Phase Checklists
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h5 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-indigo-500"></div> START PHASE</h5>
                          ${renderChecklists(startItems, "text-indigo-500")}
                      </div>
                      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h5 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div> END PHASE</h5>
                          ${renderChecklists(endItems, "text-emerald-500")}
                      </div>
                  </div>
              `;
        lucide.createIcons();
      } catch (err) {
        console.error("Failed to load gatekeeper state", err);
      }
    }

    window.showLeaveDetailsModal = function (leaveId) {
      const req = (state.allLeaveRequests || []).find(r => r.id === leaveId);
      if (!req) return;

      const emp = state.allEmployees.find(e => e.id === req.employee_id) || {};
      const empName = emp.full_name || emp.username || "Unknown Employee";

      let backupName = 'N/A';
      if (req.backup_employee_id && req.backup_employee_id !== 'N/A') {
        const backupEmp = (state.allEmployees || []).find(e => e.id === req.backup_employee_id);
        backupName = backupEmp ? backupEmp.full_name : req.backup_employee_id;
      }

      const modalHtml = `
        <div id="leaveDetailsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-50 to-rose-505"></div>
                <h3 class="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 mt-2">
                    <i data-lucide="calendar" class="w-5 h-5 text-indigo-600"></i> Leave Details
                </h3>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</span>
                            <span class="text-sm font-semibold text-slate-800">${empName}</span>
                        </div>
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Type</span>
                            <span class="text-sm font-semibold text-slate-800">${req.leave_type || 'Paid Leave'}</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                            <span class="text-sm font-semibold text-slate-800">${new Date(req.start_date).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                            <span class="text-sm font-semibold text-slate-800">${new Date(req.end_date).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Working Days</span>
                            <span class="text-sm font-semibold text-slate-800">${req.total_days || 1.0} Day(s)</span>
                        </div>
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration Option</span>
                            <span class="text-sm font-semibold text-slate-800">${req.half_day_option || 'Full Day'}</span>
                        </div>
                    </div>

                    <div>
                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Leave</span>
                        <p class="text-sm text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl p-3 mt-1 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">${req.reason}</p>
                    </div>

                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Handover Details</span>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Backup Employee</span>
                                        <span class="text-sm font-semibold text-slate-800">${backupName}</span>
                            </div>
                            <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deployment Pending?</span>
                                        <span class="text-sm font-semibold text-slate-800">${req.deployment_pending || 'No'}</span>
                            </div>
                        </div>
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Work Summary</span>
                            <p class="text-xs text-slate-600 mt-1 whitespace-pre-wrap">${req.pending_work_summary || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end mt-6">
                    <button type="button" onclick="document.getElementById('leaveDetailsModal').remove()" class="px-5 py-2 bg-slate-800 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors">Close</button>
                </div>
            </div>
        </div>
      `;
      const div = document.createElement('div');
      div.id = 'leaveDetailsModalContainer';
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
      if (window.lucide) lucide.createIcons();
    };

    window.openManageHolidaysModal = async function () {
      try {
        const holidays = await apiFetch("/attendance/holidays").catch(() => []);
        state.holidays = holidays;
      } catch (e) {
        console.error("Failed to reload holidays", e);
      }

      const modalHtml = `
        <div id="manageHolidaysModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl w-full mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-50 to-rose-505"></div>
                <h3 class="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 mt-2">
                    <i data-lucide="calendar" class="w-5 h-5 text-indigo-600"></i> Manage Holidays & Declared Leaves
                </h3>

                <!-- Add Holiday Form -->
                <form id="addHolidayForm" onsubmit="window.handleAddHoliday(event)" class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 space-y-4 shrink-0">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Holiday Name</label>
                            <input type="text" id="holidayName" required class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="e.g. Christmas Day">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                            <input type="date" id="holidayDate" required class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                            <select id="holidayType" required class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                <option value="Public">Public Holiday</option>
                                <option value="Company">Company Declared Leave</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10">Add Holiday</button>
                    </div>
                </form>

                <!-- List of Holidays -->
                <div class="flex-1 overflow-y-auto space-y-2.5 min-h-[200px] pr-1">
                    <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Current Holidays</h4>
                    ${state.holidays.length === 0 ? `
                        <div class="text-center py-8 text-slate-400 text-sm">No holidays or company leaves declared yet.</div>
                    ` : state.holidays.map(h => `
                        <div class="flex justify-between items-center p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:shadow transition-shadow">
                            <div>
                                <span class="font-bold text-slate-800 text-sm">${h.name}</span>
                                <span class="ml-2 inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${h.holiday_type === 'Public' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}">${h.holiday_type}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-semibold text-slate-500">${new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <button type="button" onclick="window.handleDeleteHoliday('${h.id}')" class="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Delete">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-end mt-5 pt-3 border-t border-slate-100 shrink-0">
                    <button type="button" onclick="document.getElementById('manageHolidaysModal').remove()" class="px-5 py-2 bg-slate-800 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors">Close</button>
                </div>
            </div>
        </div>
      `;
      const div = document.createElement('div');
      div.id = 'manageHolidaysModalContainer';
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
      if (window.lucide) lucide.createIcons();
    };

    window.handleAddHoliday = async function (e) {
      e.preventDefault();
      const name = document.getElementById('holidayName').value.trim();
      const date = document.getElementById('holidayDate').value;
      const holiday_type = document.getElementById('holidayType').value;

      try {
        await apiFetch('/attendance/holidays', {
          method: 'POST',
          body: { name, date, holiday_type }
        });
        showToast("Holiday added successfully", "success");
        if (document.getElementById('manageHolidaysModal')) document.getElementById('manageHolidaysModal').remove();
        await loadAdminWorkspaceData();
        window.openManageHolidaysModal();
      } catch (err) {
        showToast("Failed to add holiday: " + err.message, "error");
      }
    };

    window.handleDeleteHoliday = async function (id) {
      const confirmDelete = await customConfirm("Delete Holiday", "Are you sure you want to delete this holiday?", "Delete", "Cancel", true);
      if (!confirmDelete) return;

      try {
        await apiFetch('/attendance/holidays/' + id, { method: 'DELETE' });
        showToast("Holiday deleted successfully", "success");
        if (document.getElementById('manageHolidaysModal')) document.getElementById('manageHolidaysModal').remove();
        await loadAdminWorkspaceData();
        window.openManageHolidaysModal();
      } catch (err) {
        showToast("Failed to delete holiday: " + err.message, "error");
      }
    };

    window.openChangeWorkingHoursModal = function () {
      const depts = [...new Set(state.allRoles.map(r => r.department_name))].filter(Boolean);
      const roles = state.allRoles || [];
      const employees = state.allEmployees || [];

      const deptOptions = depts.map(d => `<option value="${d}">${d}</option>`).join('');
      const roleOptions = roles.map(r => `<option value="${r.id}">${r.department_name} - ${r.role_name}</option>`).join('');
      const empOptions = employees.map(e => `<option value="${e.id}">${e.full_name} (${e.username})</option>`).join('');

      const modalHtml = `
        <div id="changeWorkingHoursModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-50 to-rose-505"></div>
                <h3 class="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 mt-2">
                    <i data-lucide="clock" class="w-5 h-5 text-indigo-600"></i> Change Working Hours
                </h3>
                
                <form onsubmit="window.handleChangeWorkingHoursSubmit(event)" class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Working Hours (Daily)</label>
                        <input type="number" step="0.5" min="0" max="24" id="newWorkingHours" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold" placeholder="e.g. 8.0" value="8.0">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shift Start Time</label>
                            <input type="time" id="newShiftStart" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold" value="09:00">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shift End Time</label>
                            <input type="time" id="newShiftEnd" required class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold" value="18:00">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1.5">Apply Scope</label>
                        <select id="hoursScope" onchange="window.handleHoursScopeChange(this.value)" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                            <option value="all">All Employees</option>
                            <option value="employee">Specific Employee</option>
                            <option value="department">Specific Department</option>
                            <option value="role">Specific Role</option>
                        </select>
                    </div>

                    <div id="employeeScopeField" class="hidden animate-in fade-in duration-150">
                        <label class="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1.5">Select Employee</label>
                        <select id="targetEmployeeId" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                            ${empOptions}
                        </select>
                    </div>

                    <div id="departmentScopeField" class="hidden animate-in fade-in duration-150">
                        <label class="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1.5">Select Department</label>
                        <select id="targetDepartment" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                            ${deptOptions}
                        </select>
                    </div>

                    <div id="roleScopeField" class="hidden animate-in fade-in duration-150">
                        <label class="block text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-1.5">Select Role</label>
                        <select id="targetRoleId" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                            ${roleOptions}
                        </select>
                    </div>

                    <div class="flex gap-3 justify-end mt-6">
                        <button type="button" onclick="document.getElementById('changeWorkingHoursModal').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">Cancel</button>
                        <button type="submit" class="px-5 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      `;
      const div = document.createElement('div');
      div.id = 'changeWorkingHoursModalContainer';
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
      if (window.lucide) lucide.createIcons();
    };

    window.handleHoursScopeChange = function (val) {
      document.getElementById('employeeScopeField').classList.add('hidden');
      document.getElementById('departmentScopeField').classList.add('hidden');
      document.getElementById('roleScopeField').classList.add('hidden');

      if (val === 'employee') document.getElementById('employeeScopeField').classList.remove('hidden');
      if (val === 'department') document.getElementById('departmentScopeField').classList.remove('hidden');
      if (val === 'role') document.getElementById('roleScopeField').classList.remove('hidden');
    };

    window.handleChangeWorkingHoursSubmit = async function (e) {
      e.preventDefault();
      const working_hours = parseFloat(document.getElementById('newWorkingHours').value);
      const shift_start_time = document.getElementById('newShiftStart').value;
      const shift_end_time = document.getElementById('newShiftEnd').value;
      const scope = document.getElementById('hoursScope').value;

      const payload = { 
        working_hours,
        shift_start_time,
        shift_end_time
      };

      if (scope === 'employee') {
        payload.employee_ids = [document.getElementById('targetEmployeeId').value];
      } else if (scope === 'department') {
        payload.department = document.getElementById('targetDepartment').value;
      } else if (scope === 'role') {
        payload.role_id = document.getElementById('targetRoleId').value;
      }

      try {
        await apiFetch('/attendance/working-hours', {
          method: 'POST',
          body: payload
        });
        showToast("Working hours updated successfully", "success");
        document.getElementById('changeWorkingHoursModal').remove();
        await loadAdminWorkspaceData();
        renderAdminApp();
      } catch (err) {
        showToast("Failed to update working hours: " + err.message, "error");
      }
    };

    window.attachBaseOneIncrementHandlers = function(contextEl = document) {
      const inputs = contextEl.querySelectorAll('input[type="number"]');
      inputs.forEach(input => {
        if (input.dataset.baseOneAttached) return;
        input.dataset.baseOneAttached = "true";

        const idStr = (input.id || "").toLowerCase();
        const nameStr = (input.name || "").toLowerCase();
        const classStr = (input.className || "").toLowerCase();
        const isFinancial = 
          idStr.includes("cost") || idStr.includes("budget") || idStr.includes("rate") || idStr.includes("billing") || idStr.includes("amount") ||
          nameStr.includes("cost") || nameStr.includes("budget") || nameStr.includes("rate") || nameStr.includes("billing") || nameStr.includes("amount") ||
          classStr.includes("cost") || classStr.includes("budget") || classStr.includes("rate") || classStr.includes("billing");

        if (isFinancial) {
          input.addEventListener("keydown", function(e) {
            if (e.key === "ArrowUp") {
              const val = parseFloat(input.value);
              if (!input.value || isNaN(val) || val === 0) {
                e.preventDefault();
                input.value = "1.00";
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }
          });
          input.addEventListener("focus", function() {
            input.dataset.prevValue = input.value;
          });
          input.addEventListener("input", function() {
            const prev = parseFloat(input.dataset.prevValue || "0");
            const curr = parseFloat(input.value);
            if ((prev === 0 || isNaN(prev)) && curr > 0 && curr < 1) {
              input.value = "1.00";
            }
            input.dataset.prevValue = input.value;
          });
        }
      });
    };

    const todayObj = new Date();
    const yesterdayObj = new Date();
    yesterdayObj.setDate(todayObj.getDate() - 1);
    
    state.auditLogsData = null;
    state.auditLogPage = 1;
    state.auditLogFilterAction = "";
    state.auditLogSearch = "";
    state.auditLogStartDate = yesterdayObj.toISOString().split('T')[0];
    state.auditLogEndDate = todayObj.toISOString().split('T')[0];

    window.loadAuditLogsData = async function(page = 1) {
      state.auditLogPage = page;
      try {
        let url = `/audit-logs?page=${page}&limit=25`;
        if (state.auditLogFilterAction) url += `&action=${encodeURIComponent(state.auditLogFilterAction)}`;
        if (state.auditLogSearch) url += `&search=${encodeURIComponent(state.auditLogSearch)}`;
        if (state.auditLogStartDate) url += `&start_date=${encodeURIComponent(state.auditLogStartDate)}`;
        if (state.auditLogEndDate) url += `&end_date=${encodeURIComponent(state.auditLogEndDate)}`;
        
        const data = await apiFetch(url);
        state.auditLogsData = data;
        renderAdminApp();
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      }
    };

    window.fetchCustomAuditLogsData = async function() {
      const sDate = document.getElementById("auditLogStartDate")?.value;
      const eDate = document.getElementById("auditLogEndDate")?.value;
      if (!sDate || !eDate) {
        showToast("Please select both start and end dates.", "warning");
        return;
      }
      state.auditLogStartDate = sDate;
      state.auditLogEndDate = eDate;
      await window.loadAuditLogsData(1);
      showToast("Custom audit logs fetched successfully!", "success");
    };

    window.resetAuditLogDatesToDefault = async function() {
      const tObj = new Date();
      const yObj = new Date();
      yObj.setDate(tObj.getDate() - 1);
      state.auditLogStartDate = yObj.toISOString().split('T')[0];
      state.auditLogEndDate = tObj.toISOString().split('T')[0];
      state.auditLogSearch = "";
      state.auditLogFilterAction = "";
      await window.loadAuditLogsData(1);
      showToast("Reset to Today & Yesterday logs", "info");
    };

    window.clearAllAuditLogFilters = async function() {
      state.auditLogStartDate = "";
      state.auditLogEndDate = "";
      state.auditLogSearch = "";
      state.auditLogFilterAction = "";
      await window.loadAuditLogsData(1);
      showToast("All filters and date restrictions cleared", "info");
    };

    window.handleAuditLogSearch = function(val) {
      state.auditLogSearch = val;
      window.loadAuditLogsData(1);
    };

    window.handleAuditLogFilterAction = function(val) {
      state.auditLogFilterAction = val;
      window.loadAuditLogsData(1);
    };

    window.showAuditLogDetailsModal = function(logId) {
      if (!state.auditLogsData || !state.auditLogsData.logs) return;
      const log = state.auditLogsData.logs.find(l => String(l.id) === String(logId));
      if (!log) return;

      const jsonStr = JSON.stringify(log.details || {}, null, 2);
      const modalHtml = `
        <div id="auditLogModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div class="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <i data-lucide="file-text" class="w-5 h-5 text-indigo-600"></i> Audit Log Details
                </h3>
                <p class="text-xs text-slate-400 font-medium">Action: ${log.action} | User: ${log.user_id}</p>
              </div>
              <button onclick="document.getElementById('auditLogModal').remove()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            <div class="mt-4">
              <p class="text-xs font-semibold text-slate-600 mb-1">Timestamp: ${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</p>
              <p class="text-xs font-semibold text-slate-600 mb-2">Target ID: <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">${log.target_id || 'N/A'}</span></p>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Payload JSON Details</label>
              <pre class="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto shadow-inner">${jsonStr}</pre>
            </div>
            <div class="mt-6 flex justify-end">
              <button onclick="document.getElementById('auditLogModal').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      if (window.lucide) lucide.createIcons();
    };

    function getAdminActivityLogsTemplate() {
      if (!state.auditLogsData && !state.isAuditLogsLoading) {
        state.isAuditLogsLoading = true;
        window.loadAuditLogsData(1).finally(() => { state.isAuditLogsLoading = false; });
      }

      const data = state.auditLogsData || { total: 0, page: 1, limit: 25, pages: 1, logs: [] };

      const getActionBadge = (act) => {
        const uAct = (act || "").toUpperCase().replace(" ", "_").replace("-", "_");
        switch (uAct) {
          case 'PROJECT_CREATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">PROJECT CREATE</span>';
          case 'PROJECT_UPDATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">PROJECT UPDATE</span>';
          case 'PROJECT_DELETE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">PROJECT DELETE</span>';
          case 'EMPLOYEE_ASSIGN': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">EMPLOYEE ASSIGN</span>';
          case 'EMPLOYEE_REMOVE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">EMPLOYEE REMOVE</span>';
          case 'ASSIGNMENT_RATE_UPDATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">RATE UPDATE</span>';
          case 'PROFILE_UPDATE':
          case 'EMPLOYEE_PROFILE_UPDATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">PROFILE UPDATE</span>';
          case 'CLIENT_CREATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">CLIENT CREATE</span>';
          case 'UPDATE_LEAVE_STATUS':
          case 'LEAVE_STATUS_UPDATE': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">LEAVE STATUS</span>';
          case 'SUBMIT_LEAVE_REQUEST': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">LEAVE SUBMIT</span>';
          case 'CANCEL_LEAVE_REQUEST': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">LEAVE CANCEL</span>';
          case 'REQUEST_LEAVE_CANCELLATION': return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">CANCEL REQ</span>';
          default: return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${act}</span>`;
        }
      };

      const logsRows = data.logs.map(log => {
        const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
        const detailSummary = log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'No payload';
        const truncatedSummary = detailSummary.length > 55 ? detailSummary.substring(0, 55) + '...' : detailSummary;

        return `
          <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
            <td class="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">${timeStr}</td>
            <td class="px-4 py-3 text-xs font-bold text-slate-800">${log.user_id || 'System'}</td>
            <td class="px-4 py-3 whitespace-nowrap">${getActionBadge(log.action)}</td>
            <td class="px-4 py-3 text-xs font-mono text-slate-600">${log.target_id || 'N/A'}</td>
            <td class="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title="${detailSummary.replace(/"/g, '&quot;')}">${truncatedSummary}</td>
            <td class="px-4 py-3 text-right">
              <button onclick="window.showAuditLogDetailsModal('${log.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1 inline-flex">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i> Details
              </button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="space-y-6">
          <!-- Section Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <i data-lucide="shield-alert" class="w-6 h-6 text-brand-primary"></i> System Activity & Security Audit Logger
              </h2>
              <p class="text-xs text-slate-500 font-medium mt-1">Real-time audit log tracking user actions, project modifications, rate edits, and security events across Admin Panel.</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-2">
                <i data-lucide="list" class="w-4 h-4 text-indigo-600"></i> Total Logs: ${data.total}
              </span>
              <button onclick="window.loadAuditLogsData(${data.page})" class="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Filters & Controls (Date Range + Action Type + Search) -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <!-- Row 1: Custom Date Range Controls (Matching Financial Ledger Pattern) -->
            <div class="flex flex-col md:flex-row items-end gap-3 pb-3 border-b border-slate-100">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" id="auditLogStartDate" value="${state.auditLogStartDate}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:border-indigo-500 shadow-sm">
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                <input type="date" id="auditLogEndDate" value="${state.auditLogEndDate}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:border-indigo-500 shadow-sm">
              </div>
              <button onclick="window.fetchCustomAuditLogsData()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                <i data-lucide="filter" class="w-3.5 h-3.5"></i> Fetch Custom Range
              </button>
              <button onclick="window.resetAuditLogDatesToDefault()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200">
                Today & Yesterday
              </button>
            </div>

            <!-- Row 2: Search & Action Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Search User / Action / Details</label>
                <div class="relative">
                  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-2.5 text-slate-400"></i>
                  <input type="text" value="${state.auditLogSearch || ''}" onchange="window.handleAuditLogSearch(this.value)" placeholder="Search username, project ID, details..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium focus:border-indigo-500 shadow-sm">
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Action Type</label>
                <select onchange="window.handleAuditLogFilterAction(this.value)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-semibold focus:border-indigo-500 shadow-sm">
                  <option value="">-- All Action Types --</option>
                  <option value="PROJECT_CREATE" ${state.auditLogFilterAction === 'PROJECT_CREATE' ? 'selected' : ''}>Project Create</option>
                  <option value="PROJECT_UPDATE" ${state.auditLogFilterAction === 'PROJECT_UPDATE' ? 'selected' : ''}>Project Update</option>
                  <option value="PROJECT_DELETE" ${state.auditLogFilterAction === 'PROJECT_DELETE' ? 'selected' : ''}>Project Delete</option>
                  <option value="EMPLOYEE_ASSIGN" ${state.auditLogFilterAction === 'EMPLOYEE_ASSIGN' ? 'selected' : ''}>Employee Assign</option>
                  <option value="EMPLOYEE_REMOVE" ${state.auditLogFilterAction === 'EMPLOYEE_REMOVE' ? 'selected' : ''}>Employee Remove</option>
                  <option value="ASSIGNMENT_RATE_UPDATE" ${state.auditLogFilterAction === 'ASSIGNMENT_RATE_UPDATE' ? 'selected' : ''}>Assignment Rate Update</option>
                  <option value="profile_update" ${state.auditLogFilterAction === 'profile_update' ? 'selected' : ''}>Profile Update</option>
                  <option value="CLIENT_CREATE" ${state.auditLogFilterAction === 'CLIENT_CREATE' ? 'selected' : ''}>Client Create</option>
                  <option value="UPDATE_LEAVE_STATUS" ${state.auditLogFilterAction === 'UPDATE_LEAVE_STATUS' ? 'selected' : ''}>Leave Status Update</option>
                  <option value="SUBMIT_LEAVE_REQUEST" ${state.auditLogFilterAction === 'SUBMIT_LEAVE_REQUEST' ? 'selected' : ''}>Submit Leave Request</option>
                  <option value="CANCEL_LEAVE_REQUEST" ${state.auditLogFilterAction === 'CANCEL_LEAVE_REQUEST' ? 'selected' : ''}>Cancel Leave Request</option>
                  <option value="REQUEST_LEAVE_CANCELLATION" ${state.auditLogFilterAction === 'REQUEST_LEAVE_CANCELLATION' ? 'selected' : ''}>Request Leave Cancellation</option>
                </select>
              </div>
              <div class="flex items-end gap-2">
                <button onclick="window.clearAllAuditLogFilters()" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200">
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>

          <!-- Audit Logs Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="px-4 py-3">Timestamp</th>
                    <th class="px-4 py-3">User</th>
                    <th class="px-4 py-3">Action</th>
                    <th class="px-4 py-3">Target ID</th>
                    <th class="px-4 py-3">Details Summary</th>
                    <th class="px-4 py-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${data.logs.length > 0 ? logsRows : `
                    <tr>
                      <td colspan="6" class="px-4 py-12 text-center text-slate-400 text-xs font-medium">
                        <i data-lucide="info" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                        No audit log records found matching your filters.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- Pagination Controls -->
            <div class="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
              <div>Showing Page ${data.page} of ${data.pages || 1} (${data.total} total logs)</div>
              <div class="flex items-center gap-2">
                <button onclick="window.loadAuditLogsData(${Math.max(1, data.page - 1)})" ${data.page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all">
                  Previous
                </button>
                <button onclick="window.loadAuditLogsData(${Math.min(data.pages || 1, data.page + 1)})" ${data.page >= (data.pages || 1) ? 'disabled' : ''} class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    window.openManageLeaveQuotaModal = function(empId) {
      const emp = state.allEmployees.find(e => String(e.id) === String(empId)) || state.activeEmployee;
      if (!emp) return;

      const modalHtml = `
        <div id="leaveQuotaModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div class="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i data-lucide="sliders" class="w-4 h-4 text-brand-primary"></i> Manage Leave Inventory
                </h3>
                <p class="text-xs text-slate-500 font-medium">Operative: ${emp.full_name}</p>
              </div>
              <button onclick="document.getElementById('leaveQuotaModal').remove()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
            
            <form id="leaveQuotaForm" onsubmit="window.saveEmployeeLeaveQuotas(event, '${emp.id}')" class="mt-4 space-y-4">
              <!-- Paid Leaves -->
              <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <label class="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Paid Leaves Inventory</label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Total Allocated</span>
                    <input type="number" step="0.5" id="q_total_paid" value="${emp.total_paid_leaves !== undefined && emp.total_paid_leaves !== null ? emp.total_paid_leaves : 18.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Consumed / Used</span>
                    <input type="number" step="0.5" id="q_used_paid" value="${emp.used_paid_leaves || 0.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                </div>
              </div>

              <!-- Casual Leaves -->
              <div class="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <label class="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Casual Leaves Inventory</label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Total Allocated</span>
                    <input type="number" step="0.5" id="q_total_casual" value="${emp.total_casual_leaves !== undefined && emp.total_casual_leaves !== null ? emp.total_casual_leaves : 6.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Consumed / Used</span>
                    <input type="number" step="0.5" id="q_used_casual" value="${emp.used_casual_leaves || 0.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                </div>
              </div>

              <!-- Sick Leaves -->
              <div class="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <label class="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-2">Sick Leaves Inventory</label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Total Allocated</span>
                    <input type="number" step="0.5" id="q_total_sick" value="${emp.total_sick_leaves !== undefined && emp.total_sick_leaves !== null ? emp.total_sick_leaves : 6.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500">Consumed / Used</span>
                    <input type="number" step="0.5" id="q_used_sick" value="${emp.used_sick_leaves || 0.0}" required class="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 shadow-2xs">
                  </div>
                </div>
              </div>

              <div class="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onclick="document.getElementById('leaveQuotaModal').remove()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm">Save Quotas</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      if (window.lucide) lucide.createIcons();
    };

    window.saveEmployeeLeaveQuotas = async function(event, empId) {
      event.preventDefault();
      try {
        const payload = {
          total_paid_leaves: parseFloat(document.getElementById('q_total_paid').value) || 0.0,
          used_paid_leaves: parseFloat(document.getElementById('q_used_paid').value) || 0.0,
          total_casual_leaves: parseFloat(document.getElementById('q_total_casual').value) || 0.0,
          used_casual_leaves: parseFloat(document.getElementById('q_used_casual').value) || 0.0,
          total_sick_leaves: parseFloat(document.getElementById('q_total_sick').value) || 0.0,
          used_sick_leaves: parseFloat(document.getElementById('q_used_sick').value) || 0.0,
        };

        const updated = await apiFetch(`/employees/update-leave-quota/${empId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (state.activeEmployee && String(state.activeEmployee.id) === String(empId)) {
          Object.assign(state.activeEmployee, updated);
        }
        const idx = state.allEmployees.findIndex(e => String(e.id) === String(empId));
        if (idx !== -1) {
          Object.assign(state.allEmployees[idx], updated);
        }

        document.getElementById('leaveQuotaModal')?.remove();
        showToast("Leave inventory quotas updated successfully!", "success");
        renderAdminApp();
      } catch (err) {
        console.error("Failed to update leave quotas:", err);
        showToast("Failed to update leave quotas.", "error");
      }
    };

    // --- ADMIN NOTIFICATION SYSTEM ---
    state.adminNotifications = [];
    state.adminNotifFilter = 'all';

    function getNotifCategory(n) {
      const title = (n.title || '').toLowerCase();
      const msg = (n.message || '').toLowerCase();
      if (title.includes('payment') || title.includes('💰') || msg.includes('payment') || msg.includes('billing') || msg.includes('due on')) {
        return 'payment';
      }
      if (title.includes('risk') || title.includes('delayed') || title.includes('overrun') || msg.includes('at risk') || msg.includes('missing')) {
        return 'risk';
      }
      if (title.includes('leave') || msg.includes('leave request')) {
        return 'leave';
      }
      return 'general';
    }

    window.setAdminNotifFilter = function(filterCategory) {
      state.adminNotifFilter = filterCategory;
      const tabs = ['all', 'payment', 'risk', 'leave'];
      tabs.forEach(t => {
        const btn = document.getElementById(`notif-tab-${t}`);
        if (btn) {
          if (t === filterCategory) {
            btn.className = 'px-2.5 py-1 rounded-lg font-bold bg-white text-brand-primary shadow-2xs border border-slate-200 transition-all cursor-pointer';
          } else {
            btn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-600 hover:bg-white/80 transition-all cursor-pointer';
          }
        }
      });
      window.renderAdminNotificationList();
    };

    window.loadAdminNotifications = async function() {
      try {
        const data = await apiFetch('/attendance/notifications');
        state.adminNotifications = Array.isArray(data) ? data : [];
        
        // Auto-sync pending leave requests from /attendance/leave-requests
        try {
          const leaveData = await apiFetch('/attendance/leave-requests');
          if (Array.isArray(leaveData)) {
            const pendingLeaves = leaveData.filter(l => l.status === 'Pending');
            pendingLeaves.forEach(l => {
              const empName = l.employee_name || l.employee_id || 'Employee';
              const refTitle = `📅 Leave Request: ${empName} [Ref: ${l.id}]`;
              const existingIndex = state.adminNotifications.findIndex(n => (n.title || '').includes(l.id) || (n.title || '').includes(refTitle));
              
              if (existingIndex === -1) {
                state.adminNotifications.push({
                  id: `leave_notif_${l.id}`,
                  title: refTitle,
                  message: `${empName} requested ${l.leave_type || 'Leave'} (${l.total_days || 1.0} d: ${l.start_date} to ${l.end_date}). Reason: ${l.reason}`,
                  is_read: false,
                  is_leave_pending: true,
                  leave_id: l.id,
                  created_at: l.created_at || new Date().toISOString()
                });
              } else {
                state.adminNotifications[existingIndex].is_leave_pending = true;
                state.adminNotifications[existingIndex].leave_id = l.id;
              }
            });
          }
        } catch (e) {
          // Ignore secondary leave list fetch error
        }

        const unreadCount = state.adminNotifications.filter(n => !n.is_read).length;
        const countBadge = document.getElementById('admin-notif-count');
        if (countBadge) {
          if (unreadCount > 0) {
            countBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            countBadge.classList.remove('hidden');
          } else {
            countBadge.classList.add('hidden');
          }
        }

        // Update counts per category
        const counts = { all: state.adminNotifications.length, payment: 0, risk: 0, leave: 0 };
        state.adminNotifications.forEach(n => {
          const cat = getNotifCategory(n);
          if (counts[cat] !== undefined) counts[cat]++;
        });

        ['all', 'payment', 'risk', 'leave'].forEach(c => {
          const el = document.getElementById(`cnt-${c}`);
          if (el) el.innerText = counts[c];
        });

        window.renderAdminNotificationList();
      } catch (err) {
        console.error("Failed to load admin notifications:", err);
      }
    };

    window.renderAdminNotificationList = function() {
      const listContainer = document.getElementById('admin-notif-list');
      if (!listContainer) return;

      const currentFilter = state.adminNotifFilter || 'all';
      let items = [...state.adminNotifications];

      if (currentFilter !== 'all') {
        items = items.filter(n => getNotifCategory(n) === currentFilter);
      } else {
        // Priority Sorting: Payments (1) -> Risks (2) -> Leaves (3) -> General (4)
        const catPriority = { payment: 1, risk: 2, leave: 3, general: 4 };
        items.sort((a, b) => {
          const pA = catPriority[getNotifCategory(a)] || 4;
          const pB = catPriority[getNotifCategory(b)] || 4;
          if (pA !== pB) return pA - pB;
          if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
      }

      if (items.length === 0) {
        listContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs font-medium">
            <i data-lucide="check-circle" class="w-6 h-6 mx-auto mb-2 text-emerald-400"></i>
            No ${currentFilter !== 'all' ? currentFilter : ''} notifications found. You're all caught up!
          </div>
        `;
      } else {
        listContainer.innerHTML = items.map(n => {
          const cat = getNotifCategory(n);
          const isPayment = cat === 'payment';
          const isRisk = cat === 'risk';
          const isLeave = cat === 'leave';
          
          let iconClass = 'bg-indigo-50 text-indigo-600';
          let iconName = 'bell';
          let borderAccent = '';

          if (isPayment) {
            iconClass = 'bg-amber-100 text-amber-700';
            iconName = 'wallet';
            borderAccent = 'border-l-4 border-l-amber-500 bg-amber-50/20';
          } else if (isRisk) {
            iconClass = 'bg-rose-100 text-rose-700';
            iconName = 'alert-triangle';
            borderAccent = 'border-l-4 border-l-rose-500 bg-rose-50/20';
          } else if (isLeave) {
            iconClass = 'bg-purple-100 text-purple-700';
            iconName = 'calendar';
            borderAccent = 'border-l-4 border-l-purple-500 bg-purple-50/10';
          }

          const timeStr = n.created_at ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
          const isReceived = n.is_received || (n.title || '').includes('✓ Received') || (n.message || '').includes('marked as received');
          const isMarkedAdded = n.is_marked_added || (n.title || '').includes('✓ Marked as Added') || (n.message || '').includes('marked as added');
          
          let leaveId = n.leave_id;
          if (!leaveId && n.title) {
            const m = n.title.match(/\[Ref:\s*([^\]]+)\]/);
            if (m) leaveId = m[1].trim();
          }
          const leaveStatus = n.leave_status || (n.is_leave_pending || !n.is_read ? 'Pending' : 'Resolved');

          // Clean title (strip out [Ref: ...])
          const rawTitle = n.title || '';
          const cleanTitle = rawTitle.replace(/\[Ref:\s*[^\]]+\]/gi, '').trim();

          // --- LEAVE NOTIFICATION STRUCTURED PARSER ---
          let leaveContentHtml = '';
          if (isLeave) {
            const msgStr = n.message || '';
            let leaveType = "Casual Leave";
            let durationStr = "1 Day";
            let datesStr = "N/A";
            let backupPerson = "N/A";
            let reasonStr = msgStr;

            if (msgStr.includes('|')) {
              const parts = msgStr.split('|').map(p => p.trim());
              parts.forEach(p => {
                if (p.startsWith('Type:')) leaveType = p.replace('Type:', '').trim();
                else if (p.startsWith('Duration:')) durationStr = p.replace('Duration:', '').trim();
                else if (p.startsWith('Dates:')) datesStr = p.replace('Dates:', '').trim();
                else if (p.startsWith('Backup:')) backupPerson = p.replace('Backup:', '').trim();
                else if (p.startsWith('Reason:')) reasonStr = p.replace('Reason:', '').trim();
              });
            } else {
              const typeMatch = msgStr.match(/requested\s+([^(]+)/i);
              if (typeMatch) leaveType = typeMatch[1].trim();
              const datesMatch = msgStr.match(/\(([^)]+)\)/);
              if (datesMatch) {
                const rawDates = datesMatch[1].trim();
                // Clean dates if contains raw timestamp
                datesStr = rawDates.replace(/\s+00:00:00/g, '');
              }
              const reasonMatch = msgStr.match(/Reason:\s*(.*)/i);
              if (reasonMatch) reasonStr = reasonMatch[1].trim();
            }

            leaveContentHtml = `
              <div class="mt-2 space-y-2 text-xs">
                <!-- 2-Column Key-Value Grid -->
                <div class="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 text-[11px]">
                  <div class="flex items-center gap-1.5 text-slate-700">
                    <span class="font-bold text-slate-400">Type:</span>
                    <span class="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 truncate">${leaveType}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-700">
                    <span class="font-bold text-slate-400">Duration:</span>
                    <span class="font-semibold text-slate-800">${durationStr}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-700 col-span-2 sm:col-span-1">
                    <span class="font-bold text-slate-400">Dates:</span>
                    <span class="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate">${datesStr}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-700 col-span-2 sm:col-span-1">
                    <span class="font-bold text-slate-400">Backup:</span>
                    <span class="font-semibold text-slate-700 truncate">${backupPerson}</span>
                  </div>
                </div>

                <!-- Reason Callout Box -->
                <div class="bg-purple-50/70 border-l-2 border-purple-500 p-2 rounded-r-xl text-[11px] text-slate-700 italic">
                  <span class="font-bold text-purple-900 not-italic">Reason:</span> "${reasonStr}"
                </div>
              </div>
            `;
          }

          // --- PAYMENT NOTIFICATION STRUCTURED PARSER ---
          let paymentContentHtml = '';
          if (isPayment) {
            paymentContentHtml = `
              <div class="mt-2 bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl text-[11px] text-slate-700">
                <p class="font-medium text-slate-800 leading-snug">${n.message}</p>
              </div>
            `;
          }

          // --- RISK NOTIFICATION STRUCTURED PARSER ---
          let riskContentHtml = '';
          if (isRisk) {
            riskContentHtml = `
              <div class="mt-2 bg-rose-50/70 border border-rose-200/80 p-2.5 rounded-xl text-[11px] text-slate-700">
                <p class="font-medium text-slate-800 leading-snug">${n.message}</p>
              </div>
            `;
          }

          return `
            <div class="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${borderAccent} ${!n.is_read ? 'bg-indigo-50/20 font-medium' : 'opacity-95 bg-white'}">
              <div class="w-8 h-8 rounded-xl ${iconClass} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <i data-lucide="${iconName}" class="w-4 h-4"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <h4 class="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                    ${cleanTitle}
                    ${isReceived ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Received</span>` : ''}
                    ${isMarkedAdded ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">✓ Marked as Added</span>` : ''}
                    ${isLeave && leaveStatus === 'Pending' ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">⏳ Action Pending</span>` : ''}
                    ${isLeave && leaveStatus === 'Approved' ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Approved</span>` : ''}
                    ${isLeave && leaveStatus === 'Rejected' ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">✕ Rejected</span>` : ''}
                  </h4>
                  <span class="text-[9px] font-semibold text-slate-400 shrink-0">${timeStr}</span>
                </div>

                ${isLeave ? leaveContentHtml : isPayment ? paymentContentHtml : isRisk ? riskContentHtml : `<p class="text-[11px] text-slate-600 font-medium mt-1 leading-snug">${n.message}</p>`}
                
                <div class="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100/80 pt-2">
                  ${isPayment ? `
                    <div class="flex items-center gap-2">
                      ${!isReceived ? `
                        <button onclick="window.markAdminPaymentReceived('${n.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer">
                          <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Mark as Received
                        </button>
                      ` : `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i data-lucide="check" class="w-3 h-3 mr-1"></i> Payment Received
                        </span>
                      `}
                    </div>
                  ` : isRisk ? `
                    <div class="flex items-center gap-2">
                      ${!isMarkedAdded ? `
                        <button onclick="window.markAdminRiskAsAdded('${n.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer">
                          <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-slate-300"></i> Mark as Added
                        </button>
                      ` : `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <i data-lucide="check" class="w-3 h-3 mr-1 text-slate-500"></i> Marked as Added
                        </span>
                      `}
                    </div>
                  ` : isLeave ? `
                    <div class="flex items-center gap-1.5">
                      ${leaveStatus === 'Pending' && leaveId ? `
                        <button onclick="window.quickUpdateLeaveStatus('${leaveId}', 'Approved', '${n.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer">
                          <i data-lucide="check" class="w-3 h-3"></i> Approve
                        </button>
                        <button onclick="window.quickUpdateLeaveStatus('${leaveId}', 'Rejected', '${n.id}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer">
                          <i data-lucide="x" class="w-3 h-3"></i> Reject
                        </button>
                      ` : ''}
                      <button onclick="window.routeApp('attendance', 'leave'); document.getElementById('admin-notif-dropdown').classList.add('hidden')" class="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                        <i data-lucide="calendar" class="w-3 h-3"></i> Review Details
                      </button>
                    </div>
                  ` : '<span></span>'}

                  ${!n.is_read ? `
                    <button onclick="window.markAdminNotificationRead('${n.id}')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1">
                      <i data-lucide="check" class="w-3 h-3"></i> Mark as read
                    </button>
                  ` : `
                    <span class="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                      <i data-lucide="check-check" class="w-3 h-3 text-slate-400"></i> Read
                    </span>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
      if (window.lucide) lucide.createIcons();
    };

    window.quickUpdateLeaveStatus = async function(leaveId, status, notifId) {
      try {
        await apiFetch(`/attendance/leave-requests/${leaveId}/status`, {
          method: 'PUT',
          body: { status: status }
        });
        showToast(`Leave request ${status.toLowerCase()} successfully!`, "success");
        
        const notif = state.adminNotifications.find(n => n.id === notifId);
        if (notif) {
          notif.is_read = true;
          notif.leave_status = status;
        }
        await window.loadAdminNotifications();
        if (typeof renderAdminApp === 'function') renderAdminApp();
      } catch (err) {
        console.error("Failed to update leave status:", err);
        showToast("Failed to update leave status: " + (err.message || err), "error");
      }
    };

    window.markAdminRiskAsAdded = async function(notifId) {
      try {
        const notif = state.adminNotifications.find(n => n.id === notifId);
        if (notif) {
          notif.is_read = true;
          notif.is_marked_added = true;
        }
        await apiFetch(`/attendance/notifications/${notifId}/read`, { method: 'POST' });
        showToast("Risk notification marked as added. Will re-alert on next check if SRS is still missing.", "info");
        window.renderAdminNotificationList();
        
        // Update unread count badge
        const unreadCount = state.adminNotifications.filter(n => !n.is_read).length;
        const countBadge = document.getElementById('admin-notif-count');
        if (countBadge) {
          if (unreadCount > 0) {
            countBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            countBadge.classList.remove('hidden');
          } else {
            countBadge.classList.add('hidden');
          }
        }
      } catch (err) {
        console.error("Failed to mark risk as added:", err);
        showToast("Failed to mark risk notification.", "error");
      }
    };

    window.markAdminPaymentReceived = async function(notifId) {
      try {
        const notif = state.adminNotifications.find(n => n.id === notifId);
        if (notif) {
          notif.is_read = true;
          notif.is_received = true;
        }
        await apiFetch(`/attendance/notifications/${notifId}/read`, { method: 'POST' });
        
        // Attempt to find & mark matching pending client receivable as received
        try {
          const recs = await apiFetch('/projects/receivables/pending');
          if (Array.isArray(recs) && notif) {
            const target = recs.find(r => notif.message && notif.message.includes(r.item_name));
            if (target) {
              await apiFetch(`/projects/receivables/mark-done/${target.id}`, { method: 'PUT' });
            }
          }
        } catch (e) {
          // Ignore secondary lookup error
        }

        showToast("Payment marked as received!", "success");
        window.renderAdminNotificationList();
        
        // Update unread count badge
        const unreadCount = state.adminNotifications.filter(n => !n.is_read).length;
        const countBadge = document.getElementById('admin-notif-count');
        if (countBadge) {
          if (unreadCount > 0) {
            countBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            countBadge.classList.remove('hidden');
          } else {
            countBadge.classList.add('hidden');
          }
        }
      } catch (err) {
        console.error("Failed to mark payment received:", err);
        showToast("Failed to mark payment as received.", "error");
      }
    };

    window.openNotifProjectTarget = function(title, message) {
      const dropdown = document.getElementById('admin-notif-dropdown');
      if (dropdown) dropdown.classList.add('hidden');

      let targetName = title.replace("Project at Risk:", "").trim();
      const proj = state.allProjects ? state.allProjects.find(p => (p.name && p.name.trim() === targetName) || (p.title && p.title.trim() === targetName)) : null;

      if (proj && typeof window.openProjectDetails === 'function') {
        window.openProjectDetails(proj.id);
      } else {
        window.routeApp('projects');
      }
    };

    window.toggleAdminNotificationPanel = function() {
      const dropdown = document.getElementById('admin-notif-dropdown');
      if (!dropdown) return;
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden')) {
        window.loadAdminNotifications();
      }
    };

    window.markAdminNotificationRead = async function(notifId) {
      try {
        const notif = state.adminNotifications.find(n => n.id === notifId);
        if (notif) notif.is_read = true;
        
        await apiFetch(`/attendance/notifications/${notifId}/read`, { method: 'POST' });
        
        // Update unread count badge
        const unreadCount = state.adminNotifications.filter(n => !n.is_read).length;
        const countBadge = document.getElementById('admin-notif-count');
        if (countBadge) {
          if (unreadCount > 0) {
            countBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            countBadge.classList.remove('hidden');
          } else {
            countBadge.classList.add('hidden');
          }
        }
        window.renderAdminNotificationList();
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    };

    window.markAllAdminNotificationsRead = async function() {
      try {
        state.adminNotifications.forEach(n => { n.is_read = true; });
        await apiFetch('/attendance/notifications/mark-all-read', { method: 'POST' });
        showToast("All notifications marked as read", "success");
        
        const countBadge = document.getElementById('admin-notif-count');
        if (countBadge) countBadge.classList.add('hidden');
        
        window.renderAdminNotificationList();
      } catch (err) {
        console.error("Failed to mark all notifications read:", err);
      }
    };

    // Close notification dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('admin-notif-wrapper');
      const dropdown = document.getElementById('admin-notif-dropdown');
      if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Auto-fetch notifications on initial load & poll every 60s
    setTimeout(() => {
      window.loadAdminNotifications();
      window.checkAndShowClientBillingReminder();
      setInterval(() => window.loadAdminNotifications(), 60000);
    }, 1000);

    // --- CLIENT PAYMENT REMINDER POPUP MECHANISM ---
    window.checkAndShowClientBillingReminder = async function() {
      try {
        if (document.getElementById('clientBillingReminderModal')) return;

        const recs = await apiFetch('/projects/receivables/pending');
        if (!Array.isArray(recs) || recs.length === 0) return;

        // Find the first non-snoozed pending receivable item
        const targetRec = recs.find(r => !sessionStorage.getItem(`snoozed_billing_reminder_${r.id}`));
        if (!targetRec) return;

        window.renderClientBillingReminderModal(targetRec);
      } catch (err) {
        console.error("Failed to fetch pending client receivables for reminder popup:", err);
      }
    };

    window.renderClientBillingReminderModal = function(rec) {
      if (document.getElementById('clientBillingReminderModal')) return;

      const formattedAmount = Number(rec.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const modalHtml = `
        <div id="clientBillingReminderModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative overflow-hidden transform scale-100 transition-all">
            <!-- Top Accent Gradient Line -->
            <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"></div>

            <!-- Modal Header -->
            <div class="flex items-center gap-3 mb-4 pt-1">
              <div class="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                <i data-lucide="bell" class="w-5 h-5 text-amber-600"></i>
              </div>
              <h3 class="text-base font-extrabold text-slate-900 tracking-tight">Client Payment Reminder</h3>
            </div>

            <!-- Content Body -->
            <div class="space-y-4">
              <p class="text-xs text-slate-700 leading-relaxed font-medium">
                The client receivable item <strong class="text-slate-900 font-extrabold">"${rec.item_name || 'Scheduled Billing'}"</strong> with amount <strong class="text-slate-900 font-extrabold">₹${formattedAmount}</strong> is due on <strong class="text-amber-700 font-bold">${rec.due_date || 'Today'}</strong>.
              </p>

              <!-- Callout Subtext Box -->
              <div class="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 text-[11px] text-slate-600 font-medium leading-relaxed">
                Clicking "Yes, Mark Received" will automatically log this payment in the project ledger and update/advance the cycle schedule.
              </div>
            </div>

            <!-- Footer Action Buttons -->
            <div class="mt-6 flex items-center justify-end gap-2.5">
              <button type="button" onclick="window.snoozeClientBillingReminder('${rec.id}')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200/80 cursor-pointer">
                Remind Me Later
              </button>
              <button type="button" onclick="window.confirmClientPaymentReceived('${rec.id}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-200 cursor-pointer flex items-center gap-1.5">
                Yes, Mark Received
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      if (window.lucide) lucide.createIcons();
    };

    window.snoozeClientBillingReminder = function(recId) {
      sessionStorage.setItem(`snoozed_billing_reminder_${recId}`, 'true');
      document.getElementById('clientBillingReminderModal')?.remove();
    };

    window.confirmClientPaymentReceived = async function(recId) {
      try {
        await apiFetch(`/projects/receivables/mark-done/${recId}`, { method: 'PUT' });
        document.getElementById('clientBillingReminderModal')?.remove();
        showToast("Payment logged in ledger & cycle schedule updated!", "success");
        if (typeof window.loadAdminNotifications === 'function') window.loadAdminNotifications();
        if (typeof window.loadDashboardData === 'function') window.loadDashboardData();
        if (typeof renderAdminApp === 'function') renderAdminApp();
      } catch (err) {
        console.error("Failed to mark receivable paid:", err);
        showToast("Failed to process payment receipt.", "error");
      }
    };



