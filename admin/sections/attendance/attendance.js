function getAdminAttendanceTemplate() {
      const tab = state.attendanceTab || "logs";

      let tableHeaders = "";
      let tableRows = "";
      let title = "";

      if (tab === "logs") {
        title = "Attendance Logs";
        tableHeaders = `
                    <th class="py-2.5 px-4 w-[20%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Employee</th>
                    <th class="py-2.5 px-4 w-[11%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Date</th>
                    <th class="py-2.5 px-4 w-[11%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Check In</th>
                    <th class="py-2.5 px-4 w-[11%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Check Out</th>
                    <th class="py-2.5 px-4 w-[10%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Total Hrs</th>
                    <th class="py-2.5 px-4 w-[12%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Current Status</th>
                    <th class="py-2.5 px-4 w-[12%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Attendance</th>
                    <th class="py-2.5 px-4 w-[13%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">IP Address</th>
                `;
        const sortedAttendance = [...state.allAttendance].sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );
        if (sortedAttendance.length === 0) {
          tableRows = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-500">No attendance records found</td></tr>`;
        } else {
          tableRows = sortedAttendance
            .map((record) => {
              const emp =
                state.allEmployees.find((e) => e.id === record.employee_id || e.id === record.user_id) ||
                {};
              const empName =
                emp.full_name || emp.username || record.employee_name || record.username || "Employee #" + (record.employee_id || record.user_id || "");
              const dateStr = new Date(record.date).toLocaleDateString();
              const checkInStr = record.check_in_time
                ? new Date(record.check_in_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "--";
              const checkOutStr = record.check_out_time
                ? new Date(record.check_out_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "--";

              let currentStatusBadge = "";
              const currentStatus = record.status || "Absent";
              if (currentStatus === "Checked In" || currentStatus === "Present") {
                currentStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                    Checked In
                  </span>
                `;
              } else if (currentStatus === "Checked Out") {
                currentStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1"></span>
                    Checked Out
                  </span>
                `;
              } else if (currentStatus === "On Leave") {
                currentStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-750 rounded-full text-[10px] font-bold border border-indigo-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-1"></span>
                    On Leave
                  </span>
                `;
              } else if (currentStatus === "Half Day" || currentStatus === "Half-Day") {
                currentStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[10px] font-bold border border-amber-300">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1"></span>
                    Half Day
                  </span>
                `;
              } else {
                currentStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold border border-rose-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1"></span>
                    Absent
                  </span>
                `;
              }

              let attStatusBadge = "";
              let attStatus = record.attendance_status || "Present";
              if (record.status === "Absent" || record.status === "On Leave") {
                attStatus = record.status;
              }
              if (attStatus === "Present") {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-[10px] font-bold border border-teal-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-teal-500 mr-1"></span>
                    Present
                  </span>
                `;
              } else if (attStatus === "Late") {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1"></span>
                    Late
                  </span>
                `;
              } else if (attStatus === "Half-Day") {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-yellow-550/10 text-yellow-750 rounded-full text-[10px] font-bold border border-yellow-250/20">
                    <span class="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1"></span>
                    Half-Day
                  </span>
                `;
              } else if (attStatus === "On Leave") {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1"></span>
                    On Leave
                  </span>
                `;
              } else if (attStatus === "Extended Shift") {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold border border-purple-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-purple-500 mr-1"></span>
                    Extended Shift
                  </span>
                `;
              } else {
                attStatusBadge = `
                  <span class="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold border border-rose-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1"></span>
                    Absent
                  </span>
                `;
              }

              return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs font-bold text-slate-800 truncate" title="${empName}">${empName}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs text-slate-655">${dateStr}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs text-slate-655">
                                    <div class="font-semibold text-slate-700">${checkInStr}</div>
                                    ${record.work_mode && record.work_mode !== 'Office' ? `
                                        <div class="mt-0.5">
                                            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                <i data-lucide="home" class="w-2.5 h-2.5 mr-0.5"></i> ${record.work_mode}
                                            </span>
                                        </div>
                                    ` : record.work_mode === 'Office' ? `
                                        <div class="mt-0.5">
                                            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                <i data-lucide="briefcase" class="w-2.5 h-2.5 mr-0.5"></i> Office
                                            </span>
                                        </div>
                                    ` : ''}
                                </td>
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs text-slate-655">${checkOutStr}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs font-bold text-slate-800">
                                    ${(h => {
                                        if (!h) return "--";
                                        const tm = Math.round(h * 60);
                                        const hrs = Math.floor(tm / 60);
                                        const mins = tm % 60;
                                        return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
                                    })(record.total_hours)}
                                </td>
                                <td class="py-2.5 px-4 whitespace-nowrap">${currentStatusBadge}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap">${attStatusBadge}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap text-xs text-slate-500 font-mono overflow-hidden truncate" title="${record.ip_address || "--"}">${record.ip_address || "--"}</td>
                            </tr>
                        `;
            })
            .join("");
        }
      } else if (tab === "login") {
        title = "Login History";
        tableHeaders = `
                    <th class="py-2.5 px-4 w-[25%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">User</th>
                    <th class="py-2.5 px-4 w-[25%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Date & Time</th>
                    <th class="py-2.5 px-4 w-[15%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left hidden md:table-cell">Role</th>
                    <th class="py-2.5 px-4 w-[15%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left hidden lg:table-cell">IP Address</th>
                    <th class="py-2.5 px-4 w-[20%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Device & Browser</th>
                `;
        const sortedHistory = [...(state.allLoginHistory || [])].sort(
          (a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp),
        );
        if (sortedHistory.length === 0) {
          tableRows = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No login history found</td></tr>`;
        } else {
          tableRows = sortedHistory
            .map((record) => {
              const displayName = record.full_name && record.full_name !== "Unknown" ? record.full_name : (record.username && record.username !== "N/A" ? record.username : record.user_id);
              const handleStr = record.username && record.username !== "N/A" ? `@${record.username}` : `ID: ${record.user_id.substring(0, 8)}...`;
              const initials = displayName[0].toUpperCase();

              // Parse date with native browser local time
              const dt = new Date(record.login_timestamp);
              const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

              // Determine icon based on device type
              const isMobile = (record.device || '').toLowerCase().includes('phone') ||
                (record.device || '').toLowerCase().includes('mobile') ||
                (record.device || '').toLowerCase().includes('android') ||
                (record.device || '').toLowerCase().includes('ios');
              const deviceIcon = isMobile ? 'smartphone' : 'monitor';

              return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                                    <div class="flex items-center truncate">
                                        <div class="h-6 w-6 rounded-full bg-indigo-50 text-brand-primary flex items-center justify-center font-bold mr-2 border border-indigo-100/50 text-[10px] shrink-0">
                                            ${initials}
                                        </div>
                                        <div class="truncate">
                                            <div class="font-bold text-slate-800 text-xs truncate" title="${displayName}">${displayName}</div>
                                            <div class="text-[10px] text-slate-450 font-semibold truncate mt-0.5">${handleStr}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden text-xs text-slate-655">
                                    <div class="font-bold text-slate-700">${dateStr}</div>
                                    <div class="text-[10px] text-slate-450 font-semibold mt-0.5">${timeStr}</div>
                                </td>
                                <td class="py-2.5 px-4 whitespace-nowrap text-xs hidden md:table-cell">
                                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${record.user_role.toLowerCase() === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}">${record.user_role}</span>
                                </td>
                                <td class="py-2.5 px-4 whitespace-nowrap text-xs text-slate-500 font-mono hidden lg:table-cell overflow-hidden truncate" title="${record.ip_address || "--"}">${record.ip_address || "--"}</td>
                                <td class="py-2.5 px-4 whitespace-nowrap text-xs text-slate-655 overflow-hidden">
                                    <div class="flex items-center gap-2 truncate" title="${record.user_agent || ''}">
                                        <div class="p-1 bg-slate-100 rounded-md text-slate-500 shrink-0">
                                            <i data-lucide="${deviceIcon}" class="w-3 h-3"></i>
                                        </div>
                                        <div class="truncate">
                                            <div class="font-bold text-slate-700 truncate">${record.device || 'Unknown Device'}</div>
                                            <div class="text-[10px] text-slate-450 font-semibold truncate mt-0.5">${record.browser || 'Unknown Browser'}</div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
            })
            .join("");
        }
      } else if (tab === "leave") {
        title = "Leave Requests";
        tableHeaders = `
                    <th class="py-2.5 px-4 w-[14%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Employee</th>
                    <th class="py-2.5 px-4 w-[11%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Requested Date</th>
                    <th class="py-2.5 px-4 w-[12%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Type & Days</th>
                    <th class="py-2.5 px-4 w-[10%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Start Date</th>
                    <th class="py-2.5 px-4 w-[10%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">End Date</th>
                    <th class="py-2.5 px-4 w-[15%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Reason</th>
                    <th class="py-2.5 px-4 w-[15%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Handover</th>
                    <th class="py-2.5 px-4 w-[10%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-left">Status</th>
                    <th class="py-2.5 px-4 w-[10%] font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Actions</th>
                `;
        const sortedLeaves = [...(state.allLeaveRequests || [])].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        if (sortedLeaves.length === 0) {
          tableRows = `<tr><td colspan="8" class="px-6 py-8 text-center text-slate-500">No leave requests found</td></tr>`;
        } else {
          tableRows = sortedLeaves
            .map((record) => {
              const emp =
                state.allEmployees.find((e) => e.id === record.employee_id) ||
                {};
              const empName =
                emp.full_name || emp.username || "Unknown Employee";
              const startStr = new Date(
                record.start_date,
              ).toLocaleDateString();
              const endStr = new Date(record.end_date).toLocaleDateString();

              let statusColor = "bg-slate-100 text-slate-700";
              let dotColor = "bg-slate-400";
              if (record.status === "Approved") {
                statusColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                dotColor = "bg-emerald-500";
              }
              if (record.status === "Rejected") {
                statusColor = "bg-rose-50 text-rose-700 border border-rose-200";
                dotColor = "bg-rose-500";
              }
              if (record.status === "Pending") {
                statusColor = "bg-amber-50 text-amber-700 border border-amber-200";
                dotColor = "bg-amber-500 animate-pulse";
              }
              if (record.status === "Cancelled") {
                statusColor = "bg-slate-100 text-slate-600 border border-slate-200";
                dotColor = "bg-slate-400";
              }
              if (record.status === "Cancellation Requested") {
                statusColor = "bg-orange-50 text-orange-850 border border-orange-200";
                dotColor = "bg-orange-500 animate-pulse";
              }

              let statusBadge = `<span class="inline-flex items-center px-2 py-0.5 ${statusColor} rounded-full text-[10px] font-bold"><span class="w-1 h-1 mr-1 ${dotColor} rounded-full"></span>${record.status}</span>`;

              let actionsHtml = "";
              if (record.status === "Pending") {
                actionsHtml = `
                                <div class="flex justify-end gap-1.5">
                                    <button onclick="updateLeaveStatus('${record.id}', 'Approved')" class="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded transition-colors border border-emerald-250" title="Approve">
                                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="updateLeaveStatus('${record.id}', 'Rejected')" class="p-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded transition-colors border border-rose-250" title="Reject">
                                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            `;
              } else if (record.status === "Cancellation Requested") {
                actionsHtml = `
                                <div class="flex justify-end gap-1.5">
                                    <button onclick="updateLeaveStatus('${record.id}', 'Cancelled')" class="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded transition-colors border border-emerald-250" title="Approve Cancellation">
                                        <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="updateLeaveStatus('${record.id}', 'Approved')" class="p-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded transition-colors border border-rose-250" title="Reject Cancellation">
                                        <i data-lucide="x-square" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            `;
              } else {
                actionsHtml = `<div class="text-right text-[10px] text-slate-450 italic font-semibold">Resolved</div>`;
              }

              // Backup employee lookup
              let backupName = 'N/A';
              if (record.backup_employee_id && record.backup_employee_id !== 'N/A') {
                const backupEmp = (state.allEmployees || []).find(e => e.id === record.backup_employee_id);
                backupName = backupEmp ? backupEmp.full_name : record.backup_employee_id;
              }
              const handoverHtml = `
                <div class="text-[10px] text-slate-600">
                    <div class="truncate font-semibold text-slate-700" title="Backup: ${backupName}">Backup: ${backupName}</div>
                    <div class="text-[9px] text-slate-400 truncate" title="Work: ${record.pending_work_summary || 'N/A'}">Work: ${record.pending_work_summary || 'N/A'}</div>
                </div>
              `;

              const reqDateStr = record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A';

              return `
                            <tr onclick="window.showLeaveDetailsModal('${record.id}')" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer text-xs">
                                <td class="py-2.5 px-4 font-semibold text-slate-800 max-w-[120px] truncate" title="${empName}">${empName}</td>
                                <td class="py-2.5 px-4 font-medium text-slate-650">${reqDateStr}</td>
                                <td class="py-2.5 px-4 text-slate-655">
                                    <div class="font-bold text-slate-800">${record.leave_type || 'Paid Leave'}</div>
                                    <div class="text-[10px] text-slate-500">${record.total_days || 1.0} day(s) (${record.half_day_option || 'Full Day'})</div>
                                </td>
                                <td class="py-2.5 px-4 text-slate-655 font-medium">${startStr}</td>
                                <td class="py-2.5 px-4 text-slate-655 font-medium">${endStr}</td>
                                <td class="py-2.5 px-4 text-slate-655 truncate max-w-[120px]" title="${record.reason}">${record.reason}</td>
                                <td class="py-2.5 px-4 max-w-[140px] truncate">${handoverHtml}</td>
                                <td class="py-2.5 px-4">${statusBadge}</td>
                                <td class="py-2.5 px-4 font-medium" onclick="event.stopPropagation()">${actionsHtml}</td>
                            </tr>
                        `;
            })
            .join("");
        }
      }

      // Calculate and render security metrics cards
      let loginCardsHtml = "";
      if (tab === "login") {
        const sortedHistory = state.allLoginHistory || [];
        const totalLogins = sortedHistory.length;
        const uniqueDevices = new Set(sortedHistory.map(r => `${r.device || 'Unknown'}-${r.browser || 'Unknown'}`)).size;
        const adminLogins = sortedHistory.filter(r => (r.user_role || '').toLowerCase() === 'admin').length;

        loginCardsHtml = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <!-- Total Events -->
                <div class="bg-gradient-to-br from-indigo-500/10 via-white to-white p-5 rounded-2xl border border-indigo-100/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div class="p-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 shrink-0 animate-pulse">
                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Total Auth Events</div>
                        <div class="text-xl font-black text-slate-800 mt-0.5">${totalLogins}</div>
                        <div class="text-[9px] text-slate-400 font-medium">Logged system-wide access logs</div>
                    </div>
                </div>
                <!-- Unique Devices -->
                <div class="bg-gradient-to-br from-amber-500/10 via-white to-white p-5 rounded-2xl border border-amber-100/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div class="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
                        <i data-lucide="smartphone" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Unique Devices</div>
                        <div class="text-xl font-black text-slate-800 mt-0.5">${uniqueDevices}</div>
                        <div class="text-[9px] text-slate-400 font-medium">Distinct browser-device setups</div>
                    </div>
                </div>
                <!-- Active Admin access -->
                <div class="bg-gradient-to-br from-rose-500/10 via-white to-white p-5 rounded-2xl border border-rose-100/50 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div class="p-3 bg-rose-50 text-rose-600 rounded-xl shadow-lg shadow-rose-500/15 shrink-0 border border-rose-100">
                        <i data-lucide="user-check" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-[9px] font-black text-rose-700 uppercase tracking-widest">Admin Control Logins</div>
                        <div class="text-xl font-black text-slate-800 mt-0.5">${adminLogins}</div>
                        <div class="text-[9px] text-slate-400 font-medium">High-privilege admin activities</div>
                    </div>
                </div>
            </div>
          `;
      }

      return `
                <div class="space-y-6 fade-in">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                        <div>
                            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <i data-lucide="calendar-clock" class="w-6 h-6 text-brand-primary"></i> Attendance Tracking
                            </h3>
                            <p class="text-slate-500 mt-1">Manage attendance, leave requests, and login histories.</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button onclick="loadAdminWorkspaceData().then(() => routeApp('attendance'))" class="btn-secondary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh
                            </button>
                            <button onclick="exportActiveTableToCSV()" class="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shadow-brand">
                                <i data-lucide="download" class="w-4 h-4"></i> Export Report
                            </button>
                        </div>
                    </div>

                    <!-- Toggle Section -->
                    <div class="flex items-center gap-2 p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl inline-flex shadow-inner">
                        <button onclick="switchAttendanceTab('logs')" class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "logs" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}">
                            Attendance Logs
                        </button>
                        <button onclick="switchAttendanceTab('login')" class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "login" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}">
                            Login History
                        </button>
                        <button onclick="switchAttendanceTab('leave')" class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "leave" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}">
                            Leave Requests
                        </button>
                    </div>

                    ${loginCardsHtml}

                    <div class="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden" id="attendanceDataBlock">
                        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h4 class="font-bold text-slate-800 text-sm">${title}</h4>
                            <div class="flex items-center gap-2">
                                ${tab === 'leave' ? `
                                    <button onclick="window.openManageHolidaysModal()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-brand-primary border border-indigo-200/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i> Manage Holidays
                                    </button>
                                ` : ''}
                                ${tab === 'logs' ? `
                                    <button onclick="window.openChangeWorkingHoursModal()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-brand-primary border border-indigo-200/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i> Change Working Hours
                                    </button>
                                ` : ''}
                                <div class="flex items-center gap-2 ml-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">Range:</span>
                                    <input type="date" id="attendanceStartDate" class="form-input text-xs px-2 py-1 h-7 rounded w-[110px] border-slate-200 bg-slate-50" title="Start Date">
                                    <span class="text-xs text-slate-400 font-medium">to</span>
                                    <input type="date" id="attendanceEndDate" class="form-input text-xs px-2 py-1 h-7 rounded w-[110px] border-slate-200 bg-slate-50" title="End Date">
                                    <button onclick="fetchCustomAttendanceData()" class="px-3 py-1 h-7 bg-brand-primary text-white text-xs font-semibold rounded shadow-sm hover:bg-brand-secondary transition-colors">Fetch</button>
                                </div>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200">
                                        ${tableHeaders}
                                    </tr>
                                </thead>
                                <tbody id="attendanceDataBody">
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
    }