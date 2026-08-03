function getAdminDashboardTemplate() {
      if (!state.dashboardData || !state.dashboardData.summary) {
        return `
                    <div class="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                        <div class="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading Dashboard Metrics...</p>
                    </div>
                `;
      }

      const summary = state.dashboardData.summary;
      const ov = summary.overview || {};

      // Dynamic analytical signals from high-signal endpoints
      const analyticsSuite = state.dashboardData.analyticsSuite || {};
      const projectsFeed = state.dashboardData.projects || {};
      const financials = state.dashboardData.financials || {};
      const workforce = state.dashboardData.workforce || {};
      const managerSummary = state.dashboardData.managerSummary || {};

      const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(num);

      const revTrend = ov.revenue_trend || 0;
      const revTrendSign = revTrend >= 0 ? '+' : '';
      const revTrendColor = revTrend >= 0 ? 'text-emerald-300' : 'text-rose-300';
      const revTrendIcon = revTrend >= 0 ? 'trending-up' : 'trending-down';

      const burnTrend = ov.burn_trend || 0;
      const burnTrendSign = burnTrend >= 0 ? '+' : '';
      const burnTrendColor = burnTrend <= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
      const burnTrendIcon = burnTrend <= 0 ? 'trending-down' : 'trending-up';
      const burnTrendText = burnTrend <= 0 ? 'Burn Decrease' : 'Burn Increase';

      // 1. RISK & ALERTS BOARD
      const idleLeakage = analyticsSuite.idle_cost_leakage || 0;
      const srsWarnings = projectsFeed.srs_compliance_warnings || [];
      const budgetWarnings = financials.budget_warnings || [];
      const budgetProjectNames = budgetWarnings.map(w => w.project || w).filter(Boolean);

      let alertsHtmlList = [];
      if (idleLeakage > 0) {
        alertsHtmlList.push(`
                <div onclick="openIdleLeakageModal()" class="cursor-pointer flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                    <div class="absolute -right-2 -bottom-2 w-16 h-16 bg-rose-200/30 rounded-full blur-xl animate-pulse"></div>
                    <div class="p-2 bg-rose-100 rounded-xl text-rose-600 animate-bounce">
                        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-[9px] font-black uppercase text-rose-500 tracking-wider">Leaking Capital Alert</span>
                            <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-200/50 text-rose-700">Critical</span>
                        </div>
                        <p class="text-xs font-bold text-rose-900 leading-snug">
                            ₹${formatNumber(idleLeakage)} in idle capacity costs identified. Reassign underutilized personnel immediately to block leaks.
                        </p>
                    </div>
                </div>
            `);
      }
      if (srsWarnings.length > 0) {
        alertsHtmlList.push(`
                <div onclick="highlightNotificationCenter()" class="cursor-pointer flex items-start gap-3.5 p-4 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                    <div class="absolute -right-2 -bottom-2 w-16 h-16 bg-amber-200/30 rounded-full blur-xl"></div>
                    <div class="p-2 bg-amber-100 rounded-xl text-amber-600">
                        <i data-lucide="file-warning" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-[9px] font-black uppercase text-amber-600 tracking-wider">Compliance Deficit</span>
                            <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-200/50 text-amber-700">Audit Warning</span>
                        </div>
                        <p class="text-xs font-bold text-amber-900 leading-snug">
                            SRS missing or incomplete for: <span class="font-black text-slate-800">${srsWarnings.length > 5 ? srsWarnings.slice(0, 4).join(', ') + ' and ' + (srsWarnings.length - 4) + ' other projects' : srsWarnings.join(', ')}</span>.
                        </p>
                    </div>
                </div>
            `);
      }
      if (budgetProjectNames.length > 0) {
        alertsHtmlList.push(`
                <div onclick="highlightNotificationCenter()" class="cursor-pointer flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                    <div class="absolute -right-2 -bottom-2 w-16 h-16 bg-rose-200/30 rounded-full blur-xl"></div>
                    <div class="p-2 bg-rose-100 rounded-xl text-rose-600">
                        <i data-lucide="wallet" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-[9px] font-black uppercase text-rose-500 tracking-wider">Budget Overrun Risk</span>
                            <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-200/50 text-rose-700">Financial Runaway</span>
                        </div>
                        <p class="text-xs font-bold text-rose-900 leading-snug">
                            Overruns flagged in: <span class="font-black text-slate-800">${budgetProjectNames.length > 5 ? budgetProjectNames.slice(0, 4).join(', ') + ' and ' + (budgetProjectNames.length - 4) + ' other projects' : budgetProjectNames.join(', ')}</span>.
                        </p>
                    </div>
                </div>
            `);
      }

      const alertsBoardHtml = alertsHtmlList.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 animate-in">
                ${alertsHtmlList.join('')}
            </div>
        ` : '';

      // KPI Cards HTML with Premium Aesthetics
      const totalProjectsNum = managerSummary.projects?.total || projectsFeed.global_status?.active || ov.total_projects || 0;
      const totalStaffNum = workforce.radar?.total_staff || ov.total_employees || 0;

      const kpiHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <!-- KPI 2: Total Projects -->
                <div class="relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border border-slate-100 group transition-all hover:-translate-y-1">
                    <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i data-lucide="layers" class="w-16 h-16 text-slate-800"></i>
                    </div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Portfolio</p>
                    <h3 class="text-2xl font-black text-slate-800 mb-2">${totalProjectsNum} Projects</h3>
                    <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-50 w-fit rounded-full border border-slate-100">
                        <i data-lucide="check-circle" class="w-3 h-3 text-indigo-500"></i>
                        <span class="text-[10px] font-bold text-slate-600">Global Execution</span>
                    </div>
                </div>

                <!-- KPI 3: Total Employees -->
                <div class="relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border border-slate-100 group transition-all hover:-translate-y-1">
                    <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i data-lucide="users" class="w-16 h-16 text-slate-800"></i>
                    </div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Workforce</p>
                    <h3 class="text-2xl font-black text-slate-800 mb-2">${totalStaffNum} Members</h3>
                    <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-50 w-fit rounded-full border border-slate-100">
                        <i data-lucide="activity" class="w-3 h-3 text-emerald-500"></i>
                        <span class="text-[10px] font-bold text-slate-600">Active Talent Pool</span>
                    </div>
                </div>

                <!-- KPI 10: Avg Efficiency -->
                <div class="relative overflow-hidden bg-white rounded-3xl p-6 shadow-lg border border-slate-100 group transition-all hover:-translate-y-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resource Efficiency</p>
                    <h3 class="text-2xl font-black text-emerald-600 mb-2">${ov.avg_efficiency || 0}%</h3>
                    <div class="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-full transition-all duration-1000" style="width: ${ov.avg_efficiency || 0}%"></div>
                    </div>
                </div>

                <!-- KPI 11: Total Departments & Roles -->
                <div class="relative overflow-hidden bg-indigo-900 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                    <p class="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Org Structure</p>
                    <h3 class="text-2xl font-black text-white mb-2">${Object.keys(summary.charts.department_counts || {}).length} Departments</h3>
                    <p class="text-[9px] font-bold text-indigo-400">Scaling across organization</p>
                </div>
            </div>
        `;

      const chartsHtml = ``;

      // 3. WIDGETS INTEGRATING HIGH-SIGNAL CHANNELS
      const activeControlCenter = (projectsFeed.active_control_center || []).filter(p => p.name && p.name !== 'N/A');
      const projectHealthList = analyticsSuite.project_health || [];
      const getHealthDetails = (name) => {
        return projectHealthList.find(h => h.name.toLowerCase() === name.toLowerCase()) || null;
      };

      const activeStaff = workforce.radar?.active_today || 0;
      const absentStaff = workforce.radar?.absent_today || 0;
      const totalStaff = workforce.radar?.total_staff || 0;
      const attendanceRate = managerSummary.resources?.attendance_rate || (totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 100);

      const leaveRequests = managerSummary.leave_requests || [];
      const attendanceHistory = managerSummary.attendance_history || [];
      const resDistribution = workforce.resource_distribution || {};

      const phase4Html = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <!-- Portfolio Control Center -->
                <div class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 lg:col-span-2 flex flex-col">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Advanced Portfolio Control</span>
                            <h4 class="text-xl font-black text-slate-800 mt-1">Real-time Execution & Health</h4>
                        </div>
                        <span class="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-lg">
                            ${activeControlCenter.length} Active Tracks
                        </span>
                    </div>

                    <div class="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                        ${activeControlCenter.map(p => {
        const healthDetails = getHealthDetails(p.name);
        const healthScore = healthDetails ? healthDetails.score : 75; // Default score fallback
        const costPct = p.client_cost > 0 ? Math.min(100, Math.round((p.accumulated_cost / p.client_cost) * 100)) : 0;
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
                                    <div class="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-2">
                                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <i data-lucide="shield-alert" class="w-3 h-3 text-indigo-500 shrink-0"></i> Quantitative Health Justification
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                                            <div class="flex flex-col gap-0.5 border-b sm:border-b-0 sm:border-r border-slate-200/50 pb-2 sm:pb-0 sm:pr-2">
                                                <div class="flex justify-between items-center text-slate-400 font-medium">
                                                    <span class="whitespace-nowrap">Milestones:</span>
                                                    <span class="font-bold text-slate-700 whitespace-nowrap">${completedM}/${totalM}</span>
                                                </div>
                                                <div class="flex justify-between items-center font-bold text-slate-700 mt-0.5">
                                                    <span class="whitespace-nowrap">Milestone Wt (50%):</span>
                                                    <span class="text-indigo-600 font-black whitespace-nowrap">${(compRate * 0.5).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col gap-0.5 sm:pl-1">
                                                <div class="flex justify-between items-center text-slate-400 font-medium">
                                                    <span class="whitespace-nowrap">Budget Ratio:</span>
                                                    <span class="font-bold text-slate-700 whitespace-nowrap">${budgetRatio}%</span>
                                                </div>
                                                <div class="flex justify-between items-center font-bold text-slate-700 mt-0.5">
                                                    <span class="whitespace-nowrap">Budget Wt (50%):</span>
                                                    <span class="text-amber-600 font-black whitespace-nowrap">${(budgetScore * 0.5).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right flex items-center justify-end gap-1 mt-0.5">
                                            <span>Formula:</span>
                                            <code class="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono font-black border border-slate-200/30">Score = ${(compRate * 0.5).toFixed(1)}% + ${(budgetScore * 0.5).toFixed(1)}% = ${healthScore}%</code>
                                        </div>
                                    </div>
                                `;
        }

        return `
                                <div class="group bg-slate-50/50 p-5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 animate-in">
                                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                        <div class="flex items-center gap-3.5">
                                            <!-- High-End Circular Health Ring -->
                                            <div class="relative w-11 h-11 shrink-0 flex items-center justify-center bg-white rounded-full shadow-sm">
                                                <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                                                    <path class="text-slate-100" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    <path class="${ringColor} transition-all duration-1000" stroke-dasharray="${healthScore}, 100" stroke-width="3.2" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                </svg>
                                                <div class="absolute text-[10px] font-black text-slate-800">${healthScore}%</div>
                                            </div>
                                            <div>
                                                <div class="flex items-center gap-2 mb-0.5">
                                                    <h5 class="font-black text-slate-800 text-sm group-hover:text-brand-primary transition-colors">${p.name}</h5>
                                                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase ${healthPillColor}">${healthScore >= 80 ? 'Optimized' : healthScore >= 50 ? 'Steady' : 'Vulnerable'}</span>
                                                </div>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Client: ${p.client} &bull; Phase: ${p.current_phase || 'No Active Phase'}</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-4 sm:text-right shrink-0">
                                            <div>
                                                <p class="text-[8px] font-black text-slate-400 uppercase mb-0.5">Budget Rate</p>
                                                <span class="text-[10px] font-black text-slate-850 whitespace-nowrap">₹${formatNumber(p.accumulated_cost)} / ₹${formatNumber(p.budget)}</span>
                                            </div>
                                            <div>
                                                <p class="text-[8px] font-black text-slate-400 uppercase mb-0.5">Client Rate</p>
                                                <span class="text-[10px] font-black text-indigo-600 whitespace-nowrap">₹${formatNumber(p.billed_to_date)} / ₹${formatNumber(p.client_cost)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Budget Burn Progress Tracking -->
                                    <div>
                                        <div class="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 mb-1">
                                            <span>Financial Cost Burn</span>
                                            <span class="${budgetPct > 90 ? 'text-rose-500 font-black' : 'text-slate-600'}">${budgetPct}% Spent</span>
                                        </div>
                                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="h-full transition-all duration-1000 ${budgetPct > 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg' : 'bg-gradient-to-r from-brand-primary to-indigo-500'}" style="width: ${budgetPct}%"></div>
                                        </div>
                                    </div>

                                    <!-- Mathematical Vulnerability/Health Justification -->
                                    ${mathJustificationHtml}
                                </div>
                            `;
      }).join('')}
                    </div>
                </div>

                <!-- Resource Capacity & Operations Tickers -->
                <div class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full">
                    <div class="mb-6">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operations Command Center</span>
                        <h4 class="text-xl font-black text-slate-800 mt-1">Resource Capacity & Attendance</h4>
                    </div>

                    <!-- Attendance Rate Indicator Ring -->
                    <div class="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6 shrink-0">
                        <div class="relative w-12 h-12 shrink-0 flex items-center justify-center bg-white rounded-full shadow-sm">
                            <svg class="w-11 h-11 transform -rotate-90" viewBox="0 0 36 36">
                                <path class="text-slate-100" stroke-width="3.2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="text-emerald-500 transition-all duration-1000" stroke-dasharray="${attendanceRate}, 100" stroke-width="3.4" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div class="absolute text-[10px] font-black text-slate-800">${attendanceRate}%</div>
                        </div>
                        <div>
                            <h5 class="text-xs font-black text-slate-800 mb-0.5">Today's Attendance Rate</h5>
                            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                                ${activeStaff} Present &bull; ${absentStaff} Absent &bull; ${totalStaff} Total
                            </p>
                        </div>
                    </div>

                    <!-- Department Distribution Bars -->
                    <div class="mb-6 shrink-0">
                        <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Department Talent Pool</h5>
                        <div class="space-y-2.5">
                            ${Object.entries(resDistribution).map(([dept, count]) => {
        const countVal = parseInt(count) || 0;
        const pct = totalStaff > 0 ? Math.round((countVal / totalStaff) * 100) : 0;
        return `
                                    <div>
                                        <div class="flex justify-between items-center text-[9px] font-bold text-slate-600 mb-1">
                                            <span>${dept}</span>
                                            <span class="font-black text-slate-850">${countVal} Staff (${pct}%)</span>
                                        </div>
                                        <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div class="h-full bg-indigo-600 transition-all duration-1000" style="width: ${pct}%"></div>
                                        </div>
                                    </div>
                                `;
      }).join('')}
                            ${Object.keys(resDistribution).length === 0 ? '<p class="text-xs text-slate-400 font-bold uppercase py-2">No department data</p>' : ''}
                        </div>
                    </div>

                    <!-- Leaves & Active Logs -->
                    <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[220px]">
                        <!-- Absent Today Section -->
                        ${workforce.radar?.absent_employees && workforce.radar.absent_employees.length > 0 ? `
                            <div class="mb-5 shrink-0 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                                <h5 class="text-[10px] font-black text-rose-850 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                    <i data-lucide="user-x" class="w-3.5 h-3.5 text-rose-600"></i> Absent Today (${workforce.radar.absent_employees.length})
                                </h5>
                                <div class="space-y-2">
                                    ${workforce.radar.absent_employees.map(emp => `
                                        <div class="bg-white p-2.5 rounded-xl border border-rose-100/30 flex justify-between items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div class="min-w-0">
                                                <p class="text-xs font-black text-slate-800 truncate">${emp.name}</p>
                                                <p class="text-[9px] text-slate-400 font-semibold truncate">@${emp.username} &bull; ${emp.department}</p>
                                            </div>
                                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100 shrink-0">Absent</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : `
                            <div class="mb-5 shrink-0 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/30 flex items-center gap-2">
                                <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
                                <div>
                                    <h6 class="text-[10px] font-black text-slate-850">Perfect Presence</h6>
                                    <p class="text-[9px] text-slate-450 font-bold uppercase mt-0.5">All employees accounted for today</p>
                                </div>
                            </div>
                        `}

                        <!-- Leave Requests -->
                        ${leaveRequests.length > 0 ? `
                            <div class="mb-5 shrink-0">
                                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                    <i data-lucide="plane-takeoff" class="w-3.5 h-3.5 text-indigo-500"></i> Leave Requests
                                </h5>
                                <div class="space-y-2 animate-in">
                                    ${leaveRequests.map(l => `
                                        <div class="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 flex justify-between items-center gap-3">
                                            <div class="min-w-0">
                                                <p class="text-xs font-black text-indigo-950 truncate">${l.employee_name}</p>
                                                <p class="text-[9px] text-indigo-700 font-bold">${l.reason}</p>
                                            </div>
                                            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-100 text-indigo-800 shrink-0">${l.status}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Attendance history -->
                        <div>
                            <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                <i data-lucide="clock-arrow-up" class="w-3.5 h-3.5 text-emerald-500"></i> Live Presence Feed
                            </h5>
                            <div class="space-y-2">
                                ${attendanceHistory.map(a => {
        const timeStr = a.check_in ? new Date(a.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
        return `
                                        <div class="bg-slate-50/50 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center gap-3 transition-colors">
                                            <div class="min-w-0">
                                                <p class="text-xs font-black text-slate-800 truncate">${a.employee_name}</p>
                                                <p class="text-[9px] text-slate-400 font-bold uppercase">${a.status}</p>
                                            </div>
                                            <div class="text-right shrink-0">
                                                <p class="text-xs font-black text-slate-800">${timeStr}</p>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase">Check-in</p>
                                            </div>
                                        </div>
                                    `;
      }).join('')}
                                ${attendanceHistory.length === 0 ? '<p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">No check-in logs recorded today</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

      // 4. METADATA & TASK ANALYTICS BOARD
      const metaAnalytics = state.dashboardData.metadataAnalytics || { sprints: [], modules: [], features: [] };
      const activeMetaTab = state.metadataTab || 'sprints';
      const metaDataList = metaAnalytics[activeMetaTab] || [];

      const metadataAnalyticsHtml = `
            <div class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 flex flex-col">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operational Metadata Analytics</span>
                        <h4 class="text-xl font-black text-slate-800 mt-1">Sprints, Modules & Features Performance</h4>
                        <p class="text-[10px] text-slate-450 font-bold mt-0.5">Unified dev and content creator operational tracking metrics</p>
                    </div>
                    <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button onclick="changeDashboardFilter('metadataTab', 'sprints')" class="px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${activeMetaTab === 'sprints' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 font-bold'}">Sprints</button>
                        <button onclick="changeDashboardFilter('metadataTab', 'modules')" class="px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${activeMetaTab === 'modules' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 font-bold'}">Modules</button>
                        <button onclick="changeDashboardFilter('metadataTab', 'features')" class="px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${activeMetaTab === 'features' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 font-bold'}">Features</button>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th class="pb-3 text-left font-black">${activeMetaTab.charAt(0).toUpperCase() + activeMetaTab.slice(1, -1)} Name</th>
                                <th class="pb-3 text-center font-black">Tasks Logged</th>
                                <th class="pb-3 text-center font-black">Hours Logged</th>
                                <th class="pb-3 text-right font-black">Cost</th>
                                <th class="pb-3 text-right font-black">Billed</th>
                                <th class="pb-3 text-right font-black">Profit/Loss</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${metaDataList.map(row => {
                                const profit = row.profit_loss || 0;
                                const profitBadge = profit >= 0
                                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">+₹${formatNumber(profit)}</span>`
                                    : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100">-₹${formatNumber(Math.abs(profit))}</span>`;
                                return `
                                    <tr class="hover:bg-slate-50/50 transition-colors">
                                        <td class="py-3.5 text-xs font-black text-slate-800">${row.name || 'N/A'}</td>
                                        <td class="py-3.5 text-xs font-bold text-slate-600 text-center">${row.tasks}</td>
                                        <td class="py-3.5 text-xs font-bold text-slate-600 text-center">${row.hours} hrs</td>
                                        <td class="py-3.5 text-xs font-bold text-slate-600 text-right">₹${formatNumber(row.cost)}</td>
                                        <td class="py-3.5 text-xs font-bold text-slate-600 text-right">₹${formatNumber(row.billing)}</td>
                                        <td class="py-3.5 text-xs font-bold text-right">${profitBadge}</td>
                                    </tr>
                                `;
                            }).join('')}
                            ${metaDataList.length === 0 ? `
                                <tr>
                                    <td colspan="6" class="py-8 text-center text-xs font-bold uppercase tracking-wider text-slate-400">No metadata records found</td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
      `;

      // Execution Stream section remains unchanged but refined
      const feedHtml = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div id="executive-notifications-section" class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all duration-700">
                    <h4 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2"><i data-lucide="bell-ring" class="text-rose-500 w-5 h-5"></i> Notifications</h4>
                    <div class="max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        ${summary.notifications.map(n => `
                            <div class="p-3 mb-2.5 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3">
                                <div class="w-1.5 h-1.5 rounded-full ${n.type === 'risk' ? 'bg-rose-500' : 'bg-amber-500'} shrink-0 animate-pulse"></div>
                                <div class="flex-1 text-[11px] font-bold text-slate-700">${n.message}</div>
                                <div class="text-[9px] font-black text-slate-300 uppercase">${n.time || 'Today'}</div>
                            </div>
                        `).join('')}
                        ${summary.notifications.length === 0 ? '<p class="text-center text-slate-400 text-xs py-6 font-bold uppercase tracking-widest opacity-50">System Clear</p>' : ''}
                    </div>
                </div>

                <div class="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h4 class="text-lg font-black text-slate-800 mb-5 flex items-center gap-2"><i data-lucide="activity" class="text-indigo-500 w-5 h-5"></i> Execution Stream</h4>
                    <div class="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        ${(state.dashboardData.feed.live_stream || []).map(item => `
                            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                    <i data-lucide="${item.type === 'Engineering' ? 'terminal' : 'image'}" class="w-5 h-5 text-indigo-500"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-black text-slate-800 mb-0.5">${item.employee}</p>
                                    <div class="text-[10px] text-slate-500 font-bold leading-relaxed">${item.details}</div>
                                </div>
                            </div>
                        `).join('') || '<p class="text-center text-slate-400 text-sm py-8 font-bold uppercase tracking-widest opacity-50">Waiting for activity...</p>'}
                    </div>
                </div>
            </div>
        `;

      return `
            <style>
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            </style>

            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-in">
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Executive Suite v3.2</p>
                    </div>
                    <h3 class="text-4xl font-black text-slate-900 tracking-tighter" id="dashboard-main-title">
                        ${state.isDailyReportVisible ? 'Daily Work Report' : 'Executive Overview'}
                    </h3>
                </div>
                <button onclick="toggleDailyReport()" class="group relative px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-[2rem] shadow-2xl shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-3 overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <i data-lucide="${state.isDailyReportVisible ? 'arrow-left' : 'bar-chart-3'}" class="w-5 h-5 relative z-10"></i>
                    <span id="toggle-report-btn-text" class="relative z-10">
                        ${state.isDailyReportVisible ? 'Back to Overview' : 'View Daily Work Report'}
                    </span>
                </button>
            </div>

            <div id="main-dashboard-content" class="transition-all duration-700 ${state.isDailyReportVisible ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}">
                ${alertsBoardHtml}
                ${kpiHtml}
                ${chartsHtml}
                ${phase4Html}
                ${metadataAnalyticsHtml}
                ${feedHtml}
            </div>

            <div id="daily-report-content" class="transition-all duration-700 ${state.isDailyReportVisible ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}">
                <div id="daily-report-dynamic-area">
                    ${getDailyReportHtml()}
                </div>
            </div>
        `;
    }

function initChartsIfApplicable() {
      if (state.adminView === "dashboard") {
        setTimeout(initDashboardCharts, 50);
      } else if (state.adminView === "projects") {
        // If you implemented the phase 5 active project view, handle it here. Otherwise:
        if (
          typeof renderAdminProjectsTable === "function" &&
          !state.activeProject
        ) {
          setTimeout(renderAdminProjectsTable, 50);
        }
      }
    }

async function loadDashboardData() {
      // Bypassed for Manager Control Center to save bandwidth and ensure role isolation
      state.dashboardData = {
        summary: null,
        feed: { live_stream: [], system_alerts: [] },
        analyticsSuite: null,
        projects: null,
        financials: null,
        workforce: null,
        managerSummary: null,
        metadataAnalytics: { sprints: [], modules: [], features: [] },
      };
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
          revSumEl.textContent = formatCurrency(totalRevSum);
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
                    return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
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
        if (incSumEl) incSumEl.textContent = formatCurrency(totalIncSum);
        if (penSumEl) penSumEl.textContent = formatCurrency(totalPenSum);

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
                    return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
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
                    return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
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
                    return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
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