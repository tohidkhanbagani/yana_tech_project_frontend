let dashboardAutoRefreshTimer = null;

async function loadDashboardData() {
  if (isDashboardLoading) return;
  isDashboardLoading = true;
  try {
    const [summary, feed, analyticsSuite, projects, financials, workforce, managerSummary, metadataAnalytics] =
      await Promise.all([
        apiFetch("/dashboard/v2/summary").catch(() => null),
        apiFetch("/dashboard/live-feed").catch(() => null),
        apiFetch("/dashboard/analytics-suite").catch(() => null),
        apiFetch("/dashboard/projects").catch(() => null),
        apiFetch("/dashboard/financials").catch(() => null),
        apiFetch("/dashboard/workforce").catch(() => null),
        apiFetch("/dashboard/manager/summary").catch(() => null),
        apiFetch("/dashboard/metadata-analytics").catch(() => null),
      ]);

    state.dashboardData = {
      summary: summary || null,
      feed: feed || { live_stream: [], system_alerts: [] },
      analyticsSuite: analyticsSuite || null,
      projects: projects || null,
      financials: financials || null,
      workforce: workforce || null,
      managerSummary: managerSummary || null,
      metadataAnalytics: metadataAnalytics || { sprints: [], modules: [], features: [] },
    };

    // Pre-fetch daily report cache if currently viewing report or if not cached yet
    if (state.isDailyReportVisible || !state.dailyReportDataCache) {
      apiFetch("/dashboard/daily-report")
        .then((data) => {
          state.dailyReportDataCache = data;
          if (state.isDailyReportVisible) {
            const dynamicArea = document.getElementById("daily-report-dynamic-area");
            if (dynamicArea && typeof getDailyReportHtml === "function") {
              dynamicArea.innerHTML = getDailyReportHtml();
              if (window.lucide) lucide.createIcons();
            }
          }
        })
        .catch((e) => console.error("Silent daily report prefetch error:", e));
    }
  } catch (error) {
    showToast("Failed to load dashboard analytics.", "error");
  } finally {
    isDashboardLoading = false;
  }
}

function initChartsIfApplicable() {
  if (state.adminView === "dashboard") {
    setTimeout(initDashboardCharts, 50);
    setupDashboardAutoRefresh();
    if (state.isDailyReportVisible) {
      fetchAndRenderDailyReport();
    }
  } else {
    clearDashboardAutoRefresh();
    if (state.adminView === "projects") {
      if (typeof renderAdminProjectsTable === "function" && !state.activeProject) {
        setTimeout(renderAdminProjectsTable, 50);
      }
    }
  }
}

function setupDashboardAutoRefresh() {
  clearDashboardAutoRefresh();
  dashboardAutoRefreshTimer = setInterval(async () => {
    if (state.adminView === "dashboard" && !isDashboardLoading) {
      await loadDashboardData();
      if (typeof isUserBusy === "function" && isUserBusy()) return;
      if (typeof renderAdminApp === "function") renderAdminApp();
    }
  }, 15000);
}

function clearDashboardAutoRefresh() {
  if (dashboardAutoRefreshTimer) {
    clearInterval(dashboardAutoRefreshTimer);
    dashboardAutoRefreshTimer = null;
  }
}

function initDashboardCharts() {
  // Chart initialization placeholder if canvas charts are rendered
}

function changeDashboardFilter(key, val) {
  state[key] = val;
  if (typeof renderAdminApp === 'function') renderAdminApp();
}

function handleSidebarSearch(val) {
  state.sidebarSearch = val;
  const searchInput = document.getElementById("sidebarSearch");
  if (searchInput) {
    const cursor = searchInput.selectionStart;
    if (typeof renderAdminApp === 'function') renderAdminApp();
    const updatedInput = document.getElementById("sidebarSearch");
    if (updatedInput) {
      updatedInput.focus();
      updatedInput.setSelectionRange(cursor, cursor);
    }
  } else {
    if (typeof renderAdminApp === 'function') renderAdminApp();
  }
}

