        /**
         * YANA OS - EMPLOYEE PORTAL ENGINE
         */

        const CONFIG = {
            API_BASE_URL: 'https://yana-tech-project-backend-d0sj.onrender.com',
            TOKEN_KEY: 'yana_os_token',
            LOGIN_URL: '../login.html'
        };

        const state = {
            user: null,
            currentView: sessionStorage.getItem('lastEmployeeView') || 'dashboard',
            employeeData: null,
            employeeTasks: [],
            projects: [],
            myAttendance: [], // ADDED FOR ATTENDANCE
            isEditingProfile: false,
            editSkills: [],
            devTechStack: [],
            appShellRendered: false, // ARCHITECTURE FIX: Prevents full-page reloading
            calendarYear: new Date().getFullYear(),
            calendarMonth: new Date().getMonth(),
            activeTimesheetSection: 'milestones',
            milestoneTab: 'active'
        };

        // --- Utilities ---
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            let iconSvg = ''; let bgColor = '';

            if (type === 'error') { bgColor = 'bg-brand-alert'; iconSvg = `<i data-lucide="alert-circle" class="w-5 h-5 text-white"></i>`; }
            else if (type === 'success') { bgColor = 'bg-brand-accent'; iconSvg = `<i data-lucide="check-circle-2" class="w-5 h-5 text-white"></i>`; }
            else { bgColor = 'bg-slate-800'; iconSvg = `<i data-lucide="info" class="w-5 h-5 text-white"></i>`; }

            toast.className = `toast-item toast-enter flex items-center p-4 rounded-lg shadow-lg text-white pointer-events-auto ${bgColor}`;
            toast.innerHTML = `<div class="mr-3">${iconSvg}</div><div class="font-medium text-sm flex-1">${message}</div><button onclick="this.parentElement.remove()" class="ml-4 opacity-80 hover:opacity-100"><i data-lucide="x" class="w-4 h-4"></i></button>`;
            container.appendChild(toast);
            lucide.createIcons();
            setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 4000);
        }

        function parseJwt(token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) { return null; }
        }

        // --- Modals ---
        function openModal(title, content) {
            const m = document.getElementById('globalModal');
            if (m) {
                document.getElementById('modalTitle').innerText = title;
                document.getElementById('modalBody').innerHTML = content;
                m.classList.remove('hidden');
                lucide.createIcons();
            }
        }
        function closeModal() {
            const m = document.getElementById('globalModal');
            if (m) m.classList.add('hidden');
        }

        function customConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false) {
            return new Promise((resolve) => {
                const btnClass = isDanger ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' : 'bg-brand-primary hover:bg-indigo-600 text-white shadow-indigo-500/20';
                const iconStr = isDanger ? '<i data-lucide="alert-triangle" class="w-6 h-6 text-rose-500"></i>' : '<i data-lucide="help-circle" class="w-6 h-6 text-brand-primary"></i>';

                const html = `
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-full ${isDanger ? 'bg-rose-100' : 'bg-indigo-50'} flex items-center justify-center shrink-0">
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

                document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
                    closeModal();
                    resolve(false);
                });
                document.getElementById('confirm-ok-btn').addEventListener('click', () => {
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

                document.getElementById('alert-ok-btn').addEventListener('click', () => {
                    closeModal();
                    resolve(true);
                });
            });
        }

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
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    if (!headers['Content-Type'] && !(options.body instanceof FormData) && typeof options.body !== 'string') {
                        headers['Content-Type'] = 'application/json';
                        if (options.body) options.body = JSON.stringify(options.body);
                    }

                    try {
                        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { ...options, headers });
                        if (response.status === 401) { logout(false); throw new Error("Session expired."); }
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                            let errMsg = "An unexpected error occurred.";
                            if (Array.isArray(data.detail)) {
                                errMsg = data.detail.map(e => `${e.loc.join('.')} - ${e.msg}`).join(', ');
                            } else if (data.detail) {
                                errMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                            } else if (data.error) {
                                errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                            } else if (data.critical_error) {
                                errMsg = typeof data.critical_error === 'string' ? data.critical_error : JSON.stringify(data.critical_error);
                            }
                            throw new Error(errMsg);
                        }
                        return data;
                    } catch (error) {
                        if (error.message === "Failed to fetch") showToast("Unable to connect to the server.", "error");
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
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (!headers['Content-Type'] && !(options.body instanceof FormData) && typeof options.body !== 'string') {
                headers['Content-Type'] = 'application/json';
                if (options.body) options.body = JSON.stringify(options.body);
            }

            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, { ...options, headers });
                if (response.status === 401) { logout(false); throw new Error("Session expired."); }
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    let errMsg = "An unexpected error occurred.";
                    if (Array.isArray(data.detail)) {
                        errMsg = data.detail.map(e => `${e.loc.join('.')} - ${e.msg}`).join(', ');
                    } else if (data.detail) {
                        errMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                    } else if (data.error) {
                        errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                    } else if (data.critical_error) {
                        errMsg = typeof data.critical_error === 'string' ? data.critical_error : JSON.stringify(data.critical_error);
                    }
                    throw new Error(errMsg);
                }
                return data;
            } catch (error) {
                if (error.message === "Failed to fetch") showToast("Unable to connect to the server.", "error");
                throw error;
            }
        }

        async function logout(showNotification = true) {
            localStorage.removeItem(CONFIG.TOKEN_KEY);
            if (showNotification) await customAlert("Logged Out", "Logged out successfully");
            window.location.href = CONFIG.LOGIN_URL;
        }

        // --- Data Loaders ---
        async function loadEmployeeWorkspaceData() {
            try {
                const [projects, tasks, profile, attendance, leaveRequests, allEmployees, holidays, backupCoverages, milestones] = await Promise.all([
                    apiFetch(`/projects/employee/${state.user.id}`).catch(() => []),
                    apiFetch(`/tasks/get_by_employee/${state.user.id}`).catch(() => []),
                    apiFetch(`/employees/get/${state.user.id}`).catch(() => ({})),
                    apiFetch(`/attendance/me`).catch(() => []),
                    apiFetch(`/attendance/leave-requests/me`).catch(() => []),
                    apiFetch(`/employees/all`).catch(() => []),
                    apiFetch(`/attendance/holidays`).catch(() => []),
                    apiFetch(`/attendance/leave-requests/backup-coverages`).catch(() => []),
                    apiFetch(`/projects/timeline/employee/${state.user.id}`).catch(() => [])
                ]);

                state.projects = Array.isArray(projects) ? projects : [];
                state.employeeTasks = Array.isArray(tasks) ? tasks : [];
                state.employeeData = profile && !profile.error ? profile : {};
                state.myAttendance = Array.isArray(attendance) ? attendance : [];
                state.myLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
                state.allEmployees = Array.isArray(allEmployees) ? allEmployees : [];
                state.holidays = Array.isArray(holidays) ? holidays : [];
                state.backupCoverages = Array.isArray(backupCoverages) ? backupCoverages : [];
                state.myMilestones = Array.isArray(milestones) ? milestones : [];

                // Fetch timelines for all assigned projects
                state.projectTimelines = {};
                if (state.projects.length > 0) {
                    const timelinePromises = state.projects.map(p =>
                        apiFetch(`/projects/timeline/${p.id}`).catch(() => [])
                    );
                    const timelines = await Promise.all(timelinePromises);
                    state.projects.forEach((p, index) => {
                        state.projectTimelines[p.id] = timelines[index];
                    });
                }
                // Calculate notifications after loading all workspace data
                window.calculateNotifications();
            } catch (error) {
                showToast("Failed to load workspace data: " + error.message, "error");
            }
        }
        // --- Routing Engine ---
        async function routeApp(view = null) {
            if (view) {
                state.currentView = view;
                sessionStorage.setItem('lastEmployeeView', view); // Save View

                // Close mobile sidebar on navigation
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 768) {
                    toggleMobileSidebar();
                }
            }

            const appDiv = document.getElementById('app');

            if (!state.employeeData) {
                appDiv.innerHTML = `
                    <div class="h-full w-full flex items-center justify-center bg-slate-50">
                        <div class="flex flex-col items-center">
                            <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary mb-4"></i>
                            <p class="text-slate-500 font-medium">Loading Workspace...</p>
                        </div>
                    </div>
                `;
                lucide.createIcons();
                await loadEmployeeWorkspaceData();
            }
            renderEmployeeApp();
        }

        // --- UI Rendering ---
        function renderEmployeeApp() {
            const appDiv = document.getElementById('app');

            let contentHtml = '';
            if (state.currentView === 'dashboard') contentHtml = getEmployeeDashboardTemplate();
            else if (state.currentView === 'log-dev') contentHtml = getDevTaskFormTemplate();
            else if (state.currentView === 'log-content') contentHtml = getContentTaskFormTemplate();
            else if (state.currentView === 'profile') contentHtml = getEmployeeProfileTemplate();
            else if (state.currentView === 'leave-requests') contentHtml = getEmployeeLeaveRequestsTemplate(); // ADDED
            else if (state.currentView === 'timesheets') contentHtml = getEmployeeTimesheetsTemplate();
            else if (state.currentView === 'projects-milestones') contentHtml = getProjectsMilestonesTemplate();

            if (!state.appShellRendered) {
                const sidebarClass = localStorage.getItem('yanaSidebarCollapsed') === 'true' ? 'sidebar-collapsed' : '';
                appDiv.innerHTML = `
                    <div class="flex h-full w-full bg-slate-50 overflow-hidden relative">
                        <!-- Mobile Sidebar Overlay -->
                        <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden opacity-0 transition-opacity duration-300" onclick="toggleMobileSidebar()"></div>
                        
                        <!-- Sidebar -->
                        <aside id="main-sidebar" class="w-64 bg-brand-dark text-slate-300 flex flex-col shrink-0 transition-transform duration-300 z-50 fixed md:relative h-full -translate-x-full md:translate-x-0 ${sidebarClass}">
                            <div class="h-16 flex items-center px-6 bg-slate-900 border-b border-slate-800 shrink-0">
                                <div class="w-8 h-8 bg-brand-primary rounded-md flex items-center justify-center mr-3 shadow-lg">
                                    <i data-lucide="layers" class="text-white w-5 h-5"></i>
                                </div>
                                <span class="font-bold text-white text-lg tracking-tight">Yana OS</span>
                            </div>
                            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto" id="sidebar-nav">
                                <button onclick="routeApp('dashboard')" data-view="dashboard" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="layout-dashboard" class="w-5 h-5 mr-3 flex-shrink-0"></i> <span class="font-medium text-sm truncate">Dashboard</span>
                                </button>
                                <button onclick="routeApp('profile')" data-view="profile" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="user" class="w-5 h-5 mr-3 flex-shrink-0"></i> <span class="font-medium text-sm truncate">My Profile</span>
                                </button>
                                <button onclick="routeApp('leave-requests')" data-view="leave-requests" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="calendar" class="w-5 h-5 mr-3 flex-shrink-0"></i> <span class="font-medium text-sm truncate">Leave Requests</span>
                                </button>
                                <button onclick="routeApp('projects-milestones')" data-view="projects-milestones" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="folder-kanban" class="w-5 h-5 mr-3 flex-shrink-0"></i> <span class="font-medium text-sm truncate" title="Projects & Milestones">Projects & Milestones</span>
                                </button>
                                <button onclick="routeApp('timesheets')" data-view="timesheets" class="nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all">
                                    <i data-lucide="clock" class="w-5 h-5 mr-3 flex-shrink-0"></i> <span class="font-medium text-sm truncate">Timesheets</span>
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
                            <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 z-50 shadow-sm relative">
                                <div class="flex items-center gap-3">
                                    <button onclick="toggleMobileSidebar()" class="text-slate-500 hover:text-brand-primary transition-colors focus:outline-none">
                                        <i data-lucide="menu" class="w-6 h-6"></i>
                                    </button>
                                    <h2 id="header-title" class="text-xl font-bold text-slate-800 tracking-tight capitalize">${state.currentView.replace('-', ' ')}</h2>
                                </div>
                                <div class="flex items-center gap-4">
                                    <!-- Notification Center Bell -->
                                    <div class="relative" id="notification-center">
                                        <button onclick="window.toggleNotificationDropdown(event)" class="relative p-2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors rounded-full hover:bg-slate-100 flex items-center justify-center">
                                            <i data-lucide="bell" class="w-5 h-5"></i>
                                            <span id="notif-badge" class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white hidden"></span>
                                        </button>
                                        <!-- Dropdown Menu -->
                                        <div id="notif-dropdown" class="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 hidden flex flex-col overflow-hidden max-h-96">
                                            <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                                                <h4 class="font-bold text-slate-800 text-sm">Notifications</h4>
                                                <div class="flex items-center gap-2">
                                                    <button onclick="window.markAllNotificationsRead(event)" class="text-[10px] text-brand-primary hover:text-indigo-600 font-bold uppercase tracking-wider focus:outline-none">Mark all read</button>
                                                    <span id="notif-count" class="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">0 new</span>
                                                </div>
                                            </div>
                                            <div id="notif-list" class="overflow-y-auto flex-1 divide-y divide-slate-100">
                                                <!-- Populated dynamically -->
                                            </div>
                                        </div>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-brand-primary flex items-center justify-center font-bold shadow-sm">
                                        ${state.user.sub.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="font-medium text-slate-700 hidden sm:inline-block">${state.user.sub}</span>
                                </div>
                            </header>
                            
                            <main class="flex-1 overflow-y-auto p-4 md:p-8" id="main-scroll-area">
                                <div id="dynamic-content-area" class="max-w-5xl mx-auto transition-opacity duration-150">
                                    ${contentHtml}
                                </div>
                            </main>
                        </div>
                    </div>
                `;
                state.appShellRendered = true;
                window.calculateNotifications();
                if (window.initTaskForm) window.initTaskForm();
                if (window.startElapsedTimer) window.startElapsedTimer();
                if (state.currentView === 'profile') {
                    window.startProfileUnlockTimer();
                } else {
                    if (window.profileTimerInterval) clearInterval(window.profileTimerInterval);
                }
                return;
            } else {
                // Shell exists, gently fade and swap the content only
                const dynamicArea = document.getElementById('dynamic-content-area');
                if (dynamicArea) {
                    dynamicArea.style.opacity = '0';
                    setTimeout(() => {
                        dynamicArea.innerHTML = contentHtml;
                        dynamicArea.style.opacity = '1';

                        document.getElementById('header-title').innerText = state.currentView.replace('-', ' ');

                        document.querySelectorAll('.nav-btn').forEach(btn => {
                            if (btn.getAttribute('data-view') === state.currentView) {
                                btn.className = "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all bg-brand-primary text-white shadow-md";
                            } else {
                                btn.className = "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white text-slate-300";
                            }
                        });

                        if (window.lucide) lucide.createIcons();
                        window.calculateNotifications();
                        if (window.initTaskForm) window.initTaskForm();
                        if (window.startElapsedTimer) window.startElapsedTimer();
                        if (state.currentView === 'profile') {
                            window.startProfileUnlockTimer();
                        } else {
                            if (window.profileTimerInterval) clearInterval(window.profileTimerInterval);
                        }
                    }, 150);
                    return;
                }
            }

            document.querySelectorAll('.nav-btn').forEach(btn => {
                if (btn.getAttribute('data-view') === state.currentView) {
                    btn.className = "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all bg-brand-primary text-white shadow-md";
                } else {
                    btn.className = "nav-btn w-full flex items-center px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white text-slate-300";
                }
            });

            if (window.lucide) lucide.createIcons();
            window.calculateNotifications();
            if (window.initTaskForm) window.initTaskForm();
            if (window.startElapsedTimer) window.startElapsedTimer();
            if (state.currentView === 'profile') {
                window.startProfileUnlockTimer();
            } else {
                if (window.profileTimerInterval) clearInterval(window.profileTimerInterval);
            }
        }

        // --- View Templates ---
        

        window.switchMilestoneTab = function(tab) {
            state.milestoneTab = tab;
            routeApp();
        };

        window.changeCalendarMonth = function (offset) {
            state.calendarMonth += offset;
            if (state.calendarMonth < 0) {
                state.calendarMonth = 11;
                state.calendarYear -= 1;
            } else if (state.calendarMonth > 11) {
                state.calendarMonth = 0;
                state.calendarYear += 1;
            }
            renderEmployeeApp();
        };

        function getCalendarHtml() {
            const year = state.calendarYear || new Date().getFullYear();
            const month = (state.calendarMonth !== undefined) ? state.calendarMonth : new Date().getMonth();

            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const firstDayOfMonth = new Date(year, month, 1);
            const startDayOfWeek = firstDayOfMonth.getDay();
            const numDaysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthNumDays = new Date(year, month, 0).getDate();

            // Pre-process holidays
            const holidayMap = {};
            (state.holidays || []).forEach(h => {
                const hDate = h.date.split(' ')[0];
                holidayMap[hDate] = h;
            });

            // Pre-process attendance
            const attendanceMap = {};
            (state.myAttendance || []).forEach(a => {
                const aDate = a.date ? a.date.split(' ')[0] : (a.check_in_time ? a.check_in_time.split(' ')[0] : '');
                if (!aDate) return;
                
                const current = attendanceMap[aDate];
                if (!current) {
                    attendanceMap[aDate] = a;
                } else {
                    const priority = { 'Present': 4, 'Late': 3, 'Half-Day': 2, 'Absent': 1, 'Checked Out': 4 };
                    const curPriority = priority[current.status] || 0;
                    const newPriority = priority[a.status] || 0;
                    if (newPriority > curPriority) {
                        attendanceMap[aDate] = a;
                    }
                }
            });

            const cells = [];
            // Previous month padding
            for (let i = startDayOfWeek - 1; i >= 0; i--) {
                const d = prevMonthNumDays - i;
                const m = month === 0 ? 11 : month - 1;
                const y = month === 0 ? year - 1 : year;
                const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                cells.push({ dayNumber: d, isCurrentMonth: false, dateStr });
            }

            // Current month days
            for (let d = 1; d <= numDaysInMonth; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                cells.push({ dayNumber: d, isCurrentMonth: true, dateStr });
            }

            // Next month padding
            const totalCells = Math.ceil(cells.length / 7) * 7;
            const nextMonthPadding = totalCells - cells.length;
            for (let d = 1; d <= nextMonthPadding; d++) {
                const m = month === 11 ? 0 : month + 1;
                const y = month === 11 ? year + 1 : year;
                const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                cells.push({ dayNumber: d, isCurrentMonth: false, dateStr });
            }

            const stats = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, holidays: 0 };

            const localTodayStr = new Date().toLocaleDateString('sv-SE');

            const cellsHtml = cells.map(cell => {
                let cellStatus = 'None';
                let cellDetails = '';
                let colorClass = 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200';
                let dotClass = 'hidden';

                // Lookups
                const holiday = holidayMap[cell.dateStr];
                const leave = (state.myLeaveRequests || []).find(r => 
                    r.status === 'Approved' && 
                    cell.dateStr >= r.start_date.split(' ')[0] && 
                    cell.dateStr <= r.end_date.split(' ')[0]
                );
                const att = attendanceMap[cell.dateStr];

                const dayOfWeek = new Date(cell.dateStr).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Resolve Status and Colors
                if (att && att.status !== 'Absent') {
                    // Worked
                    const inTime = att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                    const outTime = att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
                    const hrsStr = att.total_hours ? ` (${(h => {
                        const tm = Math.round(h * 60);
                        const hrs = Math.floor(tm / 60);
                        const mins = tm % 60;
                        return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
                    })(att.total_hours)})` : '';

                    if (att.status === 'Present' || att.status === 'Checked Out' || att.status === 'Checked In') {
                        cellStatus = 'Present';
                        colorClass = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200';
                        dotClass = 'bg-emerald-500';
                        cellDetails = `Checked In: ${inTime} &bull; Out: ${outTime}${hrsStr}`;
                        if (cell.isCurrentMonth) stats.present++;
                    } else if (att.status === 'Late') {
                        cellStatus = 'Late';
                        colorClass = 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200';
                        dotClass = 'bg-amber-500';
                        cellDetails = `Late check-in &bull; Checked In: ${inTime} &bull; Out: ${outTime}${hrsStr}`;
                        if (cell.isCurrentMonth) stats.late++;
                    } else if (att.status === 'Half-Day') {
                        cellStatus = 'Half-Day';
                        colorClass = 'bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200';
                        dotClass = 'bg-violet-500';
                        cellDetails = `Half-Day &bull; Checked In: ${inTime} &bull; Out: ${outTime}${hrsStr}`;
                        if (cell.isCurrentMonth) stats.halfDay++;
                    } else {
                        cellStatus = 'Present';
                        colorClass = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200';
                        dotClass = 'bg-emerald-500';
                        cellDetails = `Checked In: ${inTime} &bull; Out: ${outTime}${hrsStr}`;
                        if (cell.isCurrentMonth) stats.present++;
                    }
                } else if (leave) {
                    cellStatus = 'On Leave';
                    colorClass = 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200';
                    dotClass = 'bg-sky-500';
                    cellDetails = `Approved Leave: ${leave.reason} (${leave.leave_type})`;
                    if (cell.isCurrentMonth) stats.onLeave++;
                } else if (holiday) {
                    if (holiday.holiday_type === 'Public') {
                        cellStatus = 'Public Holiday';
                        colorClass = 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200';
                        dotClass = 'bg-cyan-500';
                    } else {
                        cellStatus = 'Company Holiday';
                        colorClass = 'bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
                        dotClass = 'bg-fuchsia-500';
                    }
                    cellDetails = `${cellStatus}: ${holiday.name}`;
                    if (cell.isCurrentMonth) stats.holidays++;
                } else if (att && att.status === 'Absent') {
                    cellStatus = 'Absent';
                    colorClass = 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200';
                    dotClass = 'bg-rose-500';
                    cellDetails = `Absent &bull; ${att.notes || 'Auto-recorded absent'}`;
                    if (cell.isCurrentMonth) stats.absent++;
                } else if (isWeekend) {
                    cellStatus = 'Weekend';
                    colorClass = 'bg-slate-50 text-slate-400 border-slate-100';
                    cellDetails = 'Weekend Rest Day';
                } else if (cell.dateStr < localTodayStr) {
                    cellStatus = 'Absent';
                    colorClass = 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200';
                    dotClass = 'bg-rose-500';
                    cellDetails = 'Absent (No check-in detected)';
                    if (cell.isCurrentMonth) stats.absent++;
                } else {
                    cellStatus = 'Scheduled';
                    colorClass = 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200';
                    cellDetails = 'No attendance logged yet';
                }

                let opacityClass = '';
                if (!cell.isCurrentMonth) {
                    opacityClass = 'opacity-40 pointer-events-none';
                }

                return `
                    <div class="relative group cursor-pointer ${opacityClass}">
                        <div class="h-14 sm:h-16 flex flex-col justify-between p-2 rounded-xl border ${colorClass} transition-all duration-150 shadow-sm">
                            <span class="text-xs font-black">${cell.dayNumber}</span>
                            <div class="flex justify-end">
                                <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
                            </div>
                        </div>
                        
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 text-center text-wrap">
                            <div class="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1">${new Date(cell.dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div class="font-semibold mb-0.5 text-indigo-400">${cellStatus}</div>
                            <div class="text-slate-400 font-medium leading-tight">${cellDetails}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible p-5 md:p-6 mb-8">
                    <div class="flex flex-col lg:flex-row gap-6 md:gap-8">
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <h4 class="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                                        ${monthNames[month]} ${year}
                                    </h4>
                                    <p class="text-xs text-slate-500 font-medium mt-0.5">Your monthly attendance overview</p>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button onclick="window.changeCalendarMonth(-1)" class="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-colors shadow-sm focus:outline-none">
                                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.changeCalendarMonth(1)" class="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-colors shadow-sm focus:outline-none">
                                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>
                            
                            <div class="grid grid-cols-7 gap-2">
                                ${cellsHtml}
                            </div>
                        </div>
                        
                        <div class="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 flex flex-col justify-between">
                            <div>
                                <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Month Summary</h5>
                                <div class="grid grid-cols-2 gap-2 mb-4">
                                    <div class="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 text-center">
                                        <span class="block text-[10px] font-bold text-emerald-600">Present</span>
                                        <span class="text-base font-bold text-emerald-800">${stats.present}</span>
                                    </div>
                                    <div class="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 text-center">
                                        <span class="block text-[10px] font-bold text-amber-600">Late</span>
                                        <span class="text-base font-bold text-amber-800">${stats.late}</span>
                                    </div>
                                    <div class="bg-violet-50/50 border border-violet-100 rounded-xl p-2.5 text-center">
                                        <span class="block text-[10px] font-bold text-violet-600">Half-Day</span>
                                        <span class="text-base font-bold text-violet-800">${stats.halfDay}</span>
                                    </div>
                                    <div class="bg-rose-50/50 border border-rose-100 rounded-xl p-2.5 text-center">
                                        <span class="block text-[10px] font-bold text-rose-600">Absent</span>
                                        <span class="text-base font-bold text-rose-800">${stats.absent}</span>
                                    </div>
                                    <div class="bg-sky-50/50 border border-sky-100 rounded-xl p-2.5 text-center col-span-2">
                                        <div class="flex justify-between items-center px-2">
                                            <span class="text-[10px] font-bold text-sky-600">Leaves & Holidays</span>
                                            <span class="text-sm font-bold text-sky-800">${stats.onLeave} L &bull; ${stats.holidays} H</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="border-t border-slate-100 pt-4">
                                <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Legend</span>
                                <div class="grid grid-cols-2 lg:grid-cols-1 gap-2 text-[11px] font-medium text-slate-600">
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200 inline-block shrink-0"></span>
                                        <span>Present</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block shrink-0"></span>
                                        <span>Late Check-In</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-violet-50 border border-violet-200 inline-block shrink-0"></span>
                                        <span>Half-Day</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200 inline-block shrink-0"></span>
                                        <span>Absent</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-sky-50 border border-sky-200 inline-block shrink-0"></span>
                                        <span>Approved Leave</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-2.5 h-2.5 rounded bg-cyan-50 border border-cyan-200 inline-block shrink-0"></span>
                                        <span>Public Holiday</span>
                                    </div>
                                    <div class="flex items-center gap-2 col-span-2 lg:col-span-1">
                                        <span class="w-2.5 h-2.5 rounded bg-fuchsia-50 border border-fuchsia-200 inline-block shrink-0"></span>
                                        <span>Company Holiday</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        window.getHourOptions = function() {
            let optionsHtml = '';
            for (let h = 0.5; h <= 24; h += 0.5) {
                const whole = Math.floor(h);
                const mins = (h % 1) === 0 ? '00' : '30';
                const label = `${whole}:${mins}`;
                optionsHtml += `<option value="${h}">${label}</option>`;
            }
            return optionsHtml;
        };

        window.initSearchableSelect = function(container, type) {
            const optionsList = container.querySelector('.options-list');
            const projects = (state.projects || []).filter(p => type === 'All' ? true : p.project_type === type || p.project_type === 'Both');
            
            let html = `
                <div class="option-item px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer font-medium transition-colors" data-value="" onclick="window.selectSearchableOption(this, '', '-- General / No Project --')">
                    -- General / No Project --
                </div>
            `;
            
            projects.forEach(p => {
                const clientName = p.client || 'N/A';
                const department = p.team || 'N/A';
                const label = `${p.name} - ${clientName} - ${department}`;
                html += `
                    <div class="option-item px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer font-medium transition-colors" data-value="${p.id}" onclick="window.selectSearchableOption(this, '${p.id}', '${label.replace(/'/g, "\\'")}')">
                        <span class="block font-semibold text-slate-800">${p.name}</span>
                        <span class="block text-[11px] text-slate-500">${clientName} &bull; ${department}</span>
                    </div>
                `;
            });
            
            optionsList.innerHTML = html;
        };

        window.toggleSearchableSelect = function(button) {
            const container = button.closest('.project-searchable-select-container');
            const dropdown = container.querySelector('.select-dropdown');
            
            document.querySelectorAll('.select-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.add('hidden');
            });
            
            dropdown.classList.toggle('hidden');
            
            if (!dropdown.classList.contains('hidden')) {
                const searchInput = dropdown.querySelector('.select-search-input');
                searchInput.value = '';
                searchInput.focus();
                window.filterSearchableSelect(searchInput);
            }
        };

        window.filterSearchableSelect = function(input) {
            const query = input.value.toLowerCase().trim();
            const dropdown = input.closest('.select-dropdown');
            const items = dropdown.querySelectorAll('.option-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        };

        window.generateTicketId = function(projectName) {
            let prefix = "YAN";
            if (projectName && projectName !== "-- General / No Project --") {
                let cleaned = projectName.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
                let words = cleaned.split(/\s+/);
                if (words.length >= 3) {
                    prefix = (words[0][0] || '') + (words[1][0] || '') + (words[2][0] || '');
                } else if (words.length === 2) {
                    prefix = (words[0].substring(0, 2) || '') + (words[1][0] || '');
                } else if (words.length === 1 && words[0].length > 0) {
                    prefix = words[0].substring(0, 3);
                }
            }
            prefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (prefix.length < 2) {
                prefix = "YAN";
            }
            const num = Math.floor(1000 + Math.random() * 9000);
            return `${prefix}-${num}`;
        };

        window.autoGenerateTicketForOption = function(container, projectName) {
            const ticketInput = container.querySelector('.col-ticket');
            if (!ticketInput) return;

            const currentVal = ticketInput.value.trim();
            const isAutoOrEmpty = !currentVal || 
                                  currentVal.toUpperCase() === 'N/A' || 
                                  /^[A-Z0-9]{2,4}-\d{4}$/i.test(currentVal);

            if (isAutoOrEmpty) {
                ticketInput.value = window.generateTicketId(projectName);
            }
        };

        window.getAlreadyLoggedHoursToday = function() {
            const localTodayStr = new Date().toLocaleDateString('sv-SE');
            let logged = 0.0;
            if (state.employeeTasks && Array.isArray(state.employeeTasks)) {
                state.employeeTasks.forEach(t => {
                    const taskDate = t.date ? t.date.split(' ')[0].split('T')[0] : (t.created_at ? t.created_at.split(' ')[0].split('T')[0] : '');
                    if (taskDate === localTodayStr) {
                        logged += parseFloat(t.hours_logged) || 0.0;
                    }
                });
            }
            return logged;
        };

        window.selectSearchableOption = function(item, value, label) {
            const container = item.closest('.project-searchable-select-container');
            const hiddenInput = container.querySelector('.col-project');
            const selectedText = container.querySelector('.selected-text');
            const dropdown = container.querySelector('.select-dropdown');
            
            hiddenInput.value = value;
            selectedText.textContent = label;
            dropdown.classList.add('hidden');
            
            hiddenInput.dispatchEvent(new Event('change'));
            
            const taskItem = container.closest('.dev-task-item') || container.closest('.con-task-item');
            const reasonContainer = taskItem.querySelector('.no-project-reason-container');
            const reasonInput = taskItem.querySelector('.col-no-project-reason');
            if (value === "") {
                reasonContainer.classList.remove('hidden');
                reasonInput.setAttribute('required', 'required');
                reasonInput.value = "";
            } else {
                reasonContainer.classList.add('hidden');
                reasonInput.removeAttribute('required');
                reasonInput.value = 'N/A';
            }

            // Auto-generate ticket ID on project change
            const projectName = value === "" ? "" : label.split(' - ')[0].trim();
            window.autoGenerateTicketForOption(taskItem, projectName);
        };

        // Click off to close searchable select
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.project-searchable-select-container')) {
                document.querySelectorAll('.select-dropdown').forEach(d => d.classList.add('hidden'));
            }
        });

        window.loadProjectTechStack = function(row, projectId) {
            const tagsContainer = row.querySelector('.tech-tags-container');
            if (!tagsContainer) return;
            const hiddenInput = row.querySelector('.col-tech');
            
            tagsContainer.innerHTML = '';
            
            const project = (state.projects || []).find(p => p.id === projectId);
            let lockedTags = [];
            if (project && project.tech_stack && project.tech_stack !== 'N/A') {
                lockedTags = project.tech_stack.split(',').map(t => t.trim()).filter(Boolean);
            }
            
            tagsContainer.setAttribute('data-locked-tags', lockedTags.join(','));
            tagsContainer.setAttribute('data-custom-tags', '');
            
            lockedTags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300 shadow-sm mr-1 mb-1';
                span.innerHTML = `<i data-lucide="lock" class="w-3 h-3 mr-1"></i> ${tag}`;
                tagsContainer.appendChild(span);
            });
            
            window.updateCombinedTechStack(row);
            if (window.lucide) lucide.createIcons();
        };

        window.handleTechTagInput = function(event, inputEl) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                window.addCustomTechTag(inputEl);
            }
        };

        window.addCustomTechTagFromBtn = function(btnEl) {
            const row = btnEl.closest('.dev-task-item') || btnEl.closest('.con-task-item');
            const inputEl = row.querySelector('.col-tech-input');
            window.addCustomTechTag(inputEl);
        };

        window.addCustomTechTag = function(inputEl) {
            const row = inputEl.closest('.dev-task-item') || inputEl.closest('.con-task-item');
            const tagsContainer = row.querySelector('.tech-tags-container');
            const tagVal = inputEl.value.trim().replace(/,/g, '');
            if (!tagVal) return;
            
            const lockedTagsStr = tagsContainer.getAttribute('data-locked-tags') || '';
            const customTagsStr = tagsContainer.getAttribute('data-custom-tags') || '';
            
            const lockedTags = lockedTagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            const customTags = customTagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            
            const tagLower = tagVal.toLowerCase();
            
            if (lockedTags.includes(tagLower) || customTags.includes(tagLower)) {
                showToast(`Tag "${tagVal}" already exists.`, 'error');
                inputEl.value = '';
                return;
            }
            
            const totalCount = lockedTags.length + customTags.length;
            if (totalCount >= 15) {
                showToast('You can add a maximum of 15 tags.', 'error');
                return;
            }
            
            const span = document.createElement('span');
            span.className = 'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm mr-1 mb-1 transition-all';
            span.innerHTML = `
                ${tagVal}
                <button type="button" class="ml-1.5 hover:text-rose-500 focus:outline-none flex items-center justify-center" onclick="window.removeCustomTechTag(this, '${tagVal}')">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            `;
            tagsContainer.appendChild(span);
            
            const newCustomTags = customTagsStr ? `${customTagsStr},${tagVal}` : tagVal;
            tagsContainer.setAttribute('data-custom-tags', newCustomTags);
            
            inputEl.value = '';
            window.updateCombinedTechStack(row);
            if (window.lucide) lucide.createIcons();
        };

        window.techDropdownAddTag = function(selectEl) {
            const val = selectEl.value;
            if (!val) return;
            const row = selectEl.closest('.dev-task-item') || selectEl.closest('.con-task-item');
            if (val === '__custom__') {
                const customTag = prompt("Enter custom technology:");
                if (customTag && customTag.trim()) {
                    const fakeInput = {
                        value: customTag.trim(),
                        closest: () => row
                    };
                    window.addCustomTechTag(fakeInput);
                }
            } else {
                const fakeInput = {
                    value: val,
                    closest: () => row
                };
                window.addCustomTechTag(fakeInput);
            }
            selectEl.value = '';
        };

        window.removeCustomTechTag = function(btnEl, tagVal) {
            const row = btnEl.closest('.dev-task-item') || btnEl.closest('.con-task-item');
            const tagsContainer = row.querySelector('.tech-tags-container');
            const customTagsStr = tagsContainer.getAttribute('data-custom-tags') || '';
            
            let customTags = customTagsStr.split(',').map(t => t.trim()).filter(Boolean);
            customTags = customTags.filter(t => t.toLowerCase() !== tagVal.toLowerCase());
            
            tagsContainer.setAttribute('data-custom-tags', customTags.join(','));
            btnEl.parentElement.remove();
            
            window.updateCombinedTechStack(row);
        };

        window.updateCombinedTechStack = function(row) {
            const tagsContainer = row.querySelector('.tech-tags-container');
            const hiddenInput = row.querySelector('.col-tech');
            if (!hiddenInput) return;
            
            const lockedTagsStr = tagsContainer.getAttribute('data-locked-tags') || '';
            const customTagsStr = tagsContainer.getAttribute('data-custom-tags') || '';
            
            const allTags = [];
            if (lockedTagsStr) allTags.push(...lockedTagsStr.split(','));
            if (customTagsStr) allTags.push(...customTagsStr.split(','));
            
            hiddenInput.value = allTags.length > 0 ? allTags.join(',') : 'N/A';
        };

        window.insertTaskTemplate = function(btn, templateType) {
            const row = btn.closest('.dev-task-item') || btn.closest('.con-task-item');
            const textarea = row.querySelector('.col-task');
            let templateText = "";
            switch(templateType) {
                case 'API Development':
                    templateText = "### API Development\n- Developed endpoint for: \n- Integrated with database table: \n- Validated input parameters: \n- Ran unit tests: ";
                    break;
                case 'Bug Fixing':
                    templateText = "### Bug Fixing\n- Identified root cause of: \n- Fixed line in file: \n- Verified fix under scenario: ";
                    break;
                case 'UI Improvements':
                    templateText = "### UI Improvements\n- Enhanced layout for: \n- Adjusted styles for premium feel: \n- Verified responsive design: ";
                    break;
                case 'Deployment':
                    templateText = "### Deployment\n- Deployed to environment: \n- Run database migrations: \n- Verified post-deployment health check: ";
                    break;
                case 'Client Meeting':
                    templateText = "### Client Meeting\n- Discussed requirements for: \n- Action items agreed: \n- Next follow-up: ";
                    break;
                case 'Research & Development':
                    templateText = "### Research & Development\n- Researched topic: \n- Key findings: \n- Proposed prototype architecture: ";
                    break;
                case 'Server Maintenance':
                    templateText = "### Server Maintenance\n- Maintained services: \n- Checked logs for errors: \n- Optimized database or server resource usage: ";
                    break;
                case 'Scripting & Storyboarding':
                    templateText = "### Scripting & Storyboarding\n- Concept/Hook: \n- Target Duration: \n- Script Outline: ";
                    break;
                case 'Recording / Filming':
                    templateText = "### Recording / Filming\n- Video Style: \n- Equipment used: \n- Shot list details: ";
                    break;
                case 'Video Editing & Post-Production':
                    templateText = "### Video Editing & Post-Production\n- Visual style & cuts: \n- Color grading/effects: \n- Subtitles & captioning: ";
                    break;
                case 'Graphic Poster Design':
                    templateText = "### Graphic Poster Design\n- Design concept & assets: \n- Typography used: \n- Call to action: ";
                    break;
                case 'Voiceover & Audio Sync':
                    templateText = "### Voiceover & Audio Sync\n- Script narration details: \n- Sound effects / music sync: \n- Audio quality adjustments: ";
                    break;
                case 'Social Media Performance Analytics':
                    templateText = "### Social Media Performance Analytics\n- Platforms evaluated: \n- Views/Engagement metrics: \n- Insights & recommendations: ";
                    break;
            }
            textarea.value = templateText;
            window.autoExpandTextarea(textarea);
            window.updateCharCounter(textarea);
        };

        window.handleMetaDropdownSelect = function(selectEl, field) {
            const relativeDiv = selectEl.closest('.relative');
            const parentDiv = relativeDiv.parentElement;
            const inputEl = parentDiv.querySelector(`.col-${field}`);
            const selectArrow = relativeDiv.querySelector('.select-arrow');
            if (selectEl.value === 'Other') {
                inputEl.classList.remove('hidden');
                inputEl.value = '';
                inputEl.focus();
                if (selectArrow) selectArrow.classList.add('hidden');
            } else {
                inputEl.classList.add('hidden');
                inputEl.value = selectEl.value;
                if (selectArrow) selectArrow.classList.remove('hidden');
            }
        };

        window.autoExpandTextarea = function(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        };

        window.updateCharCounter = function(textarea) {
            const container = textarea.closest('.task-textarea-container');
            const counter = container.querySelector('.char-counter');
            const length = textarea.value.length;
            counter.textContent = `${length} / 5000`;
            if (length < 20 || length > 5000) {
                counter.classList.remove('text-slate-400');
                counter.classList.add('text-rose-500', 'font-semibold');
            } else {
                counter.classList.remove('text-rose-500', 'font-semibold');
                counter.classList.add('text-slate-400');
            }
        };

        window.markAllNotificationsRead = async function(e) {
            if (e) e.stopPropagation();
            const unreadDb = (window.latestDbNotifications || []).filter(n => !n.is_read);
            if (unreadDb.length === 0) return;
            try {
                await Promise.all(unreadDb.map(n => apiFetch(`/attendance/notifications/${n.id}/read`, { method: 'POST' })));
                showToast("All notifications marked as read", "success");
                window.calculateNotifications();
            } catch(err) {
                console.error("Failed to mark all as read:", err);
            }
        };

        let isCalculatingNotifications = false;
        window.calculateNotifications = async function() {
            if (isCalculatingNotifications) return;
            const list = document.getElementById('notif-list');
            const badge = document.getElementById('notif-badge');
            const countSpan = document.getElementById('notif-count');
            if (!list) return;

            isCalculatingNotifications = true;
            try {
                const notifications = [];

                // A. Fetch DB Notifications
                let dbNotifs = [];
                try {
                    dbNotifs = await apiFetch('/attendance/notifications');
                    window.latestDbNotifications = dbNotifs;
                } catch(e) {
                    console.error("Failed to fetch notifications:", e);
                }

                // Map DB notifications to notification objects
                let unreadDbCount = 0;
                if (Array.isArray(dbNotifs)) {
                    dbNotifs.forEach(n => {
                        if (!n.is_read) {
                            unreadDbCount++;
                        }
                        notifications.push({
                            id: n.id,
                            db: true,
                            is_read: n.is_read,
                            type: n.is_read ? 'info' : 'warning',
                            icon: 'bell',
                            message: n.title,
                            details: n.message,
                            created_at: n.created_at
                        });
                    });
                }

                const emp = state.employeeData || {};
                const tasks = state.employeeTasks || [];
                const attendance = state.myAttendance || [];

                const localTodayStr = new Date().toLocaleDateString('sv-SE');

                // 1. Timesheet not submitted warning
                const hasCheckedInToday = attendance.some(a => {
                    const checkInDate = a.check_in_time ? a.check_in_time.split(' ')[0] : (a.date ? a.date.split(' ')[0] : '');
                    return checkInDate === localTodayStr;
                });
                
                if (hasCheckedInToday) {
                    const todayTasks = tasks.filter(t => {
                        const taskDate = t.date ? t.date.split(' ')[0] : (t.created_at ? t.created_at.split(' ')[0] : '');
                        return taskDate === localTodayStr;
                    });
                    if (todayTasks.length === 0) {
                        const key = 'timesheet_not_submitted';
                        const dismissed = localStorage.getItem(`dismissed_warning_${emp.id || 'default'}_${key}`);
                        if (dismissed !== localTodayStr) {
                            notifications.push({
                                key: key,
                                type: 'warning',
                                icon: 'alert-triangle',
                                message: 'Timesheet Not Submitted',
                                details: 'You are checked in today but have not submitted any task logs yet.'
                            });
                        }
                    }
                }

                // 2. Missing hours warning (< 8 hours) in last 7 days
                const last7Days = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    last7Days.push(d.toLocaleDateString('sv-SE'));
                }

                last7Days.forEach(dateStr => {
                    const dayCheckIn = attendance.find(a => {
                        const checkInDate = a.check_in_time ? a.check_in_time.split(' ')[0] : (a.date ? a.date.split(' ')[0] : '');
                        return checkInDate === dateStr;
                    });

                    if (dayCheckIn) {
                        const dayTasks = tasks.filter(t => {
                            const taskDate = t.date ? t.date.split(' ')[0] : (t.created_at ? t.created_at.split(' ')[0] : '');
                            return taskDate === dateStr;
                        });
                        const totalHours = dayTasks.reduce((sum, t) => sum + (parseFloat(t.hours_logged) || 0), 0);
                        
                        const isToday = (dateStr === localTodayStr);
                        const isCheckedOut = dayCheckIn.check_out_time;
                        
                        if (totalHours < 8.0 && (!isToday || isCheckedOut)) {
                            const key = `incomplete_hours_${dateStr}`;
                            const dismissed = localStorage.getItem(`dismissed_warning_${emp.id || 'default'}_${key}`);
                            if (dismissed !== localTodayStr) {
                                notifications.push({
                                    key: key,
                                    type: 'info',
                                    icon: 'clock',
                                    message: `Incomplete Hours for ${new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
                                    details: `You logged ${totalHours} hours, but a minimum of 8 hours is required for checked-in workdays.`
                                });
                            }
                        }
                    }
                });

                // 3. Missing mandatory profile fields
                const missingFields = [];
                if (!emp.adhar_number || emp.adhar_number === 'N/A') missingFields.push('Aadhaar Number');
                if (!emp.pan_number || emp.pan_number === 'N/A') missingFields.push('PAN Number');
                if (!emp.bank_name || emp.bank_name === 'N/A') missingFields.push('Bank Name');
                if (!emp.bank_account || emp.bank_account === 'N/A') missingFields.push('Bank Account');
                if (!emp.ifsc_code || emp.ifsc_code === 'N/A') missingFields.push('IFSC Code');
                if (!emp.contact_number || emp.contact_number === 'N/A') missingFields.push('Contact Number');

                if (missingFields.length > 0) {
                    const key = 'incomplete_compliance_profile';
                    const dismissed = localStorage.getItem(`dismissed_warning_${emp.id || 'default'}_${key}`);
                    if (dismissed !== localTodayStr) {
                        notifications.push({
                            key: key,
                            type: 'error',
                            icon: 'user-check',
                            message: 'Incomplete Compliance Profile',
                            details: `Mandatory profile fields missing: ${missingFields.join(', ')}. Please update your profile.`
                        });
                    }
                }

                // Calculate unread count (unread DB notifications + local notifications)
                const localNotifsCount = notifications.filter(n => !n.db).length;
                const totalUnread = unreadDbCount + localNotifsCount;

                // Clear the list at the end to prevent race condition duplications
                list.innerHTML = '';

                if (notifications.length === 0) {
                    list.innerHTML = `
                        <div class="p-8 text-center text-slate-400 animate-in fade-in duration-200">
                            <i data-lucide="bell-off" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                            <p class="text-sm font-semibold">All caught up!</p>
                            <p class="text-xs mt-1">No alerts or missing submissions.</p>
                        </div>
                    `;
                    if (badge) badge.classList.add('hidden');
                    if (countSpan) {
                        countSpan.textContent = '0 new';
                        countSpan.className = 'text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full';
                    }
                } else {
                    notifications.forEach(n => {
                        const item = document.createElement('div');
                        let hoverClass = n.db && !n.is_read ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-slate-50';
                        item.className = `p-4 transition-colors flex gap-3 ${hoverClass} ${n.db && !n.is_read ? 'cursor-pointer' : ''} animate-in fade-in duration-200`;
                        
                        let colorClass = 'text-slate-500 bg-slate-100';
                        if (n.type === 'warning') colorClass = 'text-amber-600 bg-amber-50';
                        else if (n.type === 'error') colorClass = 'text-rose-600 bg-rose-50';
                        else if (n.type === 'info') colorClass = 'text-blue-600 bg-blue-50';
                        
                        item.innerHTML = `
                            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}">
                                <i data-lucide="${n.icon}" class="w-4 h-4"></i>
                            </div>
                            <div class="flex-1">
                                <h5 class="font-bold text-slate-800 text-xs">${n.message}</h5>
                                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${n.details}</p>
                                ${n.created_at ? `<span class="text-[9px] text-slate-400 font-medium block mt-1">${new Date(n.created_at).toLocaleString()}</span>` : ''}
                            </div>
                            ${!n.db ? `
                            <button class="dismiss-local-btn text-slate-400 hover:text-slate-600 self-center shrink-0 p-1 rounded hover:bg-slate-100 transition-colors" title="Dismiss for today">
                                <i data-lucide="check" class="w-4 h-4"></i>
                            </button>
                            ` : ''}
                        `;
                        
                        if (n.db && !n.is_read) {
                            item.addEventListener('click', async () => {
                                try {
                                    await apiFetch(`/attendance/notifications/${n.id}/read`, { method: 'POST' });
                                    showToast("Marked notification as read", "success");
                                    window.calculateNotifications();
                                } catch(e) {
                                    console.error("Failed to mark as read:", e);
                                }
                            });
                        }
                        if (!n.db) {
                            const dismissBtn = item.querySelector('.dismiss-local-btn');
                            if (dismissBtn) {
                                dismissBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    localStorage.setItem(`dismissed_warning_${emp.id || 'default'}_${n.key}`, localTodayStr);
                                    showToast("Dismissed notification for today", "success");
                                    window.calculateNotifications();
                                });
                            }
                        }
                        list.appendChild(item);
                    });
                    
                    if (badge) {
                        if (totalUnread > 0) {
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                    if (countSpan) {
                        countSpan.textContent = `${totalUnread} new`;
                        countSpan.className = totalUnread > 0 ? 'text-xs font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full' : 'text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full';
                    }
                }
                
                if (window.lucide) lucide.createIcons();
            } finally {
                isCalculatingNotifications = false;
            }
        };

        window.toggleNotificationDropdown = function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notif-dropdown');
            dropdown.classList.toggle('hidden');
        };

        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('notif-dropdown');
            if (dropdown && !e.target.closest('#notification-center')) {
                dropdown.classList.add('hidden');
            }
        });

        window.initTaskForm = function() {
            if (state.currentView === 'log-dev') {
                const devContainer = document.getElementById('dev-task-container');
                if (devContainer) {
                    if (devContainer.children.length === 0) {
                        window.addDevTaskRow();
                    }
                    if (state.pendingHandover && state.pendingHandover.type === 'dev') {
                        const row = devContainer.lastElementChild;
                        if (row) {
                            const handoverCheckbox = row.querySelector('.col-is-handover');
                            if (handoverCheckbox) {
                                handoverCheckbox.checked = true;
                                window.toggleHandoverEmployeeSelect(handoverCheckbox);
                                const select = row.querySelector('.col-handover-employee');
                                if (select) {
                                    select.value = state.pendingHandover.employeeId;
                                    window.handleHandoverColleagueChange(select);
                                }
                            }
                        }
                        delete state.pendingHandover;
                    }
                    window.updateStickyHours();
                    window.toggleRemoveButtonsVisibility('developer');
                }
            } else if (state.currentView === 'log-content') {
                const conContainer = document.getElementById('con-task-container');
                if (conContainer) {
                    if (conContainer.children.length === 0) {
                        window.addConTaskRow();
                    }
                    if (state.pendingHandover && state.pendingHandover.type === 'content') {
                        const row = conContainer.lastElementChild;
                        if (row) {
                            const handoverCheckbox = row.querySelector('.col-is-handover');
                            if (handoverCheckbox) {
                                handoverCheckbox.checked = true;
                                window.toggleHandoverEmployeeSelect(handoverCheckbox);
                                const select = row.querySelector('.col-handover-employee');
                                if (select) {
                                    select.value = state.pendingHandover.employeeId;
                                    window.handleHandoverColleagueChange(select);
                                }
                            }
                        }
                        delete state.pendingHandover;
                    }
                    window.updateStickyHours();
                    window.toggleRemoveButtonsVisibility('content');
                }
            }
        };

        window.isShiftOfficiallyOver = function() {
            if (!state.myAttendance || state.myAttendance.length === 0) return false;
            const localTodayStr = new Date().toLocaleDateString('sv-SE');
            const hasCheckedOutToday = state.myAttendance.some(a => {
                const checkInDate = a.check_in_time ? a.check_in_time.split(' ')[0] : (a.date ? a.date.split(' ')[0] : '');
                return checkInDate === localTodayStr && a.check_out_time;
            });
            return hasCheckedOutToday;
        };

        window.updateMetadataFieldsVisibility = function(taskRow) {
            const projectVal = taskRow.querySelector('.col-project')?.value || '';
            const milestoneVal = taskRow.querySelector('.col-milestone')?.value || '';
            const hasMilestone = projectVal && milestoneVal;

            const fields = ['work-type', 'sprint', 'module', 'feature'];
            fields.forEach(f => {
                const selectWrapper = taskRow.querySelector(`.col-${f}-select-wrapper`);
                const displayWrapper = taskRow.querySelector(`.col-${f}-display-wrapper`);
                const displayVal = taskRow.querySelector(`.col-${f}-display-val`);
                const inputEl = taskRow.querySelector(`.col-${f}`);

                if (hasMilestone) {
                    if (selectWrapper) selectWrapper.classList.add('hidden');
                    if (inputEl) inputEl.classList.add('hidden');
                    if (displayWrapper) displayWrapper.classList.remove('hidden');
                    if (displayVal && inputEl) {
                        displayVal.textContent = inputEl.value || 'N/A';
                    }
                } else {
                    if (selectWrapper) selectWrapper.classList.remove('hidden');
                    if (displayWrapper) displayWrapper.classList.add('hidden');
                    
                    const selectEl = taskRow.querySelector(`.col-${f}-select`);
                    if (selectEl) {
                        if (selectEl.value === 'Other') {
                            if (inputEl) {
                                inputEl.classList.remove('hidden');
                            }
                        } else {
                            if (inputEl) {
                                inputEl.classList.add('hidden');
                                inputEl.value = selectEl.value;
                            }
                        }
                    }
                }
            });
        };

        window.toggleHandoverEmployeeSelect = function(checkbox) {
            const row = checkbox.closest('.dev-task-item') || checkbox.closest('.con-task-item');
            if (!row) return;
            const selectContainer = row.querySelector('.col-handover-select-container');
            const taskSelectContainer = row.querySelector('.col-handover-task-container');
            const refBox = row.querySelector('.col-handover-ref-box-container');
            const hiddenSourceId = row.querySelector('.col-handover-source-task-id');
            const milestoneSelect = row.querySelector('.col-milestone');
            const trigger = row.querySelector('.select-trigger');
            
            // Re-enable and reset pointer-events / opacity on searchable select and milestone select
            if (trigger) {
                trigger.style.pointerEvents = '';
                trigger.style.opacity = '';
            }
            if (milestoneSelect) {
                milestoneSelect.disabled = false;
                milestoneSelect.style.opacity = '';
            }

            if (checkbox.checked) {
                if (selectContainer) selectContainer.classList.remove('hidden');
                window.populateHandoverEmployees(row);
            } else {
                if (selectContainer) selectContainer.classList.add('hidden');
                if (taskSelectContainer) taskSelectContainer.classList.add('hidden');
                if (refBox) refBox.classList.add('hidden');
                if (hiddenSourceId) hiddenSourceId.value = '';
                const select = row.querySelector('.col-handover-employee');
                if (select) select.value = '';
                const taskSel = row.querySelector('.col-handover-task-select');
                if (taskSel) taskSel.innerHTML = '<option value="">-- Select Task --</option>';

                // Reset project and milestones to default
                const projectInput = row.querySelector('.col-project');
                if (projectInput) {
                    projectInput.value = '';
                    const triggerSpan = row.querySelector('.select-trigger .selected-text');
                    if (triggerSpan) {
                        triggerSpan.textContent = '-- General / No Project --';
                    }
                    const noProjContainer = row.querySelector('.no-project-reason-container');
                    if (noProjContainer) noProjContainer.classList.remove('hidden');
                    const noProjInput = row.querySelector('.col-no-project-reason');
                    if (noProjInput) noProjInput.required = true;
                    
                    projectInput.dispatchEvent(new Event('change'));
                }
                if (milestoneSelect) {
                    milestoneSelect.innerHTML = '<option value="">General Task (No Milestone)</option>';
                    milestoneSelect.value = '';
                }

                // Reset all other fields to defaults to clean up handover residue
                const taskInput = row.querySelector('.col-task');
                if (taskInput) {
                    taskInput.value = '';
                    if (window.autoExpandTextarea) window.autoExpandTextarea(taskInput);
                    if (window.updateCharCounter) window.updateCharCounter(taskInput);
                }
                const tomorrowInput = row.querySelector('.col-tomorrow');
                if (tomorrowInput) {
                    tomorrowInput.value = '';
                    if (window.autoExpandTextarea) window.autoExpandTextarea(tomorrowInput);
                }
                
                const ticketInput = row.querySelector('.col-ticket');
                if (ticketInput) {
                    ticketInput.value = window.generateTicketId('');
                }
                
                const wtInput = row.querySelector('.col-work-type');
                if (wtInput) {
                    wtInput.value = 'Development';
                    const wtSelect = row.querySelector('.col-work-type-select');
                    if (wtSelect) wtSelect.value = 'Development';
                }

                const sprintInput = row.querySelector('.col-sprint');
                if (sprintInput) sprintInput.value = 'N/A';

                const moduleInput = row.querySelector('.col-module');
                if (moduleInput) moduleInput.value = 'N/A';

                const featureInput = row.querySelector('.col-feature');
                if (featureInput) featureInput.value = 'N/A';

                // Git integration fields
                const repoInput = row.querySelector('.col-repo');
                if (repoInput) repoInput.value = 'N/A';
                const repoSelect = row.querySelector('.col-repo-select');
                if (repoSelect) repoSelect.value = 'N/A';
                const branchInput = row.querySelector('.col-branch');
                if (branchInput) branchInput.value = '';
                const prCheckbox = row.querySelector('.col-pr');
                if (prCheckbox) prCheckbox.checked = false;
                const commitsInput = row.querySelector('.col-commits');
                if (commitsInput) commitsInput.value = '0';

                // Content Creator fields
                const reelsInput = row.querySelector('.col-reels');
                if (reelsInput) reelsInput.value = '0';
                const videosInput = row.querySelector('.col-videos');
                if (videosInput) videosInput.value = '0';
                const postersInput = row.querySelector('.col-posters');
                if (postersInput) postersInput.value = '0';
                const callsInput = row.querySelector('.col-calls');
                if (callsInput) callsInput.value = '0';
                const platformSelect = row.querySelector('.col-platform');
                if (platformSelect) platformSelect.value = 'N/A';

                // Tech tags reset
                const tagsContainer = row.querySelector('.tech-tags-container');
                if (tagsContainer) {
                    tagsContainer.innerHTML = '';
                    tagsContainer.setAttribute('data-locked-tags', '');
                    tagsContainer.setAttribute('data-custom-tags', '');
                }
                const techInput = row.querySelector('.col-tech');
                if (techInput) techInput.value = 'N/A';
                const techTagInput = row.querySelector('.col-tech-input');
                if (techTagInput) techTagInput.value = '';

                window.updateMetadataFieldsVisibility(row);
            }
        };

        window.populateHandoverEmployees = function(row) {
            const select = row.querySelector('.col-handover-employee');
            if (!select) return;
            select.innerHTML = '<option value="">-- Select Colleague --</option>';
            const currentUserId = state.user.id;
            const employees = state.allEmployees || [];
            employees.forEach(emp => {
                if (emp.id !== currentUserId && emp.is_active !== false) {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = emp.full_name || emp.username;
                    select.appendChild(opt);
                }
            });
        };

        window.handleHandoverColleagueChange = async function(selectEl) {
            const row = selectEl.closest('.dev-task-item') || selectEl.closest('.con-task-item');
            if (!row) return;
            const colleagueId = selectEl.value;
            const taskSelectContainer = row.querySelector('.col-handover-task-container');
            const taskSelect = row.querySelector('.col-handover-task-select');
            const refBox = row.querySelector('.col-handover-ref-box-container');
            
            if (!colleagueId) {
                if (taskSelectContainer) taskSelectContainer.classList.add('hidden');
                if (refBox) refBox.classList.add('hidden');
                return;
            }

            try {
                const tasks = await apiFetch(`/tasks/handover/pending?assignee_id=${state.user.id}&colleague_id=${colleagueId}`);
                
                // Pre-fetch any projects and timelines not present in state.projects / state.projectTimelines
                if (tasks && tasks.length > 0) {
                    for (const t of tasks) {
                        if (t.project_id) {
                            let projObj = state.projects.find(p => p.id === t.project_id);
                            if (!projObj) {
                                try {
                                    const projData = await apiFetch(`/projects/get/${t.project_id}`);
                                    if (projData && !projData.error) {
                                        state.projects.push(projData);
                                    }
                                } catch (err) {
                                    console.error("Failed to fetch project info", err);
                                }
                            }
                            
                            if (!state.projectTimelines) {
                                state.projectTimelines = {};
                            }
                            if (!state.projectTimelines[t.project_id]) {
                                try {
                                    const milestones = await apiFetch(`/projects/timeline/${t.project_id}?employee_id=${colleagueId}`);
                                    if (milestones && !milestones.error) {
                                        state.projectTimelines[t.project_id] = milestones;
                                    }
                                } catch (err) {
                                    console.error("Failed to fetch project timelines", err);
                                }
                            }
                        }
                    }
                }

                if (taskSelect) {
                    taskSelect.innerHTML = '<option value="">-- Select Handover Task --</option>';
                    if (tasks && tasks.length > 0) {
                        tasks.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t.id;
                            const projObj = state.projects.find(p => p.id === t.project_id);
                            const projName = projObj ? projObj.name : 'General Project';
                            const summary = t.task_performed ? t.task_performed.substring(0, 40) + '...' : 'Task details';
                            opt.textContent = `${projName} - ${summary}`;
                            
                            opt.dataset.id = t.id;
                            opt.dataset.projectId = t.project_id || '';
                            opt.dataset.milestoneId = t.milestone_id || '';
                            opt.dataset.sprint = t.sprint || 'N/A';
                            opt.dataset.module = t.module || 'N/A';
                            opt.dataset.feature = t.feature || 'N/A';
                            opt.dataset.workType = t.work_type || 'Development';
                            opt.dataset.taskPerformed = t.task_performed || 'N/A';
                            taskSelect.appendChild(opt);
                        });
                        if (taskSelectContainer) taskSelectContainer.classList.remove('hidden');
                    } else {
                        taskSelect.innerHTML = '<option value="">-- No pending tasks found --</option>';
                        if (taskSelectContainer) taskSelectContainer.classList.remove('hidden');
                        if (refBox) refBox.classList.add('hidden');
                    }
                }
            } catch (error) {
                showToast("Failed to fetch pending handover tasks: " + error.message, "error");
            }
        };

        window.handleHandoverTaskChange = function(selectEl) {
            const row = selectEl.closest('.dev-task-item') || selectEl.closest('.con-task-item');
            if (!row) return;
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const refBox = row.querySelector('.col-handover-ref-box-container');
            const refContent = row.querySelector('.col-handover-ref-content');
            const hiddenSourceId = row.querySelector('.col-handover-source-task-id');
            const trigger = row.querySelector('.select-trigger');
            const milestoneSelect = row.querySelector('.col-milestone');

            if (!selectedOption || !selectedOption.value || !selectedOption.dataset.taskPerformed) {
                if (refBox) refBox.classList.add('hidden');
                if (hiddenSourceId) hiddenSourceId.value = '';
                if (trigger) {
                    trigger.style.pointerEvents = '';
                    trigger.style.opacity = '';
                }
                if (milestoneSelect) {
                    milestoneSelect.disabled = false;
                    milestoneSelect.style.opacity = '';
                }
                return;
            }

            if (hiddenSourceId) hiddenSourceId.value = selectedOption.dataset.id;
            if (refContent) refContent.textContent = selectedOption.dataset.taskPerformed;
            if (refBox) refBox.classList.remove('hidden');

            const projectId = selectedOption.dataset.projectId;
            if (projectId) {
                const projectInput = row.querySelector('.col-project');
                if (projectInput) {
                    projectInput.value = projectId;
                    
                    const triggerSpan = row.querySelector('.select-trigger .selected-text');
                    const projectObj = state.projects.find(p => p.id === projectId);
                    if (triggerSpan && projectObj) {
                        triggerSpan.textContent = projectObj.name;
                    }

                    const noProjContainer = row.querySelector('.no-project-reason-container');
                    if (noProjContainer) noProjContainer.classList.add('hidden');
                    const noProjInput = row.querySelector('.col-no-project-reason');
                    if (noProjInput) noProjInput.required = false;

                    if (window.loadProjectTechStack && row.classList.contains('dev-task-item')) {
                        window.loadProjectTechStack(row, projectId);
                    }
                    if (milestoneSelect) {
                        milestoneSelect.innerHTML = getMilestoneOptions(projectId);
                        const milestoneId = selectedOption.dataset.milestoneId;
                        if (milestoneId) {
                            milestoneSelect.value = milestoneId;
                        } else {
                            milestoneSelect.value = '';
                        }
                        window.autoFillSmartMilestone(milestoneSelect);
                    }

                    // Auto-generate project specific ticket ID
                    if (projectObj) {
                        window.autoGenerateTicketForOption(row, projectObj.name);
                    }
                }
            }

            if (trigger) {
                trigger.style.pointerEvents = 'none';
                trigger.style.opacity = '0.75';
            }
            if (milestoneSelect) {
                milestoneSelect.disabled = true;
                milestoneSelect.style.opacity = '0.75';
            }

            const colTaskInput = row.querySelector('.col-task');
            if (colTaskInput && selectedOption.dataset.taskPerformed) {
                colTaskInput.value = selectedOption.dataset.taskPerformed;
                if (window.autoExpandTextarea) window.autoExpandTextarea(colTaskInput);
                if (window.updateCharCounter) window.updateCharCounter(colTaskInput);
            }

            const wtInput = row.querySelector('.col-work-type');
            if (wtInput) {
                wtInput.value = selectedOption.dataset.workType;
                const wtSelect = row.querySelector('.col-work-type-select');
                if (wtSelect) wtSelect.value = selectedOption.dataset.workType;
            }

            const sprintInput = row.querySelector('.col-sprint');
            if (sprintInput) sprintInput.value = selectedOption.dataset.sprint;

            const moduleInput = row.querySelector('.col-module');
            if (moduleInput) moduleInput.value = selectedOption.dataset.module;

            const featureInput = row.querySelector('.col-feature');
            if (featureInput) featureInput.value = selectedOption.dataset.feature;

            window.updateMetadataFieldsVisibility(row);
        };


        window.logHandoverTaskFor = function(employeeId, type) {
            state.pendingHandover = { employeeId, type };
            routeApp(type === 'dev' ? 'log-dev' : 'log-content');
        };

        function getMilestoneOptions(projectId) {
            let options = `<option value="">General Task (No Milestone)</option>`;
            if (!projectId) return options;

            const timelines = state.projectTimelines ? state.projectTimelines[projectId] : null;
            if (timelines && timelines.length > 0) {
                timelines.forEach(m => {
                    const sprint = (m.sprint_name || 'N/A').replace(/"/g, '&quot;');
                    const module = (m.module_name || 'N/A').replace(/"/g, '&quot;');
                    const feature = (m.feature_name || 'N/A').replace(/"/g, '&quot;');
                    const worktype = (m.work_type || '').replace(/"/g, '&quot;');
                    const repo = (m.repo_name || 'N/A').replace(/"/g, '&quot;');

                    options += `<option value="${m.id}" data-sprint="${sprint}" data-module="${module}" data-feature="${feature}" data-worktype="${worktype}" data-repo="${repo}">${m.milestone_name} (${m.status})</option>`;
                });
            }
            return options;
        }

        window.updateMilestones = function (selectElement) {
            const projectId = selectElement.value;
            const container = selectElement.closest('.dev-task-item') || selectElement.closest('.con-task-item');

            if (container) {
                const milestoneSelect = container.querySelector('.col-milestone');
                if (milestoneSelect) {
                    milestoneSelect.innerHTML = getMilestoneOptions(projectId);
                    window.autoFillSmartMilestone(milestoneSelect);
                }

                if (container.classList.contains('con-task-item')) {
                    window.updateCustomContentFields(container, projectId);
                }
            }
        };

        window.updateCustomContentFields = function(row, projectId) {
            const staticContainer = row.querySelector('.static-metrics-container');
            const customContainer = row.querySelector('.custom-metrics-container');
            if (!staticContainer || !customContainer) return;

            const p = (state.projects || []).find(proj => String(proj.id) === String(projectId));
            if (!p) {
                staticContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
                return;
            }

            let agreement = [];
            try {
                agreement = typeof p.content_agreement === 'string' ? JSON.parse(p.content_agreement) : (p.content_agreement || []);
            } catch (e) {
                agreement = [];
            }

            if (p.project_type === 'Content' || agreement.length > 0) {
                staticContainer.classList.add('hidden');
                customContainer.classList.remove('hidden');

                // Render dynamic fields
                const fieldsGrid = customContainer.querySelector('.custom-fields-grid');
                if (fieldsGrid) {
                    if (agreement.length === 0) {
                        fieldsGrid.innerHTML = '<div class="col-span-2 text-xs text-slate-400 italic">No custom tracking fields configured for this project.</div>';
                    } else {
                        fieldsGrid.innerHTML = agreement.map(item => {
                            const name = item.name;
                            const current = item.current || 0;
                            const target = item.target || 0;
                            return `
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-500"></i> ${name} (${current} / ${target})
                                    </label>
                                    <input type="number" min="0" value="0" data-field-name="${name.replace(/"/g, '&quot;')}" class="col-custom-field-input input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm">
                                </div>
                            `;
                        }).join('');
                    }
                }

                // Render last logged deadlines
                const infoDiv = customContainer.querySelector('.col-deadlines-info');
                const lastUploadVal = customContainer.querySelector('.last-upload-deadline-val');
                const lastGivingVal = customContainer.querySelector('.last-giving-date-val');

                if (infoDiv && lastUploadVal && lastGivingVal) {
                    const projectTasks = (state.employeeTasks || [])
                        .filter(t => String(t.project_id) === String(projectId) && (t.upload_deadline || t.next_delivery_date))
                        .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

                    let lastDeadline = "N/A";
                    let lastGiving = "N/A";

                    const latestD = projectTasks.find(t => t.upload_deadline && t.upload_deadline !== "N/A");
                    if (latestD) lastDeadline = latestD.upload_deadline;

                    const latestG = projectTasks.find(t => t.next_delivery_date && t.next_delivery_date !== "N/A");
                    if (latestG) lastGiving = latestG.next_delivery_date;

                    if (lastDeadline !== "N/A" || lastGiving !== "N/A") {
                        infoDiv.classList.remove('hidden');
                        lastUploadVal.textContent = lastDeadline !== "N/A" ? new Date(lastDeadline).toLocaleDateString() : "N/A";
                        lastGivingVal.textContent = lastGiving !== "N/A" ? new Date(lastGiving).toLocaleDateString() : "N/A";
                    } else {
                        infoDiv.classList.add('hidden');
                    }
                }

                if (window.lucide) lucide.createIcons();
            } else {
                staticContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
            }
        };

        window.updateLeaveMilestones = function (selectElement) {
            const projectId = selectElement.value;
            const milestoneSelect = document.getElementById('leave-milestone');
            if (milestoneSelect) {
                milestoneSelect.innerHTML = getMilestoneOptions(projectId);
            }
            window.handleLeaveMilestoneChange(milestoneSelect);
        };

        window.handleLeaveMilestoneChange = function (selectElement) {
            if (!selectElement) return;
            const milestoneId = selectElement.value;
            const summaryTextarea = document.getElementById('leave-work-summary');
            if (summaryTextarea) {
                const label = summaryTextarea.previousElementSibling;
                if (!milestoneId) {
                    summaryTextarea.required = true;
                    if (label) {
                        label.innerHTML = 'Pending Work Summary <span class="text-rose-500">*</span>';
                    }
                } else {
                    summaryTextarea.required = false;
                    if (label) {
                        label.innerHTML = 'Pending Work Summary';
                    }
                }
            }
        };

        window.autoFillSmartMilestone = function(selectElement) {
            const taskRow = selectElement.closest('.dev-task-item') || selectElement.closest('.con-task-item');
            if (!taskRow) return;

            const selectedOption = selectElement.options[selectElement.selectedIndex];
            
            if (selectedOption && selectedOption.value && selectedOption.dataset.sprint) {
                // 1. Auto-fill Work Type
                const workTypeInput = taskRow.querySelector('.col-work-type');
                if (workTypeInput && selectedOption.dataset.worktype) {
                    workTypeInput.value = selectedOption.dataset.worktype;
                    const wtSelect = taskRow.querySelector('.col-work-type-select');
                    if (wtSelect) wtSelect.value = selectedOption.dataset.worktype;
                }

                // 2. Auto-fill Repo Name (Developer form only)
                const repoInput = taskRow.querySelector('.col-github-repo-name');
                if (repoInput && selectedOption.dataset.repo) {
                    repoInput.value = selectedOption.dataset.repo;
                }

                // 3. Auto-fill Metadata (Sprint, Module, Feature)
                const sprintSelect = taskRow.querySelector('.col-sprint-select');
                const sprintInput = taskRow.querySelector('.col-sprint');
                if (sprintSelect && sprintInput) {
                    sprintInput.value = selectedOption.dataset.sprint;
                    let found = Array.from(sprintSelect.options).some(opt => opt.value === selectedOption.dataset.sprint);
                    if (found) {
                        sprintSelect.value = selectedOption.dataset.sprint;
                        sprintInput.classList.add('hidden');
                    } else {
                        sprintSelect.value = 'Other';
                        sprintInput.classList.remove('hidden');
                    }
                }

                const moduleSelect = taskRow.querySelector('.col-module-select');
                const moduleInput = taskRow.querySelector('.col-module');
                if (moduleSelect && moduleInput) {
                    moduleInput.value = selectedOption.dataset.module;
                    let found = Array.from(moduleSelect.options).some(opt => opt.value === selectedOption.dataset.module);
                    if (found) {
                        moduleSelect.value = selectedOption.dataset.module;
                        moduleInput.classList.add('hidden');
                    } else {
                        moduleSelect.value = 'Other';
                        moduleInput.classList.remove('hidden');
                    }
                }

                const featureSelect = taskRow.querySelector('.col-feature-select');
                const featureInput = taskRow.querySelector('.col-feature');
                if (featureSelect && featureInput) {
                    featureInput.value = selectedOption.dataset.feature;
                    let found = Array.from(featureSelect.options).some(opt => opt.value === selectedOption.dataset.feature);
                    if (found) {
                        featureSelect.value = selectedOption.dataset.feature;
                        featureInput.classList.add('hidden');
                    } else {
                        featureSelect.value = 'Other';
                        featureInput.classList.remove('hidden');
                    }
                }
            } else {
                // Deselected/No Milestone: reset metadata fields to default dropdowns
                const wtSelect = taskRow.querySelector('.col-work-type-select');
                const wtInput = taskRow.querySelector('.col-work-type');
                if (wtSelect && wtInput) {
                    wtSelect.value = wtSelect.options[0]?.value || '';
                    wtInput.value = wtSelect.value;
                }
                const sprintSelect = taskRow.querySelector('.col-sprint-select');
                const sprintInput = taskRow.querySelector('.col-sprint');
                if (sprintSelect && sprintInput) {
                    sprintSelect.value = 'N/A';
                    sprintInput.value = 'N/A';
                    sprintInput.classList.add('hidden');
                }
                const moduleSelect = taskRow.querySelector('.col-module-select');
                const moduleInput = taskRow.querySelector('.col-module');
                if (moduleSelect && moduleInput) {
                    moduleSelect.value = 'N/A';
                    moduleInput.value = 'N/A';
                    moduleInput.classList.add('hidden');
                }
                const featureSelect = taskRow.querySelector('.col-feature-select');
                const featureInput = taskRow.querySelector('.col-feature');
                if (featureSelect && featureInput) {
                    featureSelect.value = 'N/A';
                    featureInput.value = 'N/A';
                    featureInput.classList.add('hidden');
                }
            }
            window.updateMetadataFieldsVisibility(taskRow);
        };

        window.startElapsedTimer = function() {
            if (window.elapsedTimerInterval) {
                clearInterval(window.elapsedTimerInterval);
            }
            if (state.currentView !== 'dashboard') return;

            const updateTimer = () => {
                const el = document.getElementById('elapsed-timer-clock');
                if (!el) return;
                
                const checkinStr = el.getAttribute('data-checkin');
                if (!checkinStr) return;
                
                const checkInDate = new Date(checkinStr);
                const now = new Date();
                let diffMs = now - checkInDate;
                if (diffMs < 0) diffMs = 0;
                
                // Cap the elapsed timer at working_hours daily target (e.g. 8.0 hours) to hide overtime
                const normalHoursLimit = parseFloat(state.employeeData?.working_hours) || 8.0;
                const maxMs = normalHoursLimit * 60 * 60 * 1000;
                if (diffMs > maxMs) {
                    diffMs = maxMs;
                }
                
                const secs = Math.floor((diffMs / 1000) % 60);
                const mins = Math.floor((diffMs / (1000 * 60)) % 60);
                const hrs = Math.floor(diffMs / (1000 * 60 * 60));
                
                const pad = (n) => String(n).padStart(2, '0');
                el.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
            };
            
            updateTimer();
            window.elapsedTimerInterval = setInterval(updateTimer, 1000);
        };

        window.removeDevTaskRow = function(btn) {
            const rows = document.querySelectorAll('.dev-task-item');
            if (rows.length > 1) {
                btn.closest('.dev-task-item').remove();
                window.updateStickyHours();
                window.toggleRemoveButtonsVisibility('developer');
            }
        };

        window.removeConTaskRow = function(btn) {
            const rows = document.querySelectorAll('.con-task-item');
            if (rows.length > 1) {
                btn.closest('.con-task-item').remove();
                window.updateStickyHours();
                window.toggleRemoveButtonsVisibility('content');
            }
        };

        window.toggleRemoveButtonsVisibility = function(type) {
            const selector = type === 'developer' ? '.dev-task-item' : '.con-task-item';
            const rows = document.querySelectorAll(selector);
            rows.forEach(row => {
                const btn = row.querySelector('.btn-remove-task');
                if (btn) {
                    if (rows.length <= 1) {
                        btn.style.display = 'none';
                    } else {
                        btn.style.display = '';
                    }
                }
            });
        };

        window.updateStickyHours = function() {
            // Find which container is currently mounted in the DOM
            const devContainer = document.getElementById('dev-task-container');
            const conContainer = document.getElementById('con-task-container');
            
            const activeContainer = devContainer || conContainer;
            if (!activeContainer) return;

            const normalLimit = parseFloat(state.employeeData?.working_hours) || 8.0;
            const alreadyLogged = window.getAlreadyLoggedHoursToday();

            const hoursSelects = activeContainer.querySelectorAll('.col-hours');
            let currentChosen = 0.0;
            hoursSelects.forEach(select => {
                const val = parseFloat(select.value) || 0.0;
                currentChosen += val;
            });

            const totalAggregate = alreadyLogged + currentChosen;
            const isOvertime = totalAggregate > normalLimit;
            const limit = isOvertime ? 24.0 : normalLimit;
            
            const totalEl = document.getElementById('sticky-total-hours');
            const progressEl = document.getElementById('sticky-hours-progress');
            const badgeEl = document.getElementById('sticky-hours-badge');
            
            if (totalEl) {
                totalEl.textContent = `${totalAggregate.toFixed(1)} hrs (${alreadyLogged.toFixed(1)}h logged + ${currentChosen.toFixed(1)}h chosen)`;
            }
            
            if (progressEl) {
                const pct = Math.min((totalAggregate / limit) * 100, 100);
                progressEl.style.width = pct + '%';
                const normalColor = devContainer ? 'bg-indigo-600' : 'bg-rose-500';
                if (totalAggregate > limit) {
                    progressEl.className = "h-full rounded-full transition-all duration-300 bg-rose-650";
                } else if (totalAggregate >= limit) {
                    progressEl.className = "h-full rounded-full transition-all duration-300 bg-emerald-500";
                } else if (totalAggregate >= (limit / 2.0)) {
                    progressEl.className = "h-full rounded-full transition-all duration-300 bg-amber-500";
                } else {
                    progressEl.className = `h-full rounded-full transition-all duration-300 ${normalColor}`;
                }
            }
            
            if (badgeEl) {
                const normalLimit = parseFloat(state.employeeData?.working_hours) || 8.0;
                if (totalAggregate > limit) {
                    badgeEl.textContent = `Target Exceeded (Max ${limit}h)`;
                    badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200/50 animate-pulse";
                } else if (totalAggregate >= normalLimit) {
                    badgeEl.textContent = `Daily Target Met (${normalLimit}h+)`;
                    badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                } else if (totalAggregate > 0.0) {
                    badgeEl.textContent = `Below Daily Target (${normalLimit}h)`;
                    badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/50";
                } else {
                    badgeEl.textContent = 'No Hours Logged';
                    badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200/50";
                }
            }
        };

window.addDevTaskRow = function (btnElement = null) {
            const container = document.getElementById('dev-task-container');
            if (!container) return;
            const item = document.createElement('div');
            item.className = "dev-task-item relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-200";
            item.innerHTML = `
                <button type="button" onclick="window.removeDevTaskRow(this)" class="btn-remove-task absolute -top-2.5 -right-2.5 w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-full flex items-center justify-center shadow-sm transition-all opacity-0 group-hover:opacity-100 z-20" title="Remove Task">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <input type="hidden" class="col-handover-source-task-id" value="">
                
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <!-- Left Column: Core Scope (Span 6) -->
                    <div class="lg:col-span-6 space-y-2">
                        <div class="bg-slate-50/50 border border-slate-200/60 rounded-lg p-2.5 space-y-2">
                            <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <i data-lucide="compass" class="w-3.5 h-3.5 text-slate-400"></i>
                                Task Scope & Time
                            </span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Workspace *</label>
                                    <div class="project-searchable-select-container relative">
                                        <input type="hidden" class="col-project" value="" onchange="window.loadProjectTechStack(this.closest('.dev-task-item'), this.value); window.updateMilestones(this)">
                                        <button type="button" class="select-trigger w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium text-left flex items-center justify-between focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" onclick="window.toggleSearchableSelect(this)">
                                            <span class="selected-text truncate">-- General / No Project --</span>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                        </button>
                                        <div class="select-dropdown absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 hidden flex flex-col max-h-48 overflow-hidden">
                                            <div class="p-1.5 border-b border-slate-100 shrink-0 flex items-center">
                                                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0"></i>
                                                <input type="text" class="select-search-input w-full px-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="Search projects..." oninput="window.filterSearchableSelect(this)">
                                            </div>
                                            <div class="options-list overflow-y-auto flex-1 py-0.5"></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Milestone / Task</label>
                                    <div class="relative">
                                        <select class="col-milestone input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" onchange="window.autoFillSmartMilestone(this)">
                                            <option value="">General Task (No Milestone)</option>
                                        </select>
                                        <i data-lucide="target" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="no-project-reason-container">
                                <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">No Project Reason *</label>
                                <input type="text" required class="col-no-project-reason input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Reason for no project selection">
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Time (Hrs) *</label>
                                    <div class="relative">
                                        <select class="col-hours input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-bold appearance-none focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" onchange="window.updateStickyHours()">
                                            ${window.getHourOptions()}
                                        </select>
                                        <i data-lucide="clock" class="w-3.5 h-3.5 text-brand-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Status *</label>
                                    <div class="relative">
                                        <select class="col-status input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                            <option value="Completed" selected>Completed</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Blocked">Blocked</option>
                                            <option value="Pending Review">Pending Review</option>
                                        </select>
                                        <i data-lucide="activity" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Work Type *</label>
                                    <div class="col-work-type-select-wrapper relative">
                                        <select class="col-work-type-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" onchange="window.handleMetaDropdownSelect(this, 'work-type')">
                                            <option value="Backend" selected>Backend</option>
                                            <option value="Frontend">Frontend</option>
                                            <option value="Full Stack">Full Stack</option>
                                            <option value="DevOps">DevOps/Server</option>
                                            <option value="Client Meeting">Meeting</option>
                                            <option value="Support">Support/Bug</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <i data-lucide="layers" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-arrow"></i>
                                    </div>
                                    <input type="text" class="col-work-type input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white mt-1 hidden" value="Backend" placeholder="Type custom work type...">
                                    <div class="col-work-type-display-wrapper hidden">
                                        <div class="col-work-type-display-val py-1 px-2 bg-slate-100 rounded text-xs font-semibold text-slate-600 border border-slate-200">Backend</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column: Git & Integration (Span 6) -->
                    <div class="lg:col-span-6 space-y-2">
                        <div class="bg-slate-50/50 border border-slate-200/60 rounded-lg p-2.5 space-y-2">
                            <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <i data-lucide="git-branch" class="w-3.5 h-3.5 text-slate-400"></i>
                                Git & Delivery Integration
                            </span>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Ticket ID</label>
                                    <input type="text" class="col-ticket input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" value="${window.generateTicketId('')}" placeholder="YANA-123">
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">PR Created?</label>
                                    <div class="relative">
                                        <select class="col-github-pr-created input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 appearance-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                            <option value="No" selected>No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                        <i data-lucide="git-pull-request" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Deployed?</label>
                                    <div class="relative">
                                        <select class="col-was-deployed input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 appearance-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                                            <option value="No" selected>No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                        <i data-lucide="server" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white border border-slate-200 rounded-lg p-2 space-y-1.5">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                     <div class="sm:col-span-2">
                                         <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Repository</label>
                                         <div class="relative flex items-center">
                                             <i data-lucide="folder-git-2" class="w-3 h-3 text-slate-400 absolute left-2"></i>
                                             <input type="text" class="col-github-repo-name input-field w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="owner/repo" value="N/A">
                                         </div>
                                     </div>
                                     <div>
                                         <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Branch</label>
                                         <div class="relative flex items-center">
                                             <i data-lucide="git-branch" class="w-3 h-3 text-slate-400 absolute left-1.5"></i>
                                             <input type="text" class="col-github-branch-name input-field w-full pl-6 pr-1 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="main" value="N/A">
                                         </div>
                                     </div>
                                     <div>
                                         <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Commits</label>
                                         <div class="relative flex items-center">
                                             <i data-lucide="hash" class="w-3 h-3 text-slate-400 absolute left-1.5"></i>
                                             <input type="number" class="col-github-commit-count input-field w-full pl-6 pr-1 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" min="0" value="0">
                                         </div>
                                     </div>
                                     <div class="sm:col-span-2">
                                         <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Git URL (Optional)</label>
                                         <div class="relative flex items-center">
                                             <i data-lucide="link" class="w-3 h-3 text-slate-400 absolute left-2"></i>
                                             <input type="url" class="col-link input-field w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="https://github.com/..." value="">
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom-Left: Shift & Handover Options (Span 6) -->
                    <div class="lg:col-span-6">
                        <div class="bg-indigo-50/30 border border-indigo-100 rounded-lg p-2.5 space-y-2 h-full flex flex-col justify-between">
                            <div>
                                <span class="block text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <i data-lucide="shuffle" class="w-3.5 h-3.5 text-indigo-400"></i>
                                    Shift & Handover Options
                                </span>
                                <div class="flex items-center gap-4 text-xs font-semibold text-slate-700 mb-1.5 bg-white p-1.5 rounded border border-slate-200/50">
                                    <label class="col-overtime-label hidden">
                                        <input type="checkbox" class="col-is-overtime" style="display: none;">
                                        <span>Extended Shift</span>
                                    </label>
                                    <label class="flex items-center gap-1.5 cursor-pointer text-[11px]">
                                        <input type="checkbox" class="col-is-handover rounded border-slate-350 text-indigo-600 focus:ring-indigo-500/20 w-3 h-3" onchange="window.toggleHandoverEmployeeSelect(this)">
                                        <span>Handover Task</span>
                                    </label>
                                </div>
                                <div class="col-handover-select-container hidden space-y-1.5">
                                    <div>
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Colleague Covered *</label>
                                        <div class="relative">
                                            <select class="col-handover-employee input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none" onchange="window.handleHandoverColleagueChange(this)">
                                                <option value="">-- Select Colleague --</option>
                                            </select>
                                            <i data-lucide="user" class="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div class="col-handover-task-container hidden">
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Select Handover Task *</label>
                                        <div class="relative">
                                            <select class="col-handover-task-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none" onchange="window.handleHandoverTaskChange(this)">
                                                <option value="">-- Select Task --</option>
                                            </select>
                                            <i data-lucide="clipboard-list" class="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-handover-ref-box-container hidden mt-1 bg-white border border-indigo-100 rounded p-2 text-xs shadow-sm">
                                <span class="block text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <i data-lucide="info" class="w-3 h-3 text-indigo-500"></i>
                                    Original Task
                                </span>
                                <div class="col-handover-ref-content text-slate-600 font-medium whitespace-pre-wrap leading-tight text-[10px]"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom-Right: Smart Tracking Parameters (Span 6) -->
                    <div class="lg:col-span-6">
                        <div class="bg-indigo-50/30 border border-indigo-100 rounded-lg p-2.5 space-y-2 h-full flex flex-col justify-between">
                            <div>
                                <span class="block text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-400"></i>
                                    Smart Tracking Parameters
                                </span>
                                <div class="grid grid-cols-3 gap-2">
                                    <!-- Sprint Name -->
                                    <div>
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Sprint</label>
                                        <div class="col-sprint-select-wrapper relative">
                                            <select class="col-sprint-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none" onchange="window.handleMetaDropdownSelect(this, 'sprint')">
                                                <option value="N/A" selected>N/A</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                        <input type="text" class="col-sprint input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 mt-1 hidden" value="N/A" placeholder="Sprint...">
                                        <div class="col-sprint-display-wrapper hidden">
                                            <div class="col-sprint-display-val py-0.5 px-1.5 bg-slate-100 rounded text-xs font-semibold text-slate-600 border border-slate-200 flex items-center gap-1">
                                                <i data-lucide="play" class="w-3 h-3 text-indigo-500"></i>
                                                <span>N/A</span>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Module Name -->
                                    <div>
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Module</label>
                                        <div class="col-module-select-wrapper relative">
                                            <select class="col-module-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none" onchange="window.handleMetaDropdownSelect(this, 'module')">
                                                <option value="N/A" selected>N/A</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                        <input type="text" class="col-module input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 mt-1 hidden" value="N/A" placeholder="Module...">
                                        <div class="col-module-display-wrapper hidden">
                                            <div class="col-module-display-val py-0.5 px-1.5 bg-slate-100 rounded text-xs font-semibold text-slate-600 border border-slate-200 flex items-center gap-1">
                                                <i data-lucide="grid" class="w-3 h-3 text-indigo-500"></i>
                                                <span>N/A</span>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Assigned Feature -->
                                    <div>
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Feature</label>
                                        <div class="col-feature-select-wrapper relative">
                                            <select class="col-feature-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none" onchange="window.handleMetaDropdownSelect(this, 'feature')">
                                                <option value="N/A" selected>N/A</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                        <input type="text" class="col-feature input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 mt-1 hidden" value="N/A" placeholder="Feature...">
                                        <div class="col-feature-display-wrapper hidden">
                                            <div class="col-feature-display-val py-0.5 px-1.5 bg-slate-100 rounded text-xs font-semibold text-slate-600 border border-slate-200 flex items-center gap-1">
                                                <i data-lucide="sparkles" class="w-3 h-3 text-indigo-500"></i>
                                                <span>N/A</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom Row: Textareas & Tech Stack (Full Width Span 12) -->
                    <div class="lg:col-span-12 border-t border-slate-150 pt-3 mt-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div class="task-textarea-container relative flex flex-col">
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Execution Details *</label>
                                <span class="char-counter text-[9px] font-bold text-slate-400">0 / 5000</span>
                            </div>
                            <div class="flex flex-wrap gap-1 mb-1">
                                <button type="button" class="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[9px] font-bold text-slate-500 border border-slate-200" onclick="window.insertTaskTemplate(this, 'API Development')">API Dev</button>
                                <button type="button" class="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[9px] font-bold text-slate-500 border border-slate-200" onclick="window.insertTaskTemplate(this, 'Bug Fixing')">Bug Fix</button>
                                <button type="button" class="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[9px] font-bold text-slate-500 border border-slate-200" onclick="window.insertTaskTemplate(this, 'UI Improvements')">UI</button>
                                <button type="button" class="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[9px] font-bold text-slate-500 border border-slate-200" onclick="window.insertTaskTemplate(this, 'Deployment')">Deploy</button>
                            </div>
                            <textarea required class="col-task input-field w-full px-3 py-1 bg-white border border-slate-355 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 transition-all flex-1 min-h-[60px]" placeholder="YANA-123: Created ledger analytics APIs..." oninput="window.autoExpandTextarea(this); window.updateCharCounter(this)"></textarea>
                        </div>
                        
                        <div class="flex flex-col space-y-2">
                            <div>
                                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tomorrow's Strategy</label>
                                <textarea class="col-plan input-field w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all min-h-[45px] resize-none" placeholder="What are the next steps?"></textarea>
                            </div>
                            <div class="tech-stack-wrapper">
                                <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tech Stack</label>
                                <div class="flex flex-wrap gap-1.5 items-center">
                                    <div class="relative shrink-0">
                                        <select class="col-tech-select input-field px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium appearance-none pr-5 focus:ring-1 focus:ring-indigo-500/20" onchange="window.techDropdownAddTag(this)">
                                            <option value="">+ Add</option>
                                            <option value="Python">Python</option>
                                            <option value="JavaScript">JavaScript</option>
                                            <option value="TypeScript">TypeScript</option>
                                            <option value="React">React</option>
                                            <option value="Next.js">Next.js</option>
                                            <option value="Vue">Vue</option>
                                            <option value="Angular">Angular</option>
                                            <option value="Node.js">Node.js</option>
                                            <option value="FastAPI">FastAPI</option>
                                            <option value="Flask">Flask</option>
                                            <option value="Django">Django</option>
                                            <option value="Spring Boot">Spring Boot</option>
                                            <option value="Go">Go</option>
                                            <option value="Rust">Rust</option>
                                            <option value="Java">Java</option>
                                            <option value="C#">C#</option>
                                            <option value="HTML">HTML</option>
                                            <option value="CSS">CSS</option>
                                            <option value="TailwindCSS">TailwindCSS</option>
                                            <option value="PostgreSQL">PostgreSQL</option>
                                            <option value="MySQL">MySQL</option>
                                            <option value="SQLite">SQLite</option>
                                            <option value="MongoDB">MongoDB</option>
                                            <option value="Redis">Redis</option>
                                            <option value="Docker">Docker</option>
                                            <option value="Kubernetes">Kubernetes</option>
                                            <option value="AWS">AWS</option>
                                            <option value="Git">Git</option>
                                            <option value="__custom__">Other...</option>
                                        </select>
                                        <i data-lucide="chevron-down" class="w-3 h-3 text-slate-405 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                    <div class="tech-tags-container flex flex-wrap gap-1"></div>
                                    <input type="hidden" class="col-tech col-tech-hidden" value="">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
            window.initSearchableSelect(item.querySelector('.project-searchable-select-container'), 'Engineering');

            window.loadProjectTechStack(item, '');
            if (window.lucide) lucide.createIcons();
            window.updateStickyHours();
            window.toggleRemoveButtonsVisibility('developer');
        };

        

        window.handlePlatformDropdownSelect = function (selectEl) {
            const val = selectEl.value;
            const container = selectEl.closest('.platform-tag-wrapper');
            const otherContainer = container.querySelector('.col-platform-other-container');
            
            if (val === 'Other') {
                otherContainer.classList.remove('hidden');
                otherContainer.classList.add('flex');
            } else {
                otherContainer.classList.add('hidden');
                otherContainer.classList.remove('flex');
                
                if (val) {
                    window.addPlatformTagValue(container, val);
                    selectEl.value = ''; // reset
                }
            }
        };

        window.handlePostedContentChange = function(selectEl) {
            if (selectEl.value === 'Yes') {
                const row = selectEl.closest('.con-task-item');
                const textarea = row.querySelector('.col-task');
                if (textarea) {
                    let currentVal = textarea.value;
                    if (!currentVal.includes("Paste Link: ")) {
                        if (currentVal && !currentVal.endsWith("\n")) {
                            textarea.value = currentVal + "\nPaste Link: ";
                        } else {
                            textarea.value = currentVal + "Paste Link: ";
                        }
                        window.autoExpandTextarea(textarea);
                        window.updateCharCounter(textarea);
                    }
                }
            }
        };

        window.handlePlatformOtherKeydown = function (event, inputEl) {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.handleAddOtherPlatformTag(inputEl);
            }
        };

        window.handleAddOtherPlatformTag = function (el) {
            const container = el.closest('.platform-tag-wrapper');
            const inputEl = container.querySelector('.col-platform-other-input');
            const val = inputEl.value.trim();
            if (!val) return;
            
            window.addPlatformTagValue(container, val);
            inputEl.value = ''; // reset custom input
            
            const otherContainer = container.querySelector('.col-platform-other-container');
            const selectEl = container.querySelector('.col-platform-select');
            otherContainer.classList.add('hidden');
            otherContainer.classList.remove('flex');
            selectEl.value = '';
        };

        window.addPlatformTagValue = function (container, val) {
            const tagDisplay = container.querySelector('.platform-tags-container');
            const hiddenInput = container.querySelector('.col-platform-hidden');

            let currentTags = hiddenInput.value ? hiddenInput.value.split(',') : [];
            if (currentTags.includes(val)) return;

            const tag = document.createElement('span');
            tag.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-2 mb-2 shadow-sm transition-all';
            tag.innerHTML = `
                ${val}
                <button type="button" class="ml-1.5 hover:text-rose-500 focus:outline-none flex items-center justify-center" onclick="window.removePlatformTag(this, '${val}')">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            `;
            tagDisplay.appendChild(tag);

            currentTags.push(val);
            hiddenInput.value = currentTags.join(',');

            if (window.lucide) lucide.createIcons();
        };

        window.removePlatformTag = function (buttonElement, val) {
            const container = buttonElement.closest('.platform-tag-wrapper');
            const hiddenInput = container.querySelector('.col-platform-hidden');
            let currentTags = hiddenInput.value ? hiddenInput.value.split(',') : [];
            currentTags = currentTags.filter(t => t !== val);
            hiddenInput.value = currentTags.join(',');
            buttonElement.parentElement.remove();
        };

window.addConTaskRow = function () {
            const container = document.getElementById('con-task-container');
            if (!container) return;
            const item = document.createElement('div');
            item.className = "con-task-item relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-200";
            item.innerHTML = `
                <button type="button" onclick="window.removeConTaskRow(this)" class="btn-remove-task absolute -top-2.5 -right-2.5 w-6 h-6 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-full flex items-center justify-center shadow-sm transition-all opacity-0 group-hover:opacity-100 z-20" title="Remove Task">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <input type="hidden" class="col-handover-source-task-id" value="">
                
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <!-- Left Column: Scope & Time (Span 6) -->
                    <div class="lg:col-span-6 space-y-2">
                        <div class="bg-slate-50/50 border border-slate-200/60 rounded-lg p-2.5 space-y-2">
                            <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <i data-lucide="compass" class="w-3.5 h-3.5 text-slate-400"></i>
                                Task Scope & Time
                            </span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Workspace *</label>
                                    <div class="project-searchable-select-container relative">
                                        <input type="hidden" class="col-project" value="" onchange="window.updateMilestones(this)">
                                        <button type="button" class="select-trigger w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium text-left flex items-center justify-between focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onclick="window.toggleSearchableSelect(this)">
                                            <span class="selected-text truncate">-- General / No Project --</span>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                                        </button>
                                        <div class="select-dropdown absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 hidden flex flex-col max-h-48 overflow-hidden">
                                            <div class="p-1.5 border-b border-slate-100 shrink-0 flex items-center">
                                                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0"></i>
                                                <input type="text" class="select-search-input w-full px-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-rose-500 transition-all" placeholder="Search projects..." oninput="window.filterSearchableSelect(this)">
                                            </div>
                                            <div class="options-list overflow-y-auto flex-1 py-0.5"></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Milestone / Task</label>
                                    <div class="relative">
                                        <select class="col-milestone input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-505 transition-all" onchange="window.autoFillSmartMilestone(this)">
                                            <option value="">General Task (No Milestone)</option>
                                        </select>
                                        <i data-lucide="target" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="no-project-reason-container">
                                <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">No Project Reason *</label>
                                <input type="text" required class="col-no-project-reason input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" placeholder="Reason for no project selection">
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Time (Hrs) *</label>
                                    <div class="relative">
                                        <select class="col-hours input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-bold appearance-none focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onchange="window.updateStickyHours()">
                                            ${window.getHourOptions()}
                                        </select>
                                        <i data-lucide="clock" class="w-3.5 h-3.5 text-rose-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Status *</label>
                                    <div class="relative">
                                        <select class="col-status input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all">
                                            <option value="Completed" selected>Completed</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Blocked">Blocked</option>
                                            <option value="Pending Review">Pending Review</option>
                                        </select>
                                        <i data-lucide="activity" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Work Type *</label>
                                    <div class="col-work-type-select-wrapper relative">
                                        <select class="col-work-type-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 font-medium appearance-none focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onchange="window.handleMetaDropdownSelect(this, 'work-type')">
                                            <option value="Marketing" selected>Marketing</option>
                                            <option value="Social Media">Social Media</option>
                                            <option value="Ads">Ads Management</option>
                                            <option value="Sales">Sales & Outreach</option>
                                            <option value="Research">Research</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <i data-lucide="layers" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-arrow"></i>
                                    </div>
                                    <input type="text" class="col-work-type input-field w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:bg-white mt-1 hidden" value="Marketing" placeholder="Custom work type...">
                                    <div class="col-work-type-display-wrapper hidden">
                                        <div class="col-work-type-display-val py-1 px-2 bg-slate-100 rounded text-xs font-semibold text-slate-600 border border-slate-200">Marketing</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column: Shift & Handover Options (Span 6) -->
                    <div class="lg:col-span-6">
                        <div class="bg-rose-50/30 border border-rose-100 rounded-lg p-2.5 space-y-2 h-full flex flex-col justify-between">
                            <div>
                                <span class="block text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <i data-lucide="shuffle" class="w-3.5 h-3.5 text-rose-500"></i>
                                    Shift & Handover Options
                                </span>
                                <div class="flex items-center gap-4 text-xs font-semibold text-slate-700 mb-1.5 bg-white p-1.5 rounded border border-slate-200/50">
                                    <label class="col-overtime-label hidden">
                                        <input type="checkbox" class="col-is-overtime" style="display: none;">
                                        <span>Extended Shift</span>
                                    </label>
                                    <label class="flex items-center gap-1.5 cursor-pointer text-[11px]">
                                        <input type="checkbox" class="col-is-handover rounded border-slate-350 text-rose-600 focus:ring-rose-500/20 w-3 h-3" onchange="window.toggleHandoverEmployeeSelect(this)">
                                        <span>Handover Task</span>
                                    </label>
                                </div>
                                <div class="col-handover-select-container hidden space-y-1.5">
                                    <div>
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Colleague Covered *</label>
                                        <div class="relative">
                                            <select class="col-handover-employee input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onchange="window.handleHandoverColleagueChange(this)">
                                                <option value="">-- Select Colleague --</option>
                                            </select>
                                            <i data-lucide="user" class="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div class="col-handover-task-container hidden">
                                        <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Select Handover Task *</label>
                                        <div class="relative">
                                            <select class="col-handover-task-select input-field w-full pl-2 pr-7 py-1 bg-white border border-slate-200 rounded outline-none text-xs font-medium appearance-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onchange="window.handleHandoverTaskChange(this)">
                                                <option value="">-- Select Task --</option>
                                            </select>
                                            <i data-lucide="clipboard-list" class="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-handover-ref-box-container hidden mt-1 bg-white border border-rose-100 rounded-lg p-2 text-xs shadow-sm">
                                <span class="block text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <i data-lucide="info" class="w-3 h-3 text-rose-500"></i>
                                    Original Task
                                </span>
                                <div class="col-handover-ref-content text-slate-600 font-medium whitespace-pre-wrap leading-tight text-[10px]"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Middle Row: Metrics & Platforms (Span 12) - Optimized space utilization -->
                    <div class="lg:col-span-12 space-y-2">
                        <div class="bg-rose-50/20 border border-rose-100 rounded-lg p-2.5 space-y-2">
                            <span class="block text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                                <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-rose-500"></i>
                                Content Metrics & Deliverables
                            </span>
                            
                            <div class="col-metrics-wrapper">
                                <!-- Static Metrics (4 default fields) -->
                                <div class="static-metrics-container">
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-2.5 rounded border border-slate-200/60">
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5 truncate flex items-center gap-0.5"><i data-lucide="smartphone" class="w-3 h-3 text-pink-500"></i> Reels</label>
                                            <input type="number" min="0" value="0" class="col-reels input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5 truncate flex items-center gap-0.5"><i data-lucide="youtube" class="w-3 h-3 text-red-500"></i> Videos</label>
                                            <input type="number" min="0" value="0" class="col-videos input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5 truncate flex items-center gap-0.5"><i data-lucide="image" class="w-3 h-3 text-indigo-500"></i> Posters</label>
                                            <input type="number" min="0" value="0" class="col-posters input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5 truncate flex items-center gap-0.5"><i data-lucide="phone-call" class="w-3 h-3 text-emerald-500"></i> Calls</label>
                                            <input type="number" min="0" value="0" class="col-calls input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-bold outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Custom Metrics (Dynamic Fields) -->
                                <div class="custom-metrics-container hidden space-y-2">
                                    <div class="col-deadlines-info p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-850 font-medium mb-1.5 flex flex-row justify-around gap-4 hidden">
                                        <div><strong>Last Logged Upload Deadline:</strong> <span class="last-upload-deadline-val">N/A</span></div>
                                        <div><strong>Last Logged Next Date of Giving:</strong> <span class="last-giving-date-val">N/A</span></div>
                                    </div>
                                    
                                    <!-- Custom fields injected dynamically with auto column scaling -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-white p-2.5 rounded border border-slate-200/60 custom-fields-grid">
                                        <!-- Custom fields injected dynamically -->
                                    </div>
                                    
                                    <!-- Deadlines row -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded border border-slate-200/60">
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Upload Deadline *</label>
                                            <input type="date" class="col-upload-deadline input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Next Date of Giving *</label>
                                            <input type="date" class="col-next-delivery-date input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-rose-505 focus:ring-1 focus:ring-rose-500/20 transition-all shadow-sm">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Platforms and Ticket ID -->
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-slate-200/60">
                                <div class="platform-tag-wrapper md:col-span-8">
                                    <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Target Platform(s)</label>
                                    <div class="flex flex-col sm:flex-row gap-2">
                                        <div class="relative w-full sm:w-48">
                                            <select class="col-platform-select input-field w-full pl-2 pr-7 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-xs font-medium appearance-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 transition-all" onchange="window.handlePlatformDropdownSelect(this)">
                                                <option value="">-- Add Platform --</option>
                                                <option value="YouTube">YouTube</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="Facebook">Facebook</option>
                                                <option value="LinkedIn">LinkedIn</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                        </div>
                                        <div class="col-platform-other-container hidden flex gap-1.5 flex-1">
                                            <input type="text" class="col-platform-other-input input-field flex-1 px-2 py-1 bg-white border border-slate-200 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-rose-500/20 focus:border-rose-505 transition-all" placeholder="Custom platform..." onkeydown="window.handlePlatformOtherKeydown(event, this)">
                                            <button type="button" onclick="window.handleAddOtherPlatformTag(this)" class="px-3 py-1 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded transition-colors shadow-sm">Add</button>
                                        </div>
                                    </div>
                                    <div class="platform-tags-container flex flex-wrap mt-1.5 gap-1 min-h-[20px]"></div>
                                    <input type="hidden" class="col-platform-hidden" value="">
                                </div>
                                <div class="md:col-span-4 flex flex-col justify-center">
                                    <div class="grid grid-cols-2 gap-2">
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Did you post content? *</label>
                                            <div class="relative">
                                                <select class="col-posted-content col-was-deployed input-field w-full pl-2 pr-7 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-xs font-medium appearance-none focus:ring-1 focus:ring-rose-500/20 focus:border-rose-505 transition-all" onchange="window.handlePostedContentChange(this)">
                                                    <option value="No" selected>No</option>
                                                    <option value="Yes">Yes</option>
                                                </select>
                                                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-bold text-slate-500 mb-0.5">Ticket ID</label>
                                            <input type="text" class="col-ticket input-field w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-xs text-slate-750 focus:bg-white focus:ring-1 focus:ring-rose-500/20 focus:border-rose-505 transition-all" value="${window.generateTicketId('')}" placeholder="e.g. YANA-123">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom Row: Textarea (Full Width Span 12) -->
                    <div class="lg:col-span-12 border-t border-slate-150 pt-3 mt-1">
                        <div class="task-textarea-container relative flex flex-col">
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Task Performed *</label>
                                <span class="char-counter text-[9px] font-bold text-slate-400">0 / 5000</span>
                            </div>
                            <div class="flex flex-wrap gap-1 mb-1.5">
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Scripting & Storyboarding')">Scripting</button>
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Recording / Filming')">Recording</button>
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Video Editing & Post-Production')">Video Edit</button>
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Graphic Poster Design')">Poster Design</button>
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Voiceover & Audio Sync')">Voiceover</button>
                                <button type="button" class="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold text-rose-600 transition-colors border border-rose-200 shadow-sm" onclick="window.insertTaskTemplate(this, 'Social Media Performance Analytics')">Analytics</button>
                            </div>
                            <textarea required class="col-task input-field w-full px-3 py-1 bg-white border border-slate-350 rounded outline-none text-xs text-slate-700 focus:ring-1 focus:ring-rose-500/20 transition-all min-h-[60px]" placeholder="Wrote script for product marketing video..." oninput="window.autoExpandTextarea(this); window.updateCharCounter(this)"></textarea>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
            window.initSearchableSelect(item.querySelector('.project-searchable-select-container'), 'Content');

            if (window.lucide) lucide.createIcons();
            window.updateStickyHours();
            window.toggleRemoveButtonsVisibility('content');
        };

        

        

        function getUploadBoxHtml(label, type, subType, currentValue) {
            const emp = state.employeeData || {};
            const isUploaded = currentValue && currentValue !== 'N/A';
            const inputId = `upload-${type}-${subType}`;
            const isLocked = emp.compliance_verified === true && ['adhar', 'pancard', 'qr_code'].includes(type);

            return `
                <div class="border border-dashed ${isLocked ? 'border-slate-700 bg-slate-900/30 opacity-75' : isUploaded ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 bg-slate-900/50 hover:border-brand-primary'} rounded-xl p-3 flex flex-col items-center justify-center text-center relative transition-colors group h-24">
                    ${isLocked ? '' : `<input type="file" id="${inputId}" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onchange="handleFileUpload(event, '${type}', '${subType}')">`}
                    
                    ${isUploaded ? `
                        ${isLocked ? '' : `
                        <button onclick="event.stopPropagation(); handleFileDelete('${type}', '${subType}')" class="absolute top-2 right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-20 opacity-0 group-hover:opacity-100" title="Delete File">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                        `}
                        <i data-lucide="${isLocked ? 'lock' : 'check-circle'}" class="w-5 h-5 ${isLocked ? 'text-slate-400' : 'text-emerald-400'} mb-1.5"></i>
                        <span class="text-[10px] font-bold text-slate-200 leading-tight">${label}</span>
                        <span class="text-[9px] ${isLocked ? 'text-slate-400' : 'text-emerald-400'} mt-1 uppercase tracking-wider font-bold">${isLocked ? 'Locked' : 'Uploaded'}</span>
                    ` : `
                        <i data-lucide="${isLocked ? 'lock' : 'upload-cloud'}" class="w-5 h-5 text-slate-500 group-hover:text-brand-primary mb-1.5 transition-colors"></i>
                        <span class="text-[10px] font-bold text-slate-300 leading-tight">${label}</span>
                        <span class="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">${isLocked ? 'Locked' : 'Required'}</span>
                    `}
                </div>
            `;
        }

        // --- Action Handlers ---
        window.handleCheckIn = async function(event, workMode = 'Office') {
            event.preventDefault();
            const btn = event.currentTarget;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Checking in...';
            btn.disabled = true;

            try {
                await apiFetch('/attendance/check-in', {
                    method: 'POST',
                    body: {
                        work_mode: workMode,
                        device_info: navigator.userAgent
                    }
                });
                showToast('Successfully checked in for today!', 'success');
                await loadEmployeeWorkspaceData();
                renderEmployeeApp();
            } catch (error) {
                showToast('Check-in failed: ' + error.message, 'error');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        window.handleCheckOut = async function(event) {
            event.preventDefault();
            const btn = event.currentTarget;
            const originalHtml = btn.innerHTML;

            const isConfirmed = await customConfirm("Check Out", "Are you sure you want to check out? You cannot check back in today.", "Check Out", "Cancel", true);
            if (!isConfirmed) return;

            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Checking out...';
            btn.disabled = true;

            try {
                await apiFetch('/attendance/check-out', {
                    method: 'POST',
                    body: {
                        device_info: navigator.userAgent
                    }
                });
                showToast('Successfully checked out. Have a great rest of your day!', 'success');
                await loadEmployeeWorkspaceData();
                renderEmployeeApp();
            } catch (error) {
                showToast('Check-out failed: ' + error.message, 'error');
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        async function handleTaskSubmit(event, type) {
            event.preventDefault();
            const btn = document.getElementById(`btn-submit-${type === 'developer' ? 'dev' : 'con'}`);
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin text-white mx-auto"></i>';
            btn.disabled = true;

            try {
                // Check if employee checked in today
                const localTodayStr = new Date().toLocaleDateString('sv-SE');
                const hasCheckedIn = state.myAttendance && state.myAttendance.some(a => {
                    const checkInDate = a.check_in_time ? a.check_in_time.split(' ')[0] : (a.date ? a.date.split(' ')[0] : '');
                    return checkInDate === localTodayStr;
                });
                if (!hasCheckedIn) {
                    throw new Error("You cannot submit timesheets without checking in for the day. Please check in using the dashboard widget first.");
                }

                // Check daily limit Target
                const normalLimit = parseFloat(state.employeeData?.working_hours) || 8.0;
                const alreadyLogged = window.getAlreadyLoggedHoursToday();
                let currentChosen = 0.0;
                const hoursElements = document.querySelectorAll(type === 'developer' ? '.dev-task-item .col-hours' : '.con-task-item .col-hours');
                hoursElements.forEach(select => {
                    currentChosen += parseFloat(select.value) || 0.0;
                });

                const totalAggregate = alreadyLogged + currentChosen;
                const isOvertime = totalAggregate > normalLimit;
                const limit = isOvertime ? 24.0 : normalLimit;
                if (totalAggregate > limit) {
                    throw new Error(`Daily work limit exceeded. Your daily target/limit is ${limit} hours. You have already logged ${alreadyLogged.toFixed(1)} hours today and are attempting to submit ${currentChosen.toFixed(1)} hours, which totals ${totalAggregate.toFixed(1)} hours. Please adjust your entries.`);
                }

                if (type === 'developer') {
                    const rows = document.querySelectorAll('.dev-task-item');
                    const batchPayload = [];
                    for (const row of rows) {
                        const projectId = row.querySelector('.col-project')?.value || null;
                        const milestoneId = row.querySelector('.col-milestone')?.value || null;

                        const hours = parseFloat(row.querySelector('.col-hours')?.value) || 0;
                        const taskPerformed = row.querySelector('.col-task')?.value || '';
                        const tomorrowPlan = row.querySelector('.col-plan')?.value || 'N/A';
                        const githubLink = (row.querySelector('.col-link')?.value || '').trim() || 'N/A';
                        const githubPrCreated = row.querySelector('.col-github-pr-created')?.value || 'No';
                        const githubRepoName = (row.querySelector('.col-github-repo-name')?.value || '').trim();
                        const githubBranchName = (row.querySelector('.col-github-branch-name')?.value || '').trim();
                        const githubCommitCount = parseInt(row.querySelector('.col-github-commit-count')?.value) || 0;
                        const techStack = row.querySelector('.col-tech')?.value || 'N/A';

                        const sprint = row.querySelector('.col-sprint')?.value || 'N/A';
                        const module = row.querySelector('.col-module')?.value || 'N/A';
                        const feature = row.querySelector('.col-feature')?.value || 'N/A';
                        const ticketId = row.querySelector('.col-ticket')?.value || 'N/A';
                        const noProjectReason = row.querySelector('.col-no-project-reason')?.value || 'N/A';
                        const taskStatus = row.querySelector('.col-status')?.value || 'Completed';
                        const workType = row.querySelector('.col-work-type')?.value || 'Development';

                        const isOvertimeVal = isOvertime;
                        const isHandover = row.querySelector('.col-is-handover')?.checked || false;
                        const handoverForEmployeeId = isHandover ? (row.querySelector('.col-handover-employee')?.value || null) : null;
                        const handoverSourceTaskId = row.querySelector('.col-handover-source-task-id')?.value || null;

                        if (isHandover && !handoverForEmployeeId) {
                            throw new Error("You must select the colleague being covered for all handover tasks.");
                        }

                        if (!hours) {
                            throw new Error("Each task must have valid hours selected.");
                        }
                        const strippedTask = taskPerformed.trim();
                        if (strippedTask.length < 20) {
                            throw new Error("Execution details must be at least 20 characters long.");
                        }
                        if (strippedTask.length > 5000) {
                            throw new Error("Execution details cannot exceed 5000 characters.");
                        }
                        if (new Set(strippedTask).size < 5 && strippedTask.length > 50) {
                            throw new Error("Repeated spam characters detected in Execution Details.");
                        }

                        if (githubPrCreated === 'Yes') {
                            if (!githubRepoName || githubRepoName === 'N/A') {
                                throw new Error("Repository is required when PR is created.");
                            }
                            if (!githubBranchName || githubBranchName === 'N/A') {
                                throw new Error("Branch name is required when PR is created.");
                            }
                            if (githubCommitCount <= 0) {
                                throw new Error("Commit count must be greater than 0 when PR is created.");
                            }
                        }

                        if (githubLink && githubLink !== 'N/A') {
                            if (!githubLink.startsWith('https://')) {
                                throw new Error("GitHub Link must start with https://");
                            }
                            const allowed = ['github.com', 'gitlab.com', 'bitbucket.org'];
                            if (!allowed.some(d => githubLink.includes(d))) {
                                throw new Error("GitHub Link must be from github.com, gitlab.com, or bitbucket.org");
                            }
                        }

                        if (techStack && techStack !== 'N/A') {
                            const tags = techStack.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                            if (tags.length > 15) {
                                throw new Error("Tech stack cannot exceed 15 tags.");
                            }
                            if (tags.length !== new Set(tags).size) {
                                throw new Error("Tech stack cannot contain duplicate tags.");
                            }
                        }

                        batchPayload.push({
                            employee_id: state.user.id,
                            project_id: projectId || null,
                            milestone_id: milestoneId || null,
                            hours_logged: hours,
                            tech_stack: techStack,
                            github_link: githubLink,
                            github_pr_created: githubPrCreated,
                            github_repo_name: githubRepoName || 'N/A',
                            github_branch_name: githubBranchName || 'N/A',
                            github_commit_count: githubCommitCount,
                            task_performed: taskPerformed,
                            tomorrow_plan: tomorrowPlan,
                            sprint,
                            module,
                            feature,
                            ticket_id: ticketId,
                            no_project_reason: noProjectReason,
                            task_status: taskStatus,
                            work_type: workType,
                            was_deployed: row.querySelector('.col-was-deployed')?.value || 'No',
                            is_overtime: isOvertimeVal,
                            is_handover: isHandover,
                            handover_for_employee_id: handoverForEmployeeId,
                            handover_source_task_id: handoverSourceTaskId
                        });
                    }

                    if (batchPayload.length === 0) {
                        throw new Error("No tasks to submit.");
                    }

                    await apiFetch(`/tasks/developer/batch-create`, { method: 'POST', body: batchPayload });
                    showToast("Batch Timesheet submitted successfully!", "success");
                } else {
                    const rows = document.querySelectorAll('.con-task-item');
                    const batchPayload = [];
                    for (const row of rows) {
                        const projectId = row.querySelector('.col-project')?.value || null;
                        const milestoneId = row.querySelector('.col-milestone')?.value || null;

                        const hours = parseFloat(row.querySelector('.col-hours')?.value) || 0;
                        const taskPerformed = row.querySelector('.col-task')?.value || '';

                        const sprint = row.querySelector('.col-sprint')?.value || 'N/A';
                        const module = row.querySelector('.col-module')?.value || 'N/A';
                        const feature = row.querySelector('.col-feature')?.value || 'N/A';
                        const ticketId = row.querySelector('.col-ticket')?.value || 'N/A';
                        const noProjectReason = row.querySelector('.col-no-project-reason')?.value || 'N/A';
                        const taskStatus = row.querySelector('.col-status')?.value || 'Completed';
                        const workType = row.querySelector('.col-work-type')?.value || 'Development';

                        const isOvertimeVal = isOvertime;
                        const isHandover = row.querySelector('.col-is-handover')?.checked || false;
                        const handoverForEmployeeId = isHandover ? (row.querySelector('.col-handover-employee')?.value || null) : null;
                        const handoverSourceTaskId = row.querySelector('.col-handover-source-task-id')?.value || null;

                        if (isHandover && !handoverForEmployeeId) {
                            throw new Error("You must select the colleague being covered for all handover tasks.");
                        }

                        if (!hours) {
                            throw new Error("Each task must have valid hours selected.");
                        }
                        const strippedTask = taskPerformed.trim();
                        if (strippedTask.length < 20) {
                            throw new Error("Task Performed details must be at least 20 characters long.");
                        }
                        if (strippedTask.length > 5000) {
                            throw new Error("Task Performed details cannot exceed 5000 characters.");
                        }
                        if (new Set(strippedTask).size < 5 && strippedTask.length > 50) {
                            throw new Error("Repeated spam characters detected in Task Performed.");
                        }

                        // Check if row has custom content fields
                        const customFieldInputs = row.querySelectorAll('.col-custom-field-input');
                        let customFieldValuesStr = "[]";
                        let uploadDeadlineVal = "N/A";
                        let nextDeliveryDateVal = "N/A";
                        let reelsVal = 0;
                        let videosVal = 0;
                        let postersVal = 0;
                        let callsVal = 0;

                        if (customFieldInputs.length > 0) {
                            const customVals = {};
                            customFieldInputs.forEach(inp => {
                                const name = inp.getAttribute('data-field-name');
                                const val = parseInt(inp.value) || 0;
                                customVals[name] = val;
                                
                                // map custom fields to traditional fields to avoid breaking legacy reports
                                const nameLower = name.toLowerCase();
                                if (nameLower.includes('reel')) reelsVal += val;
                                else if (nameLower.includes('video')) videosVal += val;
                                else if (nameLower.includes('poster') || nameLower.includes('graphic') || nameLower.includes('design')) postersVal += val;
                                else if (nameLower.includes('call')) callsVal += val;
                            });
                            customFieldValuesStr = JSON.stringify(customVals);
                            uploadDeadlineVal = row.querySelector('.col-upload-deadline')?.value || 'N/A';
                            nextDeliveryDateVal = row.querySelector('.col-next-delivery-date')?.value || 'N/A';
                        } else {
                            reelsVal = parseInt(row.querySelector('.col-reels')?.value) || 0;
                            videosVal = parseInt(row.querySelector('.col-videos')?.value) || 0;
                            postersVal = parseInt(row.querySelector('.col-posters')?.value) || 0;
                            callsVal = parseInt(row.querySelector('.col-calls')?.value) || 0;
                        }

                        let payload = {
                            employee_id: state.user.id,
                            project_id: projectId || null,
                            milestone_id: milestoneId || null,
                            hours_logged: hours,
                            task_performed: taskPerformed,
                            reels_count: reelsVal,
                            long_video_count: videosVal,
                            poster_count: postersVal,
                            calls_made: callsVal,
                            custom_field_values: customFieldValuesStr,
                            upload_deadline: uploadDeadlineVal,
                            next_delivery_date: nextDeliveryDateVal,
                            platform: row.querySelector('.col-platform-hidden').value || 'N/A',
                            sprint,
                            module,
                            feature,
                            ticket_id: ticketId,
                            no_project_reason: noProjectReason,
                            task_status: taskStatus,
                            work_type: workType,
                            was_deployed: row.querySelector('.col-was-deployed')?.value || 'No',
                            is_overtime: isOvertimeVal,
                            is_handover: isHandover,
                            handover_for_employee_id: handoverForEmployeeId,
                            handover_source_task_id: handoverSourceTaskId
                        };
                        batchPayload.push(payload);
                    }

                    if (batchPayload.length === 0) {
                        throw new Error("No tasks to submit.");
                    }

                    await apiFetch(`/tasks/content/batch-create`, { method: 'POST', body: batchPayload });
                    showToast("Batch Content Timesheet submitted successfully!", "success");
                }

                await loadEmployeeWorkspaceData();
                routeApp('dashboard');

            } catch (error) {
                showToast("Submission failed: " + error.message, "error");
                btn.innerHTML = originalText; btn.disabled = false;
                lucide.createIcons();
            }
        }
        async function handleFileUpload(event, type, subType) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast("File is too large. Maximum size is 5MB.", "error");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {
                showToast(`Uploading ${subType} image...`, "info");
                await apiFetch(`/uploads/image/?image_type=${type}&sub_type=${subType}`, {
                    method: 'POST', body: formData
                });

                showToast("Upload successful!", "success");
                await loadEmployeeWorkspaceData();
                routeApp('profile');
            } catch (error) {
                showToast("Upload failed: " + error.message, "error");
            }
        }

        window.handleProfilePhotoDelete = async function() {
            const isConfirmed = await customConfirm("Delete Profile Photo", "Are you sure you want to remove your profile photo?", "Delete", "Cancel", true);
            if (!isConfirmed) return;

            try {
                showToast("Deleting profile photo...", "info");
                await apiFetch(`/uploads/image/?image_type=profile&sub_type=profile`, {
                    method: 'DELETE'
                });

                showToast("Profile photo deleted successfully", "success");
                await loadEmployeeWorkspaceData();
                routeApp('profile');
            } catch (error) {
                showToast("Deletion failed: " + error.message, "error");
            }
        };

        async function handleFileDelete(type, subType) {
            const isConfirmed = await customConfirm("Delete File", `Are you sure you want to delete this ${type} ${subType} document? This action cannot be undone.`, "Delete", "Cancel", true);
            if (!isConfirmed) return;

            try {
                showToast("Deleting file...", "info");
                await apiFetch(`/uploads/image/?image_type=${type}&sub_type=${subType}`, {
                    method: 'DELETE'
                });

                showToast("File deleted successfully", "success");
                await loadEmployeeWorkspaceData();
                routeApp('profile');
            } catch (error) {
                showToast("Deletion failed: " + error.message, "error");
            }
        }

        function openChangePasswordModal() {
            const html = `
                <form onsubmit="handleChangePassword(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">New Password *</label>
                        <input type="password" id="cp_new" required minlength="8" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="••••••••">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                        <input type="password" id="cp_confirm" required minlength="8" class="input-field w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" placeholder="••••••••">
                    </div>
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnChangePwd" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="key" class="w-4 h-4"></i> Update Password
                        </button>
                    </div>
                </form>
            `;
            openModal('Change Password', html);
        }


        async function handleChangePassword(e) {
            e.preventDefault();
            const pass = document.getElementById('cp_new').value;
            const confirm = document.getElementById('cp_confirm').value;
            if (pass !== confirm) {
                showToast("Passwords do not match!", "error");
                return;
            }

            const btn = document.getElementById('btnChangePwd');
            const og = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Updating...';
            btn.disabled = true;

            try {
                await apiFetch('/employees/update/' + state.user.id, {
                    method: 'PUT',
                    body: { password: pass }
                });
                showToast("Password updated successfully!", "success");
                closeModal();
            } catch (err) {
                showToast("Failed to update password: " + err.message, "error");
            } finally {
                if (btn) { btn.innerHTML = og; btn.disabled = false; lucide.createIcons(); }
            }
        }

        function handleSkillKeydown(event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const val = event.target.value.trim();
                if (val) {
                    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
                    parts.forEach(part => {
                        if (!state.editSkills.includes(part)) {
                            state.editSkills.push(part);
                        }
                    });
                    renderSkillsTags();
                    event.target.value = '';
                }
            }
        }

        function removeSkill(idx) {
            state.editSkills.splice(idx, 1);
            renderSkillsTags();
        }

        function renderSkillsTags() {
            const container = document.getElementById('edit_skills_container');
            if (container) {
                container.innerHTML = state.editSkills.map((s, i) => `
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-brand-primary border border-indigo-100">
                        ${s} 
                        <button type="button" onclick="removeSkill(${i})" class="ml-1.5 hover:text-indigo-800 text-sm leading-none focus:outline-none">&times;</button>
                    </span>
                `).join('');
            }
        }

        function handleDevTechKeydown(event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const val = event.target.value.trim();
                if (val) {
                    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
                    parts.forEach(part => {
                        if (!state.devTechStack.includes(part)) {
                            state.devTechStack.push(part);
                        }
                    });
                    renderDevTechTags();
                    event.target.value = '';
                }
            }
        }

        function removeDevTech(idx) {
            state.devTechStack.splice(idx, 1);
            renderDevTechTags();
        }

        function renderDevTechTags() {
            const container = document.getElementById('dev_tech_container');
            if (container) {
                container.innerHTML = state.devTechStack.map((t, i) => `
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-brand-primary border border-indigo-100">
                        ${t} 
                        <button type="button" onclick="removeDevTech(${i})" class="ml-1.5 hover:text-indigo-800 text-sm leading-none focus:outline-none">&times;</button>
                    </span>
                `).join('');
            }
        }

        window.profileTimerInterval = null;
        window.startProfileUnlockTimer = function() {
            if (window.profileTimerInterval) clearInterval(window.profileTimerInterval);
            const countdownEl = document.getElementById('profile-unlock-countdown');
            if (!countdownEl || !state.employeeData || !state.employeeData.profile_unlocked_until) return;

            const targetTime = new Date(state.employeeData.profile_unlocked_until).getTime();
            
            function updateTimer() {
                const nowUtc = Date.now() + (new Date().getTimezoneOffset() * 60000);
                const distance = targetTime - nowUtc;
                
                if (distance <= 0) {
                    clearInterval(window.profileTimerInterval);
                    countdownEl.innerHTML = "Expired!";
                    showToast("Profile unlock window expired. Re-locking profile.", "warning");
                    apiFetch('/employees/lock-profile', { method: 'POST', body: {} })
                        .then(() => loadEmployeeWorkspaceData())
                        .then(() => {
                            state.isEditingProfile = false;
                            renderEmployeeApp();
                        })
                        .catch(err => console.error("Error auto-locking:", err));
                    return;
                }
                
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                countdownEl.innerHTML = `${minutes}m ${seconds}s`;
            }
            
            updateTimer();
            window.profileTimerInterval = setInterval(updateTimer, 1000);
        };

        function toggleEditProfile() {
            state.isEditingProfile = !state.isEditingProfile;
            if (state.isEditingProfile) {
                const emp = state.employeeData || {};
                let skillsList = [];
                try {
                    if (emp.skills && emp.skills !== 'N/A' && emp.skills !== '[]') {
                        if (typeof emp.skills === 'string' && emp.skills.startsWith('[')) {
                            skillsList = JSON.parse(emp.skills);
                        } else if (typeof emp.skills === 'string') {
                            skillsList = emp.skills.split(',').map(s => s.trim()).filter(Boolean);
                        } else if (Array.isArray(emp.skills)) {
                            skillsList = emp.skills;
                        }
                    }
                } catch (e) { }
                state.editSkills = skillsList;
                renderEmployeeApp();
                setTimeout(checkAndPromptDraft, 100);
            } else {
                localStorage.removeItem(`yana_profile_draft_${state.user.id}`);
                if (state.employeeData.profile_unlocked) {
                    apiFetch('/employees/lock-profile', { method: 'POST', body: {} })
                        .then(() => loadEmployeeWorkspaceData())
                        .then(() => renderEmployeeApp())
                        .catch(err => console.error("Error re-locking profile:", err));
                } else {
                    renderEmployeeApp();
                }
            }
        }

        function checkMandatoryFieldsMissing(emp) {
            const mandatoryFields = {
                "full_name": "Full Legal Name",
                "date_of_birth": "Date of Birth",
                "gender": "Gender",
                "address": "Permanent Address",
                "contact_number": "Primary Phone",
                "email": "Primary Email",
                "emergency_contact": "Emergency Contact Name & Number",
                "relationship_with_emergency_contact": "Relationship",
                "date_of_joining": "Date of Joining",
                "reporting_manager": "Reporting Manager",
                "highest_qualification": "Highest Qualification"
            };
            const missing = [];
            for (const [key, label] of Object.entries(mandatoryFields)) {
                const val = emp[key];
                if (val === undefined || val === null || val === '' || String(val).trim().toUpperCase() === 'N/A') {
                    missing.push(label);
                }
            }
            return missing;
        }

        async function requestProfileUnlock() {
            try {
                const res = await apiFetch('/employees/request-unlock', { method: 'POST', body: {} });
                showToast(res.message || "Unlock request submitted successfully.", "success");
                await loadEmployeeWorkspaceData();
                renderEmployeeApp();
            } catch (err) {
                showToast(err.message || "Failed to submit request.", "error");
            }
        }

        async function handleProfileSave(event) {
            event.preventDefault();
            const btn = document.getElementById('saveProfileBtn');
            const ogText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Saving...';
            btn.disabled = true;

            const fields = [
                'full_name', 'fathers_name', 'date_of_birth', 'contact_number', 'alternate_contact', 'address',
                'email', 'alternate_email', 'date_of_joining', 'reporting_manager', 'highest_qualification', 'specialization',
                'experience', 'previous_employer', 'previous_job_role', 'skills', 'emergency_contact',
                'relationship_with_emergency_contact', 'bank_name', 'bank_account', 'ifsc_code', 'upi_id', 'resume',
                'account_holder_name', 'pf_number', 'esic_number', 'tax_details', 'adhar_number', 'pan_number'
            ];

            const payload = {};
            fields.forEach(field => {
                if (field === 'skills') {
                    payload['skills'] = JSON.stringify(state.editSkills);
                    return;
                }
                let el = document.getElementById(`edit_${field}`);
                if (!el && field === 'highest_qualification') el = document.getElementById('edit_highest_qualification');
                if (!el && field === 'relationship_with_emergency_contact') el = document.getElementById('edit_relationship_with_emergency_contact');
                if (el) payload[field] = el.value || "N/A";
            });

            // Gender is a select dropdown
            const genderEl = document.getElementById('edit_gender');
            if (genderEl) payload['gender'] = genderEl.value;

            // Emergency contact split fields
            const ecNameEl = document.getElementById('edit_emergency_contact_name');
            const ecPhoneEl = document.getElementById('edit_emergency_contact_phone');
            if (ecNameEl && ecPhoneEl) {
                payload['emergency_contact'] = `${ecNameEl.value.trim()} - ${ecPhoneEl.value.trim()}`;
            }

            // Check if email or contact number changed
            const emailChanged = payload.email && payload.email !== (state.employeeData.email || 'N/A') && state.employeeData.email !== 'N/A' && state.employeeData.email !== '';
            const phoneChanged = payload.contact_number && payload.contact_number !== (state.employeeData.contact_number || 'N/A') && state.employeeData.contact_number !== 'N/A' && state.employeeData.contact_number !== '';

            if (emailChanged || phoneChanged) {
                showOtpModal(payload, btn, ogText);
                return;
            }

            try {
                await apiFetch(`/employees/update/${state.user.id}`, {
                    method: 'PUT',
                    body: payload
                });
                showToast("Profile updated successfully!", "success");
                localStorage.removeItem(`yana_profile_draft_${state.user.id}`);
                state.isEditingProfile = false;
                await loadEmployeeWorkspaceData();
                renderEmployeeApp();
            } catch (error) {
                showToast("Update failed: " + error.message, "error");
                btn.innerHTML = ogText;
                btn.disabled = false;
                lucide.createIcons();
            }
        }

        // Draft Auto-Save & Restoration
        function autoSaveProfileDraft() {
            if (!state.isEditingProfile || !state.employeeData) return;
            const fields = [
                'full_name', 'fathers_name', 'date_of_birth', 'contact_number', 'alternate_contact', 'address',
                'email', 'alternate_email', 'date_of_joining', 'reporting_manager', 'highest_qualification', 'specialization',
                'experience', 'previous_employer', 'previous_job_role', 'skills', 'bank_name', 'bank_account', 'ifsc_code', 'upi_id', 'resume',
                'account_holder_name', 'pf_number', 'esic_number', 'tax_details', 'adhar_number', 'pan_number', 'gender',
                'emergency_contact_name', 'emergency_contact_phone', 'relationship_with_emergency_contact'
            ];
            const draft = {};
            fields.forEach(field => {
                if (field === 'skills') {
                    draft['skills'] = JSON.stringify(state.editSkills);
                    return;
                }
                let el = document.getElementById(`edit_${field}`);
                if (!el && field === 'gender') el = document.getElementById('edit_gender');
                if (!el && field === 'highest_qualification') el = document.getElementById('edit_highest_qualification');
                if (!el && field === 'relationship_with_emergency_contact') el = document.getElementById('edit_relationship_with_emergency_contact');
                if (!el && field === 'emergency_contact_name') el = document.getElementById('edit_emergency_contact_name');
                if (!el && field === 'emergency_contact_phone') el = document.getElementById('edit_emergency_contact_phone');
                
                if (el) draft[field] = el.value;
            });
            localStorage.setItem(`yana_profile_draft_${state.user.id}`, JSON.stringify(draft));
        }

        // Set draft saving interval
        if (window.yanaDraftInterval) clearInterval(window.yanaDraftInterval);
        window.yanaDraftInterval = setInterval(autoSaveProfileDraft, 5000);

        function checkAndPromptDraft() {
            const draftStr = localStorage.getItem(`yana_profile_draft_${state.user.id}`);
            if (draftStr) {
                const restore = confirm("We found a saved profile draft. Would you like to restore it?");
                if (restore) {
                    const draft = JSON.parse(draftStr);
                    if (draft.skills) {
                        try {
                            state.editSkills = JSON.parse(draft.skills);
                        } catch(e) {}
                    }
                    state.employeeData = { ...state.employeeData, ...draft };
                    if (draft.emergency_contact_name || draft.emergency_contact_phone) {
                        state.employeeData.emergency_contact = `${draft.emergency_contact_name || ''} - ${draft.emergency_contact_phone || ''}`;
                    }
                    renderEmployeeApp();
                } else {
                    localStorage.removeItem(`yana_profile_draft_${state.user.id}`);
                }
            }
        }

        // Mock OTP Verification Modal
        function showOtpModal(payload, btn, ogText) {
            const modalHtml = `
                <div id="otpModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div class="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 class="text-lg font-black text-slate-800 mb-2 flex items-center"><i data-lucide="shield-check" class="w-5 h-5 mr-2 text-brand-primary"></i> Verification Required</h3>
                        <p class="text-xs text-slate-500 mb-4">A verification code has been sent to confirm changes to your phone or email. Please enter any 6-digit code below to verify.</p>
                        <input type="text" id="otp_code_input" maxlength="6" class="w-full px-3 py-3 border border-slate-200 rounded-lg text-center font-bold text-lg tracking-widest outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary mb-4" placeholder="000000">
                        <div class="flex gap-3 justify-end">
                            <button type="button" onclick="closeOtpModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                            <button type="button" onclick="confirmOtpVerification()" class="px-4 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-colors">Verify & Save</button>
                        </div>
                    </div>
                </div>
            `;
            const div = document.createElement('div');
            div.id = 'otpModalContainer';
            div.innerHTML = modalHtml;
            document.body.appendChild(div);
            lucide.createIcons();
            
            window.pendingProfilePayload = payload;
            window.pendingProfileSaveButton = { btn, ogText };
        }

        window.closeOtpModal = function() {
            const container = document.getElementById('otpModalContainer');
            if (container) container.remove();
            const { btn, ogText } = window.pendingProfileSaveButton || {};
            if (btn) {
                btn.innerHTML = ogText;
                btn.disabled = false;
            }
        };

        window.confirmOtpVerification = async function() {
            const otpInput = document.getElementById('otp_code_input');
            if (!otpInput || otpInput.value.length !== 6 || !/^\d+$/.test(otpInput.value)) {
                alert("Please enter a valid 6-digit OTP code.");
                return;
            }
            
            const payload = window.pendingProfilePayload;
            const container = document.getElementById('otpModalContainer');
            if (container) container.remove();
            
            try {
                await apiFetch(`/employees/update/${state.user.id}`, {
                    method: 'PUT',
                    body: payload
                });
                showToast("Profile updated successfully (OTP verified)!", "success");
                localStorage.removeItem(`yana_profile_draft_${state.user.id}`);
                state.isEditingProfile = false;
                await loadEmployeeWorkspaceData();
                renderEmployeeApp();
            } catch (error) {
                showToast("Update failed: " + error.message, "error");
                const { btn, ogText } = window.pendingProfileSaveButton || {};
                if (btn) {
                    btn.innerHTML = ogText;
                    btn.disabled = false;
                }
            }
        };

        const PUBLIC_HOLIDAYS = [
            '01-01', // New Year's Day
            '01-26', // Republic Day
            '08-15', // Independence Day
            '10-02', // Gandhi Jayanti
            '12-25'  // Christmas
        ];

        window.calculateWorkingDays = function(startDateStr, endDateStr, isHalfDay = false) {
            if (!startDateStr || !endDateStr) return 0;
            if (isHalfDay) return 0.5;
            
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            if (end < start) return 0;
            
            let count = 0;
            let cur = new Date(start);
            while (cur <= end) {
                const day = cur.getDay(); // 0 = Sunday, 6 = Saturday
                const isWeekend = (day === 0 || day === 6);
                
                const mm = String(cur.getMonth() + 1).padStart(2, '0');
                const dd = String(cur.getDate()).padStart(2, '0');
                const dateKey = `${mm}-${dd}`;
                const isHoliday = PUBLIC_HOLIDAYS.includes(dateKey);
                
                if (!isWeekend && !isHoliday) {
                    count++;
                }
                cur.setDate(cur.getDate() + 1);
            }
            return count;
        };

        window.toggleLeaveHandoverSection = function(show) {
            const container = document.getElementById('leave-handover-container');
            const backupInput = document.getElementById('leave-backup');
            const projectInput = document.getElementById('leave-project');
            const summaryInput = document.getElementById('leave-work-summary');
            
            const reqStarBackup = document.getElementById('req-star-backup');
            const reqStarProject = document.getElementById('req-star-project');
            const reqStarSummary = document.getElementById('req-star-summary');

            if (container) {
                if (show) {
                    container.classList.remove('hidden');
                    if (backupInput) backupInput.required = true;
                    if (projectInput) projectInput.required = true;
                    if (summaryInput) summaryInput.required = true;
                    if (reqStarBackup) reqStarBackup.classList.remove('hidden');
                    if (reqStarProject) reqStarProject.classList.remove('hidden');
                    if (reqStarSummary) reqStarSummary.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                    if (backupInput) backupInput.required = false;
                    if (projectInput) projectInput.required = false;
                    if (summaryInput) summaryInput.required = false;
                    if (reqStarBackup) reqStarBackup.classList.add('hidden');
                    if (reqStarProject) reqStarProject.classList.add('hidden');
                    if (reqStarSummary) reqStarSummary.classList.add('hidden');
                }
            }
            if (window.lucide) lucide.createIcons();
        };

        window.handleLeaveTypeChange = function(select) {
            const isHandoverOnly = select.value === 'Work Handover Only';
            const toggle = document.getElementById('toggle-leave-handover');
            if (isHandoverOnly) {
                if (toggle) toggle.checked = true;
                window.toggleLeaveHandoverSection(true);
            }
            if (typeof window.updateLeaveDaysCalculation === 'function') {
                window.updateLeaveDaysCalculation();
            }
        };

        window.updateLeaveDaysCalculation = function() {
            const startInput = document.getElementById('leave-start');
            const endInput = document.getElementById('leave-end');
            const durationSelect = document.getElementById('leave-duration');
            const leaveTypeSelect = document.getElementById('leave-type');
            const calculationDiv = document.getElementById('leave-calculation-output');
            
            if (!startInput || !endInput || !durationSelect || !calculationDiv) return;
            
            const startVal = startInput.value;
            const durationVal = durationSelect.value;
            const leaveType = leaveTypeSelect ? leaveTypeSelect.value : '';
            const isHandoverOnly = leaveType === 'Work Handover Only';
            
            if (durationVal !== 'Full Day') {
                endInput.value = startVal;
                endInput.disabled = true;
            } else {
                endInput.disabled = false;
            }
            
            const endVal = endInput.value;
            if (!startVal || !endVal) {
                calculationDiv.innerHTML = '';
                return;
            }
            
            let days = isHandoverOnly ? 0 : window.calculateWorkingDays(startVal, endVal, durationVal !== 'Full Day');
            
            if (new Date(endVal) < new Date(startVal)) {
                calculationDiv.innerHTML = `<span class="text-rose-500 text-xs font-semibold">End date cannot be before start date</span>`;
                return;
            }
            
            if (isHandoverOnly) {
                calculationDiv.innerHTML = `
                    <div class="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between mt-2 animate-in fade-in duration-200">
                        <div class="flex items-center gap-2 text-emerald-900 text-sm">
                            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
                            <span>Leave Balance Deduction: <strong class="text-emerald-700 font-bold">0 Days (Task Handover Only)</strong></span>
                        </div>
                        <span class="text-[10px] text-emerald-600 font-semibold">No leave quota will be consumed</span>
                    </div>
                `;
            } else {
                calculationDiv.innerHTML = `
                    <div class="px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between mt-2 animate-in fade-in duration-200">
                        <div class="flex items-center gap-2 text-indigo-900 text-sm">
                            <i data-lucide="calculator" class="w-4 h-4 text-indigo-500"></i>
                            <span>Total Working Days: <strong class="text-indigo-600 font-bold">${days} Day${days !== 1 ? 's' : ''}</strong></span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-medium">Saturdays, Sundays & Public Holidays excluded</span>
                    </div>
                `;
            }
            if (window.lucide) lucide.createIcons();
        };

        window.cancelLeaveRequest = async function(leaveId) {
            const isConfirmed = await customConfirm(
                "Cancel Leave", 
                "Are you sure you want to cancel this leave request? For approved leaves, this will submit a cancellation request to your manager.", 
                "Cancel Leave", 
                "Keep It", 
                true
            );
            if (!isConfirmed) return;

            try {
                await apiFetch(`/attendance/leave-requests/${leaveId}/cancel`, {
                    method: 'POST'
                });
                showToast("Leave request cancellation processed!", "success");
                await loadEmployeeWorkspaceData();
                routeApp('leave-requests');
            } catch (error) {
                showToast("Cancellation failed: " + error.message, "error");
            }
        };

        window.showLeaveDetailsModal = function(leaveId) {
            const req = (state.myLeaveRequests || []).find(r => r.id === leaveId);
            if (!req) return;

            let backupName = 'N/A';
            if (req.backup_employee_id && req.backup_employee_id !== 'N/A') {
                const backupEmp = (state.allEmployees || []).find(e => e.id === req.backup_employee_id);
                backupName = backupEmp ? backupEmp.full_name : req.backup_employee_id;
            }

            const modalHtml = `
                <div id="leaveDetailsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div class="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-50 to-rose-500"></div>
                        <h3 class="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 mt-2">
                            <i data-lucide="calendar" class="w-5 h-5 text-indigo-600"></i> Leave Details
                        </h3>
                        
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leave Type</span>
                                    <span class="text-sm font-semibold text-slate-800">${req.leave_type || 'Paid Leave'}</span>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                                    <span class="text-sm font-semibold text-slate-800">${req.status}</span>
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

        

        

        

        window.openProjectMilestonesModal = function (projectId) {
            const project = state.projects.find(p => p.id === projectId);
            if (!project) return;
            
            const milestones = (state.myMilestones || []).filter(m => m.project_id === projectId);
            const tasks = state.employeeTasks || [];

            const milestonesHtml = milestones.map(m => {
                const milestoneTasks = tasks.filter(t => t.milestone_id === m.id);
                const milestoneTasksCount = milestoneTasks.length;
                const milestoneHours = milestoneTasks.reduce((sum, t) => sum + parseFloat(t.hours_logged || 0), 0);

                let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (m.status === 'Active') statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                if (m.status === 'Delayed') statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
                if (m.status === 'Completed') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                const startStr = m.expected_start ? new Date(m.expected_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
                const endStr = m.expected_end ? new Date(m.expected_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
                const actualStartStr = m.actual_start ? new Date(m.actual_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
                const actualEndStr = m.actual_end ? new Date(m.actual_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '--';

                return `
                    <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start gap-4 mb-3">
                                <div>
                                    <h4 class="font-bold text-slate-800 text-base leading-tight">${m.milestone_name}</h4>
                                </div>
                                <span class="px-2.5 py-1 ${statusColor} rounded-lg text-xs font-bold border shrink-0">
                                    ${m.status || 'Pending'}
                                </span>
                            </div>

                            <p class="text-xs text-slate-500 leading-relaxed font-medium mb-4">${m.remarks || 'No remarks provided.'}</p>
                            
                            <div class="border-t border-slate-100 pt-4 space-y-2.5">
                                <div class="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Start</span>
                                        <span class="font-semibold text-slate-700">${startStr}</span>
                                    </div>
                                    <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected End</span>
                                        <span class="font-semibold text-slate-700">${endStr}</span>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual Start</span>
                                        <span class="font-semibold text-slate-700">${actualStartStr}</span>
                                    </div>
                                    <div>
                                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual End</span>
                                        <span class="font-semibold text-slate-700">${actualEndStr}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                <div><span class="font-bold text-slate-400">Sprint:</span> ${m.sprint_name || 'N/A'}</div>
                                <div><span class="font-bold text-slate-400">Module:</span> ${m.module_name || 'N/A'}</div>
                                <div><span class="font-bold text-slate-400">Feature:</span> ${m.feature_name || 'N/A'}</div>
                                <div><span class="font-bold text-slate-400">Type:</span> ${m.work_type || 'N/A'}</div>
                            </div>
                        </div>

                        <div class="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                            <div class="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                <i data-lucide="clipboard-list" class="w-4 h-4 text-slate-400"></i>
                                <span>${milestoneTasksCount} task${milestoneTasksCount === 1 ? '' : 's'} logged</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-xs text-slate-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg">
                                <i data-lucide="clock" class="w-4.5 h-4.5 text-brand-primary"></i>
                                <span>${milestoneHours.toFixed(1)} hrs</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || `<div class="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500 font-semibold">No assigned milestones under this project.</div>`;

            const modalHtml = `
                <div id="projectMilestonesModal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all duration-300">
                        <!-- Header -->
                        <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
                            <div>
                                <h3 class="font-black text-lg text-slate-800 tracking-tight">${project.name}</h3>
                                <p class="text-xs text-slate-500 mt-0.5 font-medium">${project.client || 'Internal Client'} &bull; ${project.team || 'General Team'}</p>
                            </div>
                            <button type="button" onclick="document.getElementById('projectMilestonesModalContainer').remove()"
                                class="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-200">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                        
                        <!-- Body -->
                        <div class="p-6 overflow-y-auto flex-1">
                            <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Assigned Milestones</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                ${milestonesHtml}
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button type="button" onclick="document.getElementById('projectMilestonesModalContainer').remove()"
                                class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const div = document.createElement('div');
            div.id = 'projectMilestonesModalContainer';
            div.innerHTML = modalHtml;
            document.body.appendChild(div);
            if (window.lucide) lucide.createIcons();
        };

        window.openTaskDetailsModal = function(taskId) {
            const task = (state.employeeTasks || []).find(t => t.id === taskId);
            if (!task) {
                showToast("Task not found.", "error");
                return;
            }

            const d = new Date(task.date || task.created_at);
            const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            
            const milestones = state.myMilestones || [];
            const project = task.project_id ? (state.projects.find(p => p.id === task.project_id)?.name || 'Project Attached') : 'General / No Project';
            const milestone = task.milestone_id ? (milestones.find(m => m.id === task.milestone_id)?.milestone_name || 'Milestone Attached') : 'General Task';

            const createdTime = new Date(task.created_at).getTime();
            const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);
            const canEdit = elapsedHours <= 24;

            // Effort details block
            let effortHtml = '';
            if (task.task_type === 'content_creator') {
                let customVals = {};
                try {
                    customVals = task.custom_field_values ? (typeof task.custom_field_values === 'string' ? JSON.parse(task.custom_field_values) : task.custom_field_values) : {};
                } catch(e) {
                    customVals = {};
                }

                const active = [];
                if (customVals && typeof customVals === 'object' && Object.keys(customVals).length > 0) {
                    Object.entries(customVals).forEach(([k, v]) => {
                        const val = parseInt(v) || 0;
                        if (val > 0) active.push({ name: k, value: val });
                    });
                } else {
                    const standard = [
                        { name: 'Reels', value: task.reels_count },
                        { name: 'Videos', value: task.long_video_count },
                        { name: 'Posters', value: task.poster_count },
                        { name: 'Calls', value: task.calls_made }
                    ];
                    standard.forEach(m => {
                        const val = parseInt(m.value) || 0;
                        if (val > 0) active.push({ name: m.name, value: val });
                    });
                }

                effortHtml = active.map(m => {
                    let displayName = m.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    if (displayName.toLowerCase().includes('reel')) displayName = 'Reels';
                    else if (displayName.toLowerCase().includes('video') || displayName.toLowerCase().includes('youtube')) displayName = 'Videos';
                    else if (displayName.toLowerCase().includes('call')) displayName = 'Calls';
                    else if (displayName.toLowerCase().includes('post') || displayName.toLowerCase().includes('graphic')) displayName = 'Posts';
                    
                    return `
                        <div class="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col items-center justify-center shadow-xs">
                            <span class="text-[9px] font-black text-rose-400 uppercase tracking-widest">Active Deliverable</span>
                            <span class="text-sm font-black text-rose-800 mt-1">${m.value} ${displayName}</span>
                        </div>
                    `;
                }).join('');
            }

            const hoursLoggedVal = parseFloat(task.hours_logged) || 0.0;
            const hoursCard = `
                <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col items-center justify-center shadow-xs">
                    <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Logged Effort</span>
                    <span class="text-sm font-black text-indigo-800 mt-1">${hoursLoggedVal.toFixed(1)} Hours</span>
                </div>
            `;

            let editButtonHtml = '';
            if (canEdit) {
                editButtonHtml = `
                    <button type="button" onclick="closeModal(); window.openEditTaskModal('${task.id}', '${task.task_type}')" class="px-5 py-2 bg-brand-primary text-white rounded-xl font-bold shadow-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 text-xs">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Log
                    </button>
                `;
            } else {
                editButtonHtml = `
                    <span class="inline-flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed" title="Editing locked (24h limit expired)">
                        <i data-lucide="lock" class="w-3.5 h-3.5"></i> Editing Locked
                    </span>
                `;
            }

            const html = `
                <div class="space-y-5 text-left max-h-[70vh] overflow-y-auto pr-1">
                    <!-- Top Summary metadata info -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project / Account</span>
                            <span class="text-xs font-black text-slate-800">${project}</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Milestone Target</span>
                            <span class="text-xs font-bold text-slate-700">${milestone}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Logged Time</span>
                            <span class="text-xs font-bold text-slate-750 block">${dateStr}</span>
                            <span class="text-[10px] text-slate-400 font-semibold mt-0.5 block">${timeStr}</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Task Type</span>
                            <span class="text-xs font-extrabold text-indigo-650 block capitalize">${task.task_type.replace('_', ' ')}</span>
                            <span class="text-[10px] text-slate-400 font-semibold mt-0.5 block uppercase tracking-widest">${task.work_type || 'General'}</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                            <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status / Review</span>
                            <span class="text-xs font-extrabold text-slate-700 block">${task.task_status || 'Submitted'}</span>
                            <span class="text-[9px] text-emerald-600 font-black mt-0.5 block uppercase tracking-widest">Active log</span>
                        </div>
                    </div>

                    <!-- Effort metric highlights -->
                    <div>
                        <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Metrics Summary</span>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
                            ${hoursCard}
                            ${effortHtml}
                        </div>
                    </div>

                    <!-- Detailed Tasks performed description -->
                    <div class="bg-slate-50 border border-slate-155 rounded-xl p-4">
                        <span class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tasks Performed Details</span>
                        <div class="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto pr-1">${task.task_performed || 'N/A'}</div>
                    </div>

                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors text-xs">Close</button>
                        ${editButtonHtml}
                    </div>
                </div>
            `;

            openModal('Timesheet Entry Details', html);
        };

        window.openEditTaskModal = function(taskId, taskType) {
            const task = (state.employeeTasks || []).find(t => t.id === taskId);
            if (!task) {
                showToast("Task not found locally.", "error");
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

            // Generate Project Options
            let projectOptions = '<option value="">-- General / No Project --</option>';
            (state.projects || []).forEach(p => {
                const selected = String(p.id) === String(task.project_id) ? 'selected' : '';
                projectOptions += `<option value="${p.id}" ${selected}>${p.name}</option>`;
            });

            let fieldsHtml = '';

            if (isDev) {
                // Generate Milestone Options for developers
                let milestoneOptions = '<option value="">General Task (No Milestone)</option>';
                if (task.project_id) {
                    const timelines = state.projectTimelines ? state.projectTimelines[task.project_id] : null;
                    if (timelines && timelines.length > 0) {
                        timelines.forEach(m => {
                            const selected = String(m.id) === String(task.milestone_id) ? 'selected' : '';
                            milestoneOptions += `<option value="${m.id}" ${selected}>${m.milestone_name} (${m.status})</option>`;
                        });
                    }
                }

                fieldsHtml = `
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Project / Workspace *</label>
                            <div class="relative">
                                <select id="edit-task-project" onchange="window.updateEditTaskProjectChange(this, true)" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
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
                const p = (state.projects || []).find(proj => String(proj.id) === String(task.project_id));
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
                                <select id="edit-task-project" onchange="window.updateEditTaskProjectChange(this, false)" class="input-field w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium appearance-none">
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
                <form onsubmit="window.submitEditTaskForm(event, '${taskId}', '${taskType}')" class="space-y-4">
                    <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        ${fieldsHtml}
                    </div>
                    <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button type="submit" id="btnEditSubmit" class="px-5 py-2 bg-brand-primary text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <i data-lucide="save" class="w-4 h-4"></i> Save Changes
                        </button>
                    </div>
                </form>
            `;

            openModal('Edit Timesheet Entry', html);
            const textEl = document.getElementById('edit-task-performed');
            if (textEl) {
                document.getElementById('edit-char-counter').innerText = textEl.value.length + ' / 5000';
            }
        };

        window.updateEditTaskProjectChange = async function(selectEl, isDev) {
            const projectId = selectEl.value;
            const modal = selectEl.closest('form');
            
            if (isDev) {
                const milestoneSelect = modal.querySelector('#edit-task-milestone');
                if (milestoneSelect) {
                    milestoneSelect.disabled = true;
                    milestoneSelect.innerHTML = '<option value="">Loading Milestones...</option>';
                    
                    let milestoneOptions = '<option value="">General Task (No Milestone)</option>';
                    if (projectId) {
                        let timelines = state.projectTimelines ? state.projectTimelines[projectId] : null;
                        if (!timelines) {
                            timelines = await apiFetch(`/projects/timeline/${projectId}`).catch(() => []);
                            if (state.projectTimelines) state.projectTimelines[projectId] = timelines;
                        }
                        if (timelines && timelines.length > 0) {
                            timelines.forEach(m => {
                                milestoneOptions += `<option value="${m.id}">${m.milestone_name} (${m.status})</option>`;
                            });
                        }
                    }
                    milestoneSelect.innerHTML = milestoneOptions;
                    milestoneSelect.disabled = false;
                }
            } else {
                const p = (state.projects || []).find(proj => String(proj.id) === String(projectId));
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

        window.submitEditTaskForm = async function(event, taskId, taskType) {
            event.preventDefault();
            const btn = document.getElementById('btnEditSubmit');
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

                        const nameLower = name.toLowerCase();
                        if (nameLower.includes('reel')) reelsVal += val;
                        else if (nameLower.includes('video')) videosVal += val;
                        else if (nameLower.includes('poster') || nameLower.includes('graphic') || nameLower.includes('design')) postersVal += val;
                        else if (nameLower.includes('call')) callsVal += val;
                    });

                    payload.custom_field_values = JSON.stringify(customVals);
                    payload.upload_deadline = document.getElementById('edit-task-upload-deadline')?.value || 'N/A';
                    payload.next_delivery_date = document.getElementById('edit-task-next-delivery-date')?.value || 'N/A';
                    payload.reels_count = reelsVal;
                    payload.long_video_count = videosVal;
                    payload.poster_count = postersVal;
                    payload.calls_made = callsVal;
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
                closeModal();
                await loadEmployeeWorkspaceData();
                routeApp('timesheets');
            } catch (err) {
                showToast("Failed to save changes: " + err.message, "error");
            } finally {
                if (btn) { btn.innerHTML = og; btn.disabled = false; lucide.createIcons(); }
            }
        };

        async function handleLeaveRequestSubmit(event) {
            event.preventDefault();
            const btn = document.getElementById('btn-submit-leave');
            const ogHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> Submitting...';
            btn.disabled = true;

            const start_date = document.getElementById('leave-start').value;
            const end_date = document.getElementById('leave-end').value;
            const durationVal = document.getElementById('leave-duration').value;
            const reason = document.getElementById('leave-reason').value;
            const leave_type = document.getElementById('leave-type').value;

            const isHandoverToggleOn = document.getElementById('toggle-leave-handover')?.checked || leave_type === 'Work Handover Only';

            let backup_employee_id = "N/A";
            let deployment_pending = "No";
            let pending_work_summary = "N/A";
            let project_id = null;
            let milestone_id = null;
            let task_type = null;

            if (isHandoverToggleOn) {
                backup_employee_id = document.getElementById('leave-backup')?.value || "N/A";
                deployment_pending = document.getElementById('leave-deployment')?.value || "No";
                pending_work_summary = (document.getElementById('leave-work-summary')?.value || "").trim();
                project_id = document.getElementById('leave-project')?.value || null;
                milestone_id = document.getElementById('leave-milestone')?.value || null;
                task_type = document.getElementById('leave-task-type')?.value || null;

                if (!project_id) {
                    showToast("Please select a project for the handover.", "error");
                    btn.innerHTML = ogHtml; btn.disabled = false;
                    return;
                }

                if (!milestone_id && !pending_work_summary) {
                    showToast("Description of the task is mandatory when no milestone is selected.", "error");
                    btn.innerHTML = ogHtml; btn.disabled = false;
                    return;
                }

                if (!pending_work_summary) {
                    pending_work_summary = "Task handover assigned to backup employee.";
                }
            }

            const isHandoverOnly = leave_type === 'Work Handover Only';
            const total_days = isHandoverOnly ? 0 : window.calculateWorkingDays(start_date, end_date, durationVal !== 'Full Day');

            if (new Date(start_date) > new Date(end_date)) {
                showToast("End Date cannot be before Start Date.", "error");
                btn.innerHTML = ogHtml; btn.disabled = false;
                return;
            }

            const payload = {
                start_date,
                end_date,
                reason,
                leave_type,
                half_day_option: durationVal,
                total_days,
                pending_work_summary,
                backup_employee_id,
                deployment_pending,
                project_id,
                milestone_id,
                task_type
            };

            try {
                await apiFetch('/attendance/leave-requests', {
                    method: 'POST',
                    body: payload
                });
                showToast(isHandoverOnly ? "Work handover logged successfully!" : "Leave request submitted successfully!", "success");
                await loadEmployeeWorkspaceData();
                routeApp('leave-requests');
            } catch (error) {
                showToast("Failed to submit request: " + error.message, "error");
                btn.innerHTML = ogHtml; btn.disabled = false;
                if (window.lucide) lucide.createIcons();
            }
        }

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
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
            const token = localStorage.getItem(CONFIG.TOKEN_KEY);
            if (!token) {
                console.log("No token found. WebSocket connection skipped.");
                return;
            }
            const wsUrl = CONFIG.API_BASE_URL.replace('http', 'ws') + '/ws?token=' + encodeURIComponent(token);
            ws = new WebSocket(wsUrl);

            ws.onopen = () => console.log('WebSocket connected for real-time updates');
            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.action === "REFRESH_WORKSPACE") {
                        console.log("WebSocket update received. Reloading workspace data.");
                        
                        // Silent data refresh
                        await loadEmployeeWorkspaceData();
                        
                        // Guard the UI refresh/rerender
                        if (isUserBusy()) {
                            console.log("User is currently busy (editing or typing). Skipping DOM refresh to prevent data loss.");
                            return;
                        }
                        
                        routeApp(state.currentView);
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

        // --- Bootstrap Application ---
        document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem(CONFIG.TOKEN_KEY);

            // Hard Auth Check
            if (!token) {
                window.location.href = CONFIG.LOGIN_URL;
                return;
            }

            state.user = parseJwt(token);

            // Validate expiration and role isolation (Kick admins back to admin.html, kick expired to login.html)
            if (!state.user || state.user.exp * 1000 < Date.now()) {
                localStorage.removeItem(CONFIG.TOKEN_KEY);
                window.location.href = CONFIG.LOGIN_URL;
                return;
            }

            if (state.user.role.toLowerCase() === 'admin') {
                if (state.user.access_level === 'ManagerAdmin') {
                    window.location.href = '../manager/manager.html';
                } else {
                    window.location.href = '../admin/admin.html';
                }
                return;
            }

            // Restore the last visited view, or default to dashboard
            const lastView = sessionStorage.getItem('lastEmployeeView') || 'dashboard';
            
            // Add keyboard shortcuts for timesheets
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key.toLowerCase() === 'n') {
                    if (state.currentView === 'log-dev') {
                        e.preventDefault();
                        window.addDevTaskRow();
                    } else if (state.currentView === 'log-content') {
                        e.preventDefault();
                        window.addConTaskRow();
                    }
                }
                if (e.ctrlKey && e.key === 'Enter') {
                    const activeForm = document.querySelector('form[onsubmit*="handleTaskSubmit"]');
                    if (activeForm) {
                        e.preventDefault();
                        activeForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }
            });

            setupWebSocket();
            routeApp(lastView);
        });

        // Mobile & Desktop Sidebar Toggle Logic
        window.toggleMobileSidebar = function () {
            const sidebar = document.getElementById('main-sidebar');
            const overlay = document.getElementById('mobile-sidebar-overlay');
            if (!sidebar) return;

            if (window.innerWidth < 768) {
                if (!overlay) return;
                const isOpen = !sidebar.classList.contains('-translate-x-full');
                if (isOpen) {
                    // Close it
                    sidebar.classList.add('-translate-x-full');
                    overlay.classList.add('opacity-0');
                    setTimeout(() => overlay.classList.add('hidden'), 300);
                } else {
                    // Open it
                    overlay.classList.remove('hidden');
                    // Small delay to allow display:block to apply before animating opacity
                    setTimeout(() => {
                        overlay.classList.remove('opacity-0');
                        sidebar.classList.remove('-translate-x-full');
                    }, 10);
                }
            } else {
                // Desktop collapse
                const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
                localStorage.setItem('yanaSidebarCollapsed', isCollapsed ? 'true' : 'false');

                // Trigger window resize to auto-adjust charts
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 310);
            }
        };
