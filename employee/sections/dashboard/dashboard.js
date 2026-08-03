function getEmployeeDashboardTemplate() {
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);

            // Determine active/today attendance status
            // First, find if there is an active check-in (no check-out time)
            let activeAttendance = null;
            if (state.myAttendance && state.myAttendance.length > 0) {
                activeAttendance = state.myAttendance.find(a => a.check_in_time && !a.check_out_time);
            }

            // Next, find today's completed attendance (using local date string YYYY-MM-DD)
            const localTodayStr = new Date().toLocaleDateString('sv-SE'); // Formats as YYYY-MM-DD local time
            let todayAttendance = null;
            if (state.myAttendance && state.myAttendance.length > 0) {
                todayAttendance = state.myAttendance.find(a => {
                    const checkInDate = a.check_in_time ? a.check_in_time.split(' ')[0] : (a.date ? a.date.split(' ')[0] : '');
                    return checkInDate === localTodayStr;
                });
            }

            // Decide which attendance to show in the widget
            let attendanceWidgetHtml = '';
            if (activeAttendance) {
                // Show checked-in state
                const checkInDateObj = new Date(activeAttendance.check_in_time);
                const checkInTime = checkInDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isToday = activeAttendance.check_in_time.startsWith(localTodayStr);
                const dateLabel = isToday ? 'today' : `on ${checkInDateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

                attendanceWidgetHtml = `
                    <div class="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 mb-8 animate-in fade-in duration-350">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                                <i data-lucide="check-circle" class="w-6 h-6 text-white animate-pulse"></i>
                            </div>
                            <div>
                                <h4 class="text-white font-bold text-lg flex items-center gap-2">You are Checked In</h4>
                                <p class="text-emerald-50 text-xs mt-0.5">Checked in at ${checkInTime} ${dateLabel}. Have a great workday!</p>
                            </div>
                        </div>
                        
                        <!-- Premium Clock Widget showing elapsed work hours (capped to hide overtime) -->
                        <div class="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white shadow-inner backdrop-blur-sm shrink-0">
                            <div class="flex flex-col items-center">
                                <span class="text-[9px] font-black tracking-widest text-emerald-100 uppercase">Worktime Elapsed</span>
                                <span id="elapsed-timer-clock" class="text-lg font-black font-mono tracking-wider mt-0.5" data-checkin="${activeAttendance.check_in_time}">00:00:00</span>
                            </div>
                            <div class="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center animate-spin" style="animation-duration: 10s">
                                <i data-lucide="clock" class="w-4 h-4 text-emerald-100"></i>
                            </div>
                        </div>

                        <button onclick="handleCheckOut(event)" class="bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all flex items-center shrink-0 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]">
                            <i data-lucide="log-out" class="w-4 h-4 mr-2"></i> Check Out
                        </button>
                    </div>
                `;
            } else if (todayAttendance) {
                // Show shift completed state or absent state
                const checkInTime = todayAttendance.check_in_time ? new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const checkOutTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const totalHrs = todayAttendance.total_hours ? (h => {
                    const tm = Math.round(h * 60);
                    const hrs = Math.floor(tm / 60);
                    const mins = tm % 60;
                    return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
                })(todayAttendance.total_hours) : '--';
                
                if (todayAttendance.status === 'Absent') {
                    // Employee was marked absent, but since they have no active attendance, show Check-In buttons!
                    // This allows them to check in even if auto-marked absent.
                    attendanceWidgetHtml = `
                        <div class="bg-gradient-to-r from-brand-dark to-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-in fade-in duration-350">
                            <div>
                                <h4 class="text-white font-bold text-lg flex items-center gap-2"><i data-lucide="clock" class="w-5 h-5 text-rose-400"></i> Marked Absent</h4>
                                <p class="text-slate-300 text-sm mt-1">You were auto-marked absent today. You can still check in to start your work.</p>
                            </div>
                            <div class="flex gap-2.5">
                                <button onclick="handleCheckIn(event, 'Office')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center shrink-0 text-xs">
                                    <i data-lucide="log-in" class="w-4 h-4 mr-1.5"></i> Check In (Office)
                                </button>
                                <button onclick="handleCheckIn(event, 'Work From Home')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center shrink-0 text-xs">
                                    <i data-lucide="home" class="w-4 h-4 mr-1.5"></i> Out of Office (WFH)
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    attendanceWidgetHtml = `
                        <div class="bg-slate-200/50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-in fade-in duration-350">
                            <div>
                                <h4 class="text-slate-700 font-bold text-lg flex items-center gap-2"><i data-lucide="check-check" class="w-5 h-5 text-brand-primary"></i> Shift Completed</h4>
                                <p class="text-slate-500 text-sm mt-1">In: ${checkInTime} &bull; Out: ${checkOutTime} &bull; <span class="font-bold text-slate-700">${totalHrs}</span> total.</p>
                            </div>
                        </div>
                    `;
                }
            } else {
                // Show default check-in state
                attendanceWidgetHtml = `
                    <div class="bg-gradient-to-r from-brand-dark to-slate-800 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 animate-in fade-in duration-350">
                        <div>
                            <h4 class="text-white font-bold text-lg flex items-center gap-2"><i data-lucide="clock" class="w-5 h-5 text-emerald-400"></i> Start Your Day</h4>
                            <p class="text-slate-300 text-sm mt-1">Remember to check in to record your attendance today.</p>
                        </div>
                        <div class="flex gap-2.5">
                            <button onclick="handleCheckIn(event, 'Office')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center shrink-0 text-xs">
                                <i data-lucide="log-in" class="w-4 h-4 mr-1.5"></i> Check In (Office)
                            </button>
                            <button onclick="handleCheckIn(event, 'Work From Home')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center shrink-0 text-xs">
                                <i data-lucide="home" class="w-4 h-4 mr-1.5"></i> Out of Office (WFH)
                            </button>
                        </div>
                    </div>
                `;
            }

            // --- 1. Compute Dashboard Summaries (3 Blocks) ---
            const activeProjectIds = new Set(state.projects ? state.projects.map(p => p.id) : []);
            const projectsAssignedCount = state.projects ? state.projects.length : 0;
            
            // Only consider milestones that belong to active/non-completed projects
            let activeMilestonesForActiveProjects = [];
            if (state.myMilestones) {
                state.myMilestones.forEach(m => {
                    if (activeProjectIds.has(m.project_id)) {
                        activeMilestonesForActiveProjects.push(m);
                    }
                });
            }

            const pendingMilestones = activeMilestonesForActiveProjects.filter(m => (m.status || '').toLowerCase() !== 'completed');
            const activeMilestonesCount = pendingMilestones.length;

            let upcomingDeadlinesCount = 0;
            let overdueDeadlinesCount = 0;
            const nowTime = new Date();
            nowTime.setHours(0, 0, 0, 0);
            const warningLimit = new Date();
            warningLimit.setDate(nowTime.getDate() + 7); // 7 days window
            warningLimit.setHours(23, 59, 59, 999);

            // Build work deadlines radar lists
            let deadlineAlertsList = [];

            // Check projects deadlines (only active projects)
            if (state.projects) {
                state.projects.forEach(p => {
                    if (p.end_date && p.end_date !== 'N/A' && p.status !== 'Completed') {
                        const pDeadline = new Date(p.end_date);
                        if (!isNaN(pDeadline.getTime())) {
                            if (pDeadline < nowTime) {
                                overdueDeadlinesCount++;
                                deadlineAlertsList.push({
                                    type: 'Project Overdue',
                                    name: p.name,
                                    daysText: 'Overdue',
                                    dateText: p.end_date,
                                    isOverdue: true
                                });
                            } else if (pDeadline >= nowTime && pDeadline <= warningLimit) {
                                upcomingDeadlinesCount++;
                                const diffDays = Math.ceil((pDeadline - nowTime) / (1000 * 60 * 60 * 24));
                                deadlineAlertsList.push({
                                    type: 'Project Deadline',
                                    name: p.name,
                                    daysText: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
                                    dateText: p.end_date,
                                    isOverdue: false
                                });
                            }
                        }
                    }
                });
            }

            // Check milestones deadlines (only milestones belonging to active projects and which are pending/active)
            pendingMilestones.forEach(m => {
                if (m.expected_end) {
                    const mDeadline = new Date(m.expected_end);
                    if (!isNaN(mDeadline.getTime())) {
                        if (mDeadline < nowTime) {
                            overdueDeadlinesCount++;
                            deadlineAlertsList.push({
                                type: 'Milestone Overdue',
                                name: `${m.projectName} &bull; ${m.milestone_name}`,
                                daysText: 'Overdue',
                                dateText: new Date(m.expected_end).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                isOverdue: true
                            });
                        } else if (mDeadline >= nowTime && mDeadline <= warningLimit) {
                            upcomingDeadlinesCount++;
                            const diffDays = Math.ceil((mDeadline - nowTime) / (1000 * 60 * 60 * 24));
                            deadlineAlertsList.push({
                                type: 'Milestone Deadline',
                                name: `${m.projectName} &bull; ${m.milestone_name}`,
                                daysText: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
                                dateText: new Date(m.expected_end).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                isOverdue: false
                            });
                        }
                    }
                }
            });

            // Sort deadlines list: Overdue first, then upcoming soonest first
            deadlineAlertsList.sort((a, b) => {
                if (a.isOverdue && !b.isOverdue) return -1;
                if (!a.isOverdue && b.isOverdue) return 1;
                return new Date(a.dateText) - new Date(b.dateText);
            });

            // --- 2. Milestone board shower list generation (filter out ended projects) ---
            const showActive = (state.milestoneTab || 'active') === 'active';
            const filteredMilestones = activeMilestonesForActiveProjects.filter(m => {
                const isComp = (m.status || '').toLowerCase() === 'completed';
                return showActive ? !isComp : isComp;
            });

            const milestonesHtml = filteredMilestones.map(m => {
                const isDelayed = m.is_delayed || (m.status || '').toLowerCase() === 'delayed';
                const dueDate = m.expected_end ? new Date(m.expected_end).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                const startDate = m.expected_start ? new Date(m.expected_start).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A';
                
                // Tech badge
                const techBadge = m.work_type ? `<span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold uppercase tracking-wider">${m.work_type}</span>` : '';
                
                // Status badge class
                let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                if ((m.status || '').toLowerCase() === 'active') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                else if (isDelayed) badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
                else if ((m.status || '').toLowerCase() === 'completed') badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                
                // Delay warning (past expected end and not completed)
                let riskAlertsHtml = '';
                if (isDelayed && (m.status || '').toLowerCase() !== 'completed') {
                    riskAlertsHtml += `
                        <div class="mt-2 px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                            <i data-lucide="clock" class="w-4 h-4 text-rose-500 shrink-0"></i>
                            <span>Milestone Overdue: Expected end date was ${dueDate}</span>
                        </div>
                    `;
                }

                return `
                    <div class="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-1.5">
                                <h5 class="font-bold text-slate-800 text-sm md:text-base truncate max-w-md">${m.milestone_name}</h5>
                                ${techBadge}
                            </div>
                            <p class="text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap">
                                <span class="text-slate-700 font-bold">${m.projectName}</span>
                                <span>&bull;</span>
                                <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${startDate} - ${dueDate}</span>
                            </p>
                            ${riskAlertsHtml}
                        </div>
                        <div class="flex items-center gap-3 self-start md:self-auto shrink-0">
                            <span class="px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeClass}">
                                ${m.status}
                            </span>
                        </div>
                    </div>
                `;
            }).join('') || `<p class="p-8 text-slate-400 text-center text-sm font-medium">No ${showActive ? 'active' : 'completed'} milestones found for active projects.</p>`;

            // --- 3. Handover Coverages ---
            const backupCoverages = state.backupCoverages || [];
            const backupCoveragesHtml = backupCoverages.map(cover => {
                const startStr = cover.start_date ? new Date(cover.start_date).toLocaleDateString() : 'N/A';
                const endStr = cover.end_date ? new Date(cover.end_date).toLocaleDateString() : 'N/A';
                
                const projObj = state.projects.find(p => p.id === cover.project_id);
                const projName = projObj ? projObj.name : 'N/A';
                
                let milestoneName = 'General Task (No Milestone)';
                if (cover.milestone_id && cover.project_id && state.projectTimelines) {
                    const milestones = state.projectTimelines[cover.project_id] || [];
                    const milestoneObj = milestones.find(m => m.id === cover.milestone_id);
                    if (milestoneObj) {
                        milestoneName = milestoneObj.milestone_name;
                    }
                }

                let detailsSection = '';
                if (cover.project_id) {
                    detailsSection = `
                        <div class="mt-1 text-xs text-slate-500 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/40 mb-3 font-medium">
                            <div><strong>Project:</strong> ${projName}</div>
                            <div><strong>Milestone:</strong> ${milestoneName}</div>
                            <div><strong>Task Type:</strong> ${cover.task_type === 'developer' ? 'Engineering' : cover.task_type === 'content' ? 'Content' : 'Both'}</div>
                        </div>
                    `;
                }

                let buttonsHtml = '';
                if (cover.status === 'Approved') {
                    const type = cover.task_type || 'both';
                    if (type === 'developer' || type === 'both') {
                        buttonsHtml += `
                            <button onclick="window.logHandoverTaskFor('${cover.employee_id}', 'dev')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all shadow-sm">
                                <i data-lucide="terminal" class="w-3.5 h-3.5"></i> Log Engineering Handover
                            </button>
                        `;
                    }
                    if (type === 'content' || type === 'both') {
                        buttonsHtml += `
                            <button onclick="window.logHandoverTaskFor('${cover.employee_id}', 'content')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm">
                                <i data-lucide="video" class="w-3.5 h-3.5"></i> Log Content Handover
                            </button>
                        `;
                    }
                }

                const actionArea = buttonsHtml ? `
                    <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                        ${buttonsHtml}
                    </div>
                ` : '';

                // Badge status styling
                let statusBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                if (cover.status === 'Approved') {
                    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (cover.status === 'Cancelled' || cover.status === 'Rejected') {
                    statusBadgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                }

                return `
                    <div class="p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                            <div>
                                <h5 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <i data-lucide="shield-alert" class="w-4 h-4 text-indigo-500"></i>
                                    Coverage for ${cover.employee_name}
                                </h5>
                                <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                                    ${startStr} - ${endStr} (${cover.total_days} ${cover.total_days === 1 ? 'day' : 'days'})
                                </p>
                            </div>
                            <div class="shrink-0">
                                <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${statusBadgeClass}">
                                    ${cover.status}
                                </span>
                            </div>
                        </div>
                         <div class="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                            ${detailsSection}
                            <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <i data-lucide="clipboard-list" class="w-3 h-3 text-slate-400"></i>
                                Handover Task / Pending Work
                            </span>
                            <p class="text-xs text-slate-600 leading-relaxed font-medium mb-3">${cover.pending_work_summary || 'No pending work logged.'}</p>
                            ${actionArea}
                        </div>
                    </div>
                `;
            }).join('') || `
                <div class="p-6 text-center text-slate-500 text-sm italic">
                    No backup duties assigned to you.
                </div>
            `;

            // --- 4. Active Deadlines Radar (Focus on coming/overdue deadlines ONLY) ---
            const deadlineRadarHtml = deadlineAlertsList.map(alert => {
                const isOverdue = alert.isOverdue;
                const badgeColor = isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200';
                const iconColor = isOverdue ? 'text-rose-500 bg-rose-50' : 'text-amber-500 bg-amber-50';
                const iconName = isOverdue ? 'alert-circle' : 'calendar-clock';
                
                return `
                    <div class="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors animate-in fade-in">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center shrink-0">
                                <i data-lucide="${iconName}" class="w-4 h-4"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center justify-between gap-2 mb-1">
                                    <span class="text-[10px] font-black uppercase tracking-wider ${isOverdue ? 'text-rose-600' : 'text-amber-600'}">${alert.type}</span>
                                    <span class="px-2 py-0.5 border rounded-full text-[9px] font-black ${badgeColor}">${alert.daysText}</span>
                                </div>
                                <p class="font-bold text-slate-800 text-sm leading-snug">${alert.name}</p>
                                <p class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                                    <i data-lucide="calendar" class="w-3 h-3"></i> Deadline: ${alert.dateText}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || `
                <div class="p-8 text-center text-slate-400">
                    <i data-lucide="shield-check" class="w-10 h-10 mx-auto mb-2 text-emerald-500"></i>
                    <p class="text-sm font-bold text-slate-700">No Approaching Deadlines</p>
                    <p class="text-xs mt-1">All assigned projects and milestones are operating on track.</p>
                </div>
            `;

            const missingFields = checkMandatoryFieldsMissing(state.employeeData || {});
            let missingAlertHtml = '';
            if (missingFields.length > 0) {
                missingAlertHtml = `
                    <div class="mb-6 p-4 rounded-xl bg-rose-50/50 border border-rose-200 text-rose-800 flex items-start shadow-sm mt-4">
                        <i data-lucide="alert-triangle" class="w-5 h-5 mr-3 text-rose-600 shrink-0 mt-0.5 animate-bounce"></i>
                        <div class="text-sm">
                            <span class="font-bold text-rose-700">Incomplete Profile Details:</span> 
                            Please complete the following mandatory fields to ensure compliance: 
                            <span class="font-semibold text-rose-600">${missingFields.join(', ')}</span>.
                        </div>
                    </div>
                `;
            }

            return `
                <div class="mb-8 mt-2">
                    <h3 class="text-2xl md:text-3xl font-black text-slate-800 mb-1.5 tracking-tight">Welcome back, ${state.employeeData?.full_name || state.user.sub}</h3>
                    <p class="text-slate-500 text-sm font-medium">Manage your active projects, timeline milestones, and work submissions.</p>
                </div>

                ${missingAlertHtml}

                ${attendanceWidgetHtml}

                <!-- New Layered Summary Blocks -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10 animate-in fade-in duration-300">
                    <!-- Block 1: Projects Assigned -->
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-xl flex items-center justify-center mr-4 md:mr-5 shrink-0">
                            <i data-lucide="folder-git-2" class="w-6 h-6 md:w-7 md:h-7 text-brand-primary"></i>
                        </div>
                        <div>
                            <p class="text-xs md:text-sm text-slate-500 font-medium mb-1">Active Projects</p>
                            <h4 class="text-2xl md:text-3xl font-black text-slate-800">${projectsAssignedCount}</h4>
                        </div>
                    </div>
                    <!-- Block 2: Milestones Assigned -->
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 rounded-xl flex items-center justify-center mr-4 md:mr-5 shrink-0">
                            <i data-lucide="target" class="w-6 h-6 md:w-7 md:h-7 text-brand-accent"></i>
                        </div>
                        <div>
                            <p class="text-xs md:text-sm text-slate-500 font-medium mb-1">Pending Milestones</p>
                            <h4 class="text-2xl md:text-3xl font-black text-slate-800">${activeMilestonesCount}</h4>
                        </div>
                    </div>
                    <!-- Block 3: Upcoming & Overdue Deadlines -->
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center">
                        <div class="w-12 h-12 md:w-14 md:h-14 bg-amber-50 rounded-xl flex items-center justify-center mr-4 md:mr-5 shrink-0">
                            <i data-lucide="calendar-clock" class="w-6 h-6 md:w-7 md:h-7 text-amber-500"></i>
                        </div>
                        <div>
                            <p class="text-xs md:text-sm text-slate-500 font-medium mb-1">Upcoming/Overdue Deadlines</p>
                            <h4 class="text-2xl md:text-3xl font-black ${overdueDeadlinesCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}">${upcomingDeadlinesCount + overdueDeadlinesCount}</h4>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Left Column: Actions & Active Milestones Board -->
                    <div class="lg:col-span-2 space-y-8">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-lg font-bold text-slate-800">Log Your Work</h4>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onclick="routeApp('log-dev')" class="group text-left bg-white border border-slate-200 hover:border-brand-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center transition-colors">
                                            <i data-lucide="terminal" class="w-5 h-5 text-slate-600 group-hover:text-brand-primary"></i>
                                        </div>
                                        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-400 group-hover:text-brand-primary transform group-hover:translate-x-1 transition-all"></i>
                                    </div>
                                    <h5 class="text-lg font-bold text-slate-800 mb-1">Engineering Task</h5>
                                    <p class="text-xs text-slate-500 font-medium">Log dev hours, tech stack, and GitHub commits.</p>
                                </button>

                                <button onclick="routeApp('log-content')" class="group text-left bg-white border border-slate-200 hover:border-brand-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center transition-colors">
                                            <i data-lucide="video" class="w-5 h-5 text-slate-600 group-hover:text-brand-primary"></i>
                                        </div>
                                        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-400 group-hover:text-brand-primary transform group-hover:translate-x-1 transition-all"></i>
                                    </div>
                                    <h5 class="text-lg font-bold text-slate-800 mb-1">Content Task</h5>
                                    <p class="text-xs text-slate-500 font-medium">Log reels, videos, posters, and engagement metrics.</p>
                                </button>
                            </div>
                        </div>

                        <!-- Premium Milestones Board -->
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
                            <div class="px-6 py-4 border-b border-slate-100 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="target" class="w-5 h-5 text-brand-primary"></i>
                                    <h4 class="font-bold text-slate-800">Your Milestone Board</h4>
                                </div>
                                <!-- Filter Tabs -->
                                <div class="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/50">
                                    <button onclick="window.switchMilestoneTab('active')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${showActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                                        Active & Pending
                                    </button>
                                    <button onclick="window.switchMilestoneTab('completed')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${!showActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                                        Completed
                                    </button>
                                </div>
                            </div>
                            <div class="flex flex-col divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                                ${milestonesHtml}
                            </div>
                            <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                                <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 text-slate-400"></i>
                                <span>Milestone status changes and completion updates are authorized and managed by admins.</span>
                            </div>
                        </div>

                        <!-- Handover Coverages Widget -->
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="shield-check" class="w-5 h-5 text-slate-600"></i>
                                    <h4 class="font-bold text-slate-800">Your Handover Coverages</h4>
                                </div>
                                <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">${backupCoverages.length}</span>
                            </div>
                            <div class="flex flex-col divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                                ${backupCoveragesHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Active Deadlines Radar -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col animate-in fade-in duration-300">
                            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                                <i data-lucide="calendar-clock" class="w-5 h-5 text-amber-500"></i>
                                <h4 class="font-bold text-slate-800">Active Deadlines Radar</h4>
                            </div>
                            <div class="flex flex-col divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[500px]">
                                ${deadlineRadarHtml}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Calendar: Repositioned as a full width dashboard section at the bottom -->
                ${getCalendarHtml()}
            `;
        }