async function fetchAndRenderDailyReport() {
  const dynamicArea = document.getElementById("daily-report-dynamic-area");
  if (!dynamicArea) return;

  if (!state.dailyReportDataCache) {
    dynamicArea.innerHTML = `
      <div class="h-64 flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-bold tracking-widest uppercase text-xs">Generating Daily Work Report...</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const data = await apiFetch("/dashboard/daily-report");
    state.dailyReportDataCache = data;
    if (dynamicArea && typeof getDailyReportHtml === "function") {
      dynamicArea.innerHTML = getDailyReportHtml();
      if (window.lucide) lucide.createIcons();
    }
  } catch (error) {
    console.error("Daily report fetch failed:", error);
    if (dynamicArea) {
      dynamicArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-rose-500">
          <i data-lucide="alert-circle" class="w-8 h-8 mb-2"></i>
          <p class="font-bold text-sm">Failed to load Daily Work Report.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function toggleDailyReport() {
  state.isDailyReportVisible = !state.isDailyReportVisible;
  if (typeof renderAdminApp === 'function') renderAdminApp();

  if (state.isDailyReportVisible) {
    await fetchAndRenderDailyReport();
  }
}

function getAdminDashboardTemplate() {
  if (!state.dashboardData || !state.dashboardData.summary) {
    return `
      <div class="h-full flex flex-col items-center justify-center space-y-4 animate-pulse py-20">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-bold tracking-widest uppercase text-xs">Loading Executive Dashboard...</p>
      </div>
    `;
  }

  const summary = state.dashboardData.summary || {};
  const ov = summary.overview || {};
  const analyticsSuite = state.dashboardData.analyticsSuite || {};
  const projectsFeed = state.dashboardData.projects || {};
  const financials = state.dashboardData.financials || {};
  const workforce = state.dashboardData.workforce || {};
  const managerSummary = state.dashboardData.managerSummary || {};

  const activeControlCenter = projectsFeed.active_control_center || [];
  const projectHealthList = analyticsSuite.project_health || [];

  const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(Math.round(num || 0));

  const revTrend = ov.revenue_trend || 0;
  const revTrendSign = revTrend >= 0 ? '+' : '';
  const revTrendColor = revTrend >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const revTrendIcon = revTrend >= 0 ? 'trending-up' : 'trending-down';

  const burnTrend = ov.burn_trend || 0;
  const burnTrendSign = burnTrend >= 0 ? '+' : '';
  const burnTrendColor = burnTrend <= 0 ? 'text-emerald-400' : 'text-rose-400';
  const burnTrendIcon = burnTrend <= 0 ? 'trending-down' : 'trending-up';

  const idleLeakage = analyticsSuite.idle_cost_leakage || 0;
  const srsWarnings = projectsFeed.srs_compliance_warnings || [];
  const budgetWarnings = financials.budget_warnings || [];
  const budgetProjectNames = budgetWarnings.map(w => w.project || w).filter(Boolean);

  // 1. SYSTEM ALERTS BOARD
  let alertsHtmlList = [];

  if (state.adminNotifications && state.adminNotifications.some(n => !n.is_read && ((n.title || '').includes('Payment') || (n.title || '').includes('💰')))) {
    const paymentNotifs = state.adminNotifications.filter(n => !n.is_read && ((n.title || '').includes('Payment') || (n.title || '').includes('💰')));
    alertsHtmlList.push(`
      <button type="button" onclick="routeApp('timesheets')" aria-label="View pending project payment reminders" class="text-left cursor-pointer flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-xs hover:border-amber-500/40 transition-all focus-visible:outline-none">
        <div class="p-2 bg-amber-500/20 rounded-lg text-amber-600 shrink-0">
          <i data-lucide="wallet" class="w-4 h-4" aria-hidden="true"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[9px] font-black uppercase text-amber-600 tracking-wider">Payment Reminder</span>
            <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-200/80 text-amber-900">${paymentNotifs.length} Pending</span>
          </div>
          <p class="text-xs font-bold text-slate-800 truncate">${paymentNotifs[0].message}</p>
        </div>
      </button>
    `);
  }

  if (idleLeakage > 0) {
    alertsHtmlList.push(`
      <button type="button" onclick="openIdleLeakageModal()" aria-label="View capital leakage details" class="text-left cursor-pointer flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-xs hover:border-rose-500/40 transition-all focus-visible:outline-none">
        <div class="p-2 bg-rose-500/20 rounded-lg text-rose-600 shrink-0">
          <i data-lucide="alert-triangle" class="w-4 h-4" aria-hidden="true"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[9px] font-black uppercase text-rose-600 tracking-wider">Capital Leakage</span>
            <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-200/80 text-rose-900">Critical</span>
          </div>
          <p class="text-xs font-bold text-slate-800 truncate">₹<span class="blur-financial">${formatNumber(idleLeakage)}</span> idle capacity costs identified.</p>
        </div>
      </button>
    `);
  }

  if (srsWarnings.length > 0) {
    alertsHtmlList.push(`
      <button type="button" onclick="highlightNotificationCenter()" aria-label="View SRS compliance warnings" class="text-left cursor-pointer flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-xs hover:border-amber-500/40 transition-all focus-visible:outline-none">
        <div class="p-2 bg-amber-500/20 rounded-lg text-amber-600 shrink-0">
          <i data-lucide="file-warning" class="w-4 h-4" aria-hidden="true"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[9px] font-black uppercase text-amber-600 tracking-wider">Compliance Deficit</span>
            <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-200/80 text-amber-900">SRS Audit</span>
          </div>
          <p class="text-xs font-bold text-slate-800 truncate">Missing SRS: ${srsWarnings.slice(0, 3).join(', ')}${srsWarnings.length > 3 ? '...' : ''}</p>
        </div>
      </button>
    `);
  }

  if (budgetProjectNames.length > 0) {
    alertsHtmlList.push(`
      <button type="button" onclick="highlightNotificationCenter()" aria-label="View budget overrun warnings" class="text-left cursor-pointer flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-xs hover:border-rose-500/40 transition-all focus-visible:outline-none">
        <div class="p-2 bg-rose-500/20 rounded-lg text-rose-600 shrink-0">
          <i data-lucide="wallet" class="w-4 h-4" aria-hidden="true"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[9px] font-black uppercase text-rose-600 tracking-wider">Budget Runaway</span>
            <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-200/80 text-rose-900">Financial Risk</span>
          </div>
          <p class="text-xs font-bold text-slate-800 truncate">Overruns in: ${budgetProjectNames.slice(0, 3).join(', ')}</p>
        </div>
      </button>
    `);
  }

  const alertsBoardHtml = alertsHtmlList.length > 0 ? `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      ${alertsHtmlList.join('')}
    </div>
  ` : '';

  // 2. 5-METRIC EXECUTIVE KPI STRIP
  const totalProjectsNum = managerSummary.projects?.total || projectsFeed.global_status?.active || ov.total_projects || 0;
  const totalStaffNum = workforce.radar?.total_staff || ov.total_employees || 0;

  const totalRevenueVal = ov.total_revenue || financials.cumulative?.billed || 0;
  const totalExpenditureVal = ov.total_expenditure || financials.cumulative?.cost || 0;
  const netProfitVal = totalRevenueVal - totalExpenditureVal;
  const marginPct = totalRevenueVal > 0 ? ((netProfitVal / totalRevenueVal) * 100).toFixed(1) : (financials.cumulative?.margin_percent || 0).toFixed(1);

  const activeStaff = workforce.radar?.active_today || 0;
  const absentStaff = workforce.radar?.absent_today || 0;
  const totalStaff = workforce.radar?.total_staff || 0;
  const attendanceRate = managerSummary.resources?.attendance_rate || (totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 100);

  const kpiHtml = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      <!-- KPI 1: Realized Billed Revenue -->
      <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white border border-indigo-900/50 shadow-md flex flex-col justify-between relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <i data-lucide="indian-rupee" class="w-16 h-16 text-indigo-400"></i>
        </div>
        <div>
          <p class="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Realized Billed Revenue</p>
          <h3 class="text-xl font-black text-white tabular-nums tracking-tight blur-financial">₹${formatNumber(totalRevenueVal)}</h3>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-indigo-200">
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 ${revTrendColor}">
            <i data-lucide="${revTrendIcon}" class="w-3 h-3"></i> ${revTrendSign}${revTrend.toFixed(1)}%
          </span>
          <span class="text-slate-400">vs Prev Month</span>
        </div>
      </div>

      <!-- KPI 2: Total Expenditure / Burn -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenditure & Cost</p>
          <h3 class="text-xl font-black text-slate-800 tabular-nums tracking-tight blur-financial">₹${formatNumber(totalExpenditureVal)}</h3>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 ${burnTrendColor}">
            <i data-lucide="${burnTrendIcon}" class="w-3 h-3"></i> ${burnTrendSign}${burnTrend.toFixed(1)}%
          </span>
          <span class="text-slate-400">Payroll & Expenses</span>
        </div>
      </div>

      <!-- KPI 3: Net Profit & Margin -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Operating Profit</p>
          <h3 class="text-xl font-black ${netProfitVal >= 0 ? 'text-emerald-600' : 'text-rose-600'} tabular-nums tracking-tight blur-financial">
            ${netProfitVal >= 0 ? '₹' + formatNumber(netProfitVal) : '-₹' + formatNumber(Math.abs(netProfitVal))}
          </h3>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold">
          <span class="px-2 py-0.5 rounded-full ${netProfitVal >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} font-black blur-financial">
            ${marginPct}% Margin
          </span>
        </div>
      </div>

      <!-- KPI 4: Active Portfolio Projects -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Projects Portfolio</p>
          <h3 class="text-xl font-black text-slate-800 tabular-nums tracking-tight">${totalProjectsNum} Active Tracks</h3>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
          <i data-lucide="check-circle" class="w-3 h-3 text-indigo-600"></i>
          <span>Global Delivery</span>
        </div>
      </div>

      <!-- KPI 5: Active Workforce & Attendance -->
      <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Workforce & Attendance</p>
          <h3 class="text-xl font-black text-slate-800 tabular-nums tracking-tight">${totalStaffNum} Staff</h3>
        </div>
        <div class="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
          <i data-lucide="activity" class="w-3 h-3 text-emerald-500"></i>
          <span>${attendanceRate}% Present Today</span>
        </div>
      </div>
    </div>
  `;

  // 3. PORTFOLIO CONTROL MATRIX & RESOURCE OPERATIONS (2-COLUMN SPLIT)
  const getHealthDetails = (name) => {
    return projectHealthList.find(h => h.name && h.name.toLowerCase() === (name || '').toLowerCase()) || null;
  };

  const leaveRequests = managerSummary.leave_requests || [];
  const attendanceHistory = managerSummary.attendance_history || [];
  const resDistribution = workforce.resource_distribution || {};

  const activeOpsTab = state.opsTab || 'attendance';

  const sidebarSearchLower = (state.sidebarSearch || '').toLowerCase().trim();

  const filteredAbsentEmployees = (workforce.radar?.absent_employees || []).filter(emp => {
    if (!sidebarSearchLower) return true;
    return (emp.name && emp.name.toLowerCase().includes(sidebarSearchLower)) ||
           (emp.username && emp.username.toLowerCase().includes(sidebarSearchLower)) ||
           (emp.department && emp.department.toLowerCase().includes(sidebarSearchLower));
  });

  const filteredLeaveRequests = leaveRequests.filter(l => {
    if (!sidebarSearchLower) return true;
    return (l.employee_name && l.employee_name.toLowerCase().includes(sidebarSearchLower)) ||
           (l.reason && l.reason.toLowerCase().includes(sidebarSearchLower)) ||
           (l.status && l.status.toLowerCase().includes(sidebarSearchLower));
  });

  const filteredPresenceHistory = attendanceHistory.filter(a => {
    if (!sidebarSearchLower) return true;
    return (a.employee_name && a.employee_name.toLowerCase().includes(sidebarSearchLower)) ||
           (a.status && a.status.toLowerCase().includes(sidebarSearchLower)) ||
           (a.shift_start && a.shift_start.toLowerCase().includes(sidebarSearchLower)) ||
           (a.shift_end && a.shift_end.toLowerCase().includes(sidebarSearchLower));
  });

  let opsTabContentHtml = '';
  if (activeOpsTab === 'attendance') {
    opsTabContentHtml = `
      <div class="space-y-1.5">
        ${filteredPresenceHistory.map(a => {
          const timeStr = a.check_in ? new Date(a.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
          const outStr = a.check_out ? new Date(a.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
          return `
            <div class="bg-slate-50/70 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 transition-colors">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p class="text-xs font-black text-slate-800 truncate">${a.employee_name}</p>
                  <span class="px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${a.status === 'Present' || a.status === 'Checked In' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'}">${a.status}</span>
                  ${a.work_mode && a.work_mode !== 'Office' ? `
                    <span class="px-1.5 py-0.2 rounded text-[7px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">${a.work_mode}</span>
                  ` : ''}
                </div>
                <p class="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Shift: ${a.shift_start || '09:00'} - ${a.shift_end || '18:00'}</p>
              </div>
              <div class="text-right text-[8px] font-bold text-slate-600 shrink-0">
                <div class="text-emerald-700">Check In: <span class="font-black">${timeStr}</span></div>
                <div class="text-slate-500">Check Out: <span class="font-black">${outStr}</span></div>
              </div>
            </div>
          `;
        }).join('')}
        ${filteredPresenceHistory.length === 0 ? '<p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">No matching attendance records found</p>' : ''}
      </div>
    `;
  } else if (activeOpsTab === 'leave') {
    opsTabContentHtml = `
      <div class="space-y-1.5">
        ${filteredLeaveRequests.map(l => `
          <div class="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100 flex justify-between items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <p class="text-xs font-black text-indigo-950 truncate">${l.employee_name}</p>
                <span class="px-1.5 py-0.2 rounded text-[7px] font-black uppercase bg-indigo-100 text-indigo-800">${l.status}</span>
              </div>
              <p class="text-[9px] text-indigo-700 font-medium truncate mt-0.5">${l.reason}</p>
            </div>
            <div class="text-right text-[8px] font-bold text-indigo-900 shrink-0">
              Starts: ${l.start_date ? new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </div>
          </div>
        `).join('')}
        ${filteredLeaveRequests.length === 0 ? '<p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">No active leave requests</p>' : ''}
      </div>
    `;
  } else if (activeOpsTab === 'absent') {
    opsTabContentHtml = `
      <div class="space-y-1.5">
        ${filteredAbsentEmployees.map(emp => `
          <div class="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100 flex justify-between items-center gap-3 shadow-2xs">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-black text-slate-800 truncate">${emp.name}</p>
              <p class="text-[9px] text-slate-500 font-medium truncate">@${emp.username} &bull; ${emp.department}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 shrink-0">Absent Today</span>
          </div>
        `).join('')}
        ${filteredAbsentEmployees.length === 0 ? `
          <div class="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50 text-center">
            <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600 mx-auto mb-1"></i>
            <p class="text-xs font-black text-slate-800">Perfect Presence</p>
            <p class="text-[9px] text-slate-400 font-bold uppercase">All employees accounted for today</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  const mainExecutionSectionHtml = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
      <!-- Left: Active Portfolio Control Center (7 cols) -->
      <div class="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <div>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portfolio Execution Matrix</span>
            <h4 class="text-base font-black text-slate-800">Active Track Health & Costs</h4>
          </div>
          <span class="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-md">
            ${activeControlCenter.length} Active Projects
          </span>
        </div>

        <div class="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar flex-1">
          ${activeControlCenter.map(p => {
            const healthDetails = getHealthDetails(p.name);
            const healthScore = healthDetails ? healthDetails.score : 75;
            const budgetPct = p.budget > 0 ? Math.min(100, Math.round((p.accumulated_cost / p.budget) * 100)) : (p.accumulated_cost > 0 ? 100 : 0);

            let ringColor = 'text-emerald-500';
            if (healthScore < 50) ringColor = 'text-rose-500';
            else if (healthScore < 80) ringColor = 'text-amber-500';

            let healthPillColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            if (healthScore < 50) healthPillColor = 'bg-rose-50 text-rose-700 border-rose-100';
            else if (healthScore < 80) healthPillColor = 'bg-amber-50 text-amber-700 border-amber-100';

            let mathJustificationHtml = '';
            if (healthDetails) {
              const totalM = healthDetails.milestones_total || 0;
              const completedM = healthDetails.milestones_completed || 0;
              const compRate = healthDetails.completion_rate_percent || 0;
              const budgetRatio = healthDetails.budget_ratio_percent || 0;
              const budgetScore = healthDetails.budget_score_percent || 0;

              mathJustificationHtml = `
                <div class="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[9px]">
                  <div class="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span class="text-slate-500 font-semibold">Milestones: <strong>${completedM}/${totalM}</strong> (${(compRate * 0.5).toFixed(1)}%)</span>
                    <span class="text-slate-500 font-semibold">Budget Spend Ratio: <strong>${budgetRatio}%</strong> (${(budgetScore * 0.5).toFixed(1)}%)</span>
                    <code class="px-1.5 py-0.2 bg-slate-200/60 rounded text-slate-700 font-mono font-bold">Score = ${healthScore}%</code>
                  </div>
                </div>
              `;
            }

            return `
              <div class="bg-slate-50/70 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 transition-all">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="flex items-center gap-3">
                    <div class="relative w-9 h-9 shrink-0 flex items-center justify-center bg-white rounded-full border border-slate-200 shadow-2xs">
                      <svg class="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                        <path class="text-slate-100" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="${ringColor} transition-all duration-700" stroke-dasharray="${healthScore}, 100" stroke-width="3.2" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span class="absolute text-[9px] font-black text-slate-800">${healthScore}%</span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h5 class="font-black text-slate-800 text-xs">${p.name}</h5>
                        <span class="px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${healthPillColor}">${healthScore >= 80 ? 'Optimized' : healthScore >= 50 ? 'Steady' : 'Vulnerable'}</span>
                      </div>
                      <p class="text-[9px] text-slate-400 font-bold uppercase">Client: ${p.client || 'Internal'} &bull; Phase: ${p.current_phase || 'General'}</p>
                    </div>
                  </div>

                  <div class="text-right text-[9px]">
                    <div class="font-bold text-slate-700">Cost: <span class="blur-financial font-mono">₹${formatNumber(p.accumulated_cost)}</span> / <span class="blur-financial font-mono">₹${formatNumber(p.budget)}</span></div>
                    <div class="font-bold text-indigo-600">Billed: <span class="blur-financial font-mono">₹${formatNumber(p.billed_to_date)}</span> / <span class="blur-financial font-mono">₹${formatNumber(p.client_cost)}</span></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 mb-0.5">
                    <span>Financial Burn</span>
                    <span class="${budgetPct > 90 ? 'text-rose-500 font-black' : 'text-slate-600'}">${budgetPct}%</span>
                  </div>
                  <div class="h-1 bg-slate-200/80 rounded-full overflow-hidden">
                    <div class="h-full ${budgetPct > 90 ? 'bg-rose-500' : 'bg-indigo-600'} transition-all duration-700" style="width: ${budgetPct}%"></div>
                  </div>
                </div>

                ${mathJustificationHtml}
              </div>
            `;
          }).join('')}
          ${activeControlCenter.length === 0 ? '<p class="text-xs text-slate-400 font-bold uppercase text-center py-6">No active projects logged</p>' : ''}
        </div>
      </div>

      <!-- Right: Operations & Capacity (5 cols) -->
      <div class="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col">
        <div class="mb-3 flex justify-between items-center">
          <div>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operations & Capacity</span>
            <h4 class="text-base font-black text-slate-800">Resource Presence Command</h4>
          </div>
          <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ${attendanceRate}% Attendance
          </span>
        </div>

        <!-- Static Department Distribution -->
        <div class="space-y-1.5 mb-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <p class="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Department Distribution</p>
          ${Object.entries(resDistribution).map(([dept, count]) => {
            const countVal = parseInt(count) || 0;
            const pct = totalStaff > 0 ? Math.round((countVal / totalStaff) * 100) : 0;
            return `
              <div>
                <div class="flex justify-between items-center text-[8px] font-bold text-slate-600 mb-0.5">
                  <span>${dept}</span>
                  <span class="font-black text-slate-800">${countVal} Staff (${pct}%)</span>
                </div>
                <div class="h-1 bg-slate-200/70 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-600 transition-all duration-500" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 3 Section-Wise Segmented Commercial Tabs (Attendance | Leave | Absent) -->
        <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 mb-3 shrink-0">
          <button type="button" onclick="changeDashboardFilter('opsTab', 'attendance')" class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeOpsTab === 'attendance' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 font-bold hover:text-slate-800'}">
            Attendance (${filteredPresenceHistory.length})
          </button>
          <button type="button" onclick="changeDashboardFilter('opsTab', 'leave')" class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeOpsTab === 'leave' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 font-bold hover:text-slate-800'}">
            Leave (${filteredLeaveRequests.length})
          </button>
          <button type="button" onclick="changeDashboardFilter('opsTab', 'absent')" class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${activeOpsTab === 'absent' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 font-bold hover:text-slate-800'}">
            Absent (${filteredAbsentEmployees.length})
          </button>
        </div>

        <!-- Multi-field Search Filter -->
        <div class="relative mb-3">
          <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <i data-lucide="search" class="w-3 h-3"></i>
          </span>
          <input type="text" id="sidebarSearch" placeholder="Search employee name, department or status..." value="${state.sidebarSearch || ''}" oninput="handleSidebarSearch(this.value)" class="block w-full pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500">
        </div>

        <!-- Tabbed Content View -->
        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[320px]">
          ${opsTabContentHtml}
        </div>
      </div>
    </div>
  `;

  // 4. FULL-WIDTH LIVE ACTIVITY EXECUTION STREAM
  const feedHtml = `
    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-5">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-sm font-black text-slate-800 flex items-center gap-2">
          <i data-lucide="activity" class="text-indigo-600 w-4 h-4"></i> Live Activity Execution Stream
        </h4>
        <span class="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
          Real-time Operations Log
        </span>
      </div>
      <div class="max-h-80 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        ${(state.dashboardData.feed.live_stream || []).map(item => `
          <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors border border-slate-100">
            <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-600">
              <i data-lucide="${item.type === 'Engineering' ? 'terminal' : 'image'}" class="w-4 h-4"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-0.5">
                <p class="text-xs font-black text-slate-800 truncate">${item.employee}</p>
                <span class="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">${item.project || 'General'}</span>
              </div>
              <div class="text-[10px] text-slate-600 font-medium leading-relaxed">${item.details}</div>
            </div>
          </div>
        `).join('') || '<p class="text-center text-slate-400 text-xs py-8 font-bold uppercase tracking-wider">Waiting for activity...</p>'}
      </div>
    </div>
  `;

  return `
    <style>
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
    </style>

    <!-- Compact Executive Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 animate-in">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Production Node v3.2 &bull; Business Overview</p>
        </div>
        <h3 class="text-2xl font-black text-slate-900 tracking-tight" id="dashboard-main-title">
          ${state.isDailyReportVisible ? 'Daily Work Report' : 'Executive Business Overview'}
        </h3>
      </div>
      <button type="button" onclick="toggleDailyReport()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2">
        <i data-lucide="${state.isDailyReportVisible ? 'arrow-left' : 'bar-chart-3'}" class="w-4 h-4"></i> 
        <span id="toggle-report-btn-text">
          ${state.isDailyReportVisible ? 'Back to Overview' : 'View Daily Work Report'}
        </span>
      </button>
    </div>

    <div id="main-dashboard-content" class="transition-all duration-500 ${state.isDailyReportVisible ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}">
      ${alertsBoardHtml}
      ${kpiHtml}
      ${mainExecutionSectionHtml}
      ${feedHtml}
    </div>

    <div id="daily-report-content" class="transition-all duration-500 ${state.isDailyReportVisible ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}">
      <div id="daily-report-dynamic-area">
        ${typeof getDailyReportHtml === 'function' ? getDailyReportHtml() : ''}
      </div>
    </div>
  `;
}

// Expose handlers globally
window.fetchAndRenderDailyReport = fetchAndRenderDailyReport;
window.toggleDailyReport = toggleDailyReport;