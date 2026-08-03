function getEmployeeDetailsTemplate() {
      const emp = state.activeEmployee;
      if (!emp) return "";

      const activeTab = state.activeEmployeeTab || "overview";

      const tabs = [
        { id: "overview", icon: "user", label: "Overview" },
        { id: "contact", icon: "mail", label: "Contact & Personal" },
        { id: "financials", icon: "dollar-sign", label: "Financials & Docs" },
        { id: "projects", icon: "folder-kanban", label: "Assigned Projects" },
        {
          id: "analytics",
          icon: "bar-chart-3",
          label: "Performance Analytics",
        },
      ];

      const tabsHtml = tabs
        .map(
          (t) => `
                <button onclick="switchEmployeeTab('${t.id}')" class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${state.activeEmployeeTab === t.id ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}">
                    <i data-lucide="${t.icon}" class="w-4 h-4"></i> ${t.label}
                </button>
            `,
        )
        .join("");

      const contentHtml = `
                <div id="employee-tab-overview" class="${activeTab === "overview" ? "" : "hidden"}">
                    ${getEmployeeOverviewTab(emp)}
                </div>
                <div id="employee-tab-contact" class="${activeTab === "contact" ? "" : "hidden"}">
                    ${getEmployeeContactTab(emp)}
                </div>
                <div id="employee-tab-financials" class="${activeTab === "financials" ? "" : "hidden"}">
                    ${getEmployeeFinancialsTab(emp)}
                </div>
                <div id="employee-tab-projects" class="${activeTab === "projects" ? "" : "hidden"}">
                    ${getEmployeeProjectsTab(emp)}
                </div>
                <div id="employee-tab-analytics" class="${activeTab === "analytics" ? "" : "hidden"}">
                    ${getEmployeeAnalyticsTab(emp)}
                </div>
            `;

      const roleObj = state.allRoles.find((r) => r.id === emp.role_id);
      const dept = roleObj
        ? roleObj.department_name
        : emp.department || "General";
      const title = roleObj ? roleObj.role_name : emp.job_title || "Employee";

      const getLocationStr = (addr) => {
        if (!addr || addr === "N/A") return "Location Not Specified";
        const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
        }
        return addr;
      };

      const formatJoinedDate = (doj) => {
        if (!doj || doj === "N/A") return "Date Not Specified";
        try {
          const d = new Date(doj);
          if (isNaN(d.getTime())) return `Joined on ${doj}`;
          return `Joined on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
        } catch (e) {
          return `Joined on ${doj}`;
        }
      };

      return `
                <div class="space-y-4 max-w-full">
                    <!-- Top Breadcrumb & Actions Bar -->
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5">
                            <button onclick="closeEmployeeDetails()" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 group cursor-pointer" title="Back to Workforce List">
                                <i data-lucide="arrow-left" class="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform"></i>
                                Back to Employees
                            </button>
                            <div class="h-4 w-px bg-slate-200"></div>
                            <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                <span>Workforce</span>
                                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span class="font-bold text-slate-900 truncate max-w-[200px]">${emp.full_name}</span>
                            </div>
                        </div>

                        <!-- Top Action Toolbar Section -->
                        <div class="flex items-center gap-2">
                            ${emp.profile_edit_requested
                              ? `
                                <div class="flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-1 rounded-lg">
                                    <span class="text-[9px] font-bold text-amber-800 uppercase tracking-wider px-2 py-0.5 bg-amber-100 rounded-md flex items-center gap-1">
                                        <i data-lucide="shield-alert" class="w-3 h-3 text-amber-600"></i> Edit Request
                                    </span>
                                    <button onclick="approveEmployeeUnlock('${emp.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1">
                                        <i data-lucide="check" class="w-3 h-3"></i> Approve
                                    </button>
                                    <button onclick="denyEmployeeUnlock('${emp.id}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1">
                                        <i data-lucide="x" class="w-3 h-3"></i> Deny
                                    </button>
                                </div>
                              `
                              : ""
                            }
                            
                            ${state.user && state.user.access_level === 'SystemAdmin'
                              ? `
                                <button onclick="deleteEmployeeAccount('${emp.id}', '${emp.full_name}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/80 transition-all flex items-center justify-center shrink-0" title="Delete Operative">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 
                                </button>
                              `
                              : ""
                            }

                            <button onclick="toggleEmployeeStatusFromPage('${emp.id}')" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
                                <i data-lucide="power" class="w-3.5 h-3.5 ${emp.is_active !== false ? "text-rose-500" : "text-emerald-500"}"></i> 
                                ${emp.is_active !== false ? "Deactivate" : "Activate"}
                            </button>

                            ${state.isEditingEmployee
                              ? `
                                <button id="btnEmployeeSave" onclick="saveEmployeeEdits()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap">
                                    <i data-lucide="save" class="w-3.5 h-3.5"></i> Push Changes
                                </button>
                                <button onclick="toggleEmployeeEditMode(false)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap">
                                    <i data-lucide="x" class="w-3.5 h-3.5"></i> Cancel
                                </button>
                              `
                              : `
                                <button id="btnEmployeeEdit" onclick="toggleEmployeeEditMode(true)" class="px-4 py-1.5 bg-brand-primary hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Profile
                                </button>
                              `
                            }
                        </div>
                    </div>

                    <!-- Operative Hero Card (Matching Image 3) -->
                    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="relative shrink-0">
                                <div class="h-14 w-14 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-indigo-50 text-brand-primary flex items-center justify-center font-extrabold text-lg">
                                    ${emp.photo && emp.photo !== "N/A"
                                      ? `<img src="${emp.photo.startsWith("http") ? emp.photo : CONFIG.API_BASE_URL + "/" + emp.photo.replace(/\\/g, "/")}" class="w-full h-full object-cover">`
                                      : (emp.full_name || "U")
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .substring(0, 2)
                                        .toUpperCase()
                                    }
                                </div>
                                <span class="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${emp.is_active !== false ? "bg-emerald-400" : "bg-rose-400"}"></span>
                                    <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${emp.is_active !== false ? "bg-emerald-500" : "bg-rose-500"} border-2 border-white"></span>
                                </span>
                                ${state.isEditingEmployee
                                  ? `
                                    <div class="absolute -bottom-1 -right-1 flex gap-0.5">
                                        <button onclick="document.getElementById('up_profile_${emp.id}').click()" class="w-6 h-6 bg-brand-primary text-white rounded-md shadow-sm flex items-center justify-center hover:scale-105 transition-all" title="Upload Photo">
                                            <i data-lucide="camera" class="w-3 h-3"></i>
                                        </button>
                                        <input type="file" id="up_profile_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'profile', 'profile', this.id)">
                                    </div>
                                  `
                                  : ""
                                }
                            </div>

                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <h2 class="text-lg font-extrabold text-slate-900 tracking-tight truncate">${emp.full_name}</h2>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${emp.is_active !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" : "bg-rose-50 text-rose-700 border border-rose-200/80"}">
                                        <span class="w-1.5 h-1.5 rounded-full ${emp.is_active !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}"></span>
                                        ${emp.is_active !== false ? "Active Operative" : "Deactivated"}
                                    </span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                    <span class="inline-flex items-center gap-1 text-brand-primary bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold">
                                        <i data-lucide="briefcase" class="w-3 h-3 text-brand-primary"></i> ${title}
                                    </span>
                                    <span class="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                        <i data-lucide="building" class="w-3 h-3 text-slate-400"></i> ${dept}
                                    </span>
                                    <span class="inline-flex items-center gap-1 text-slate-500 font-mono text-xs">
                                        <i data-lucide="mail" class="w-3 h-3 text-slate-400"></i> ${emp.email && emp.email !== "N/A" ? emp.email : "@" + emp.username}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Right Quick Info Column (Accurate Metadata Matching Image 3) -->
                        <div class="flex flex-col sm:flex-row md:flex-col gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 pl-0 md:pl-5 text-xs text-slate-600 font-medium shrink-0">
                            <div class="flex items-center gap-2">
                                <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span>${emp.contact_number && emp.contact_number !== "N/A" ? emp.contact_number : "No Phone Specified"}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span>${getLocationStr(emp.address)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
                                <span>${formatJoinedDate(emp.date_of_joining)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Integrated Navigation Tabs Bar Container -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
                        <div class="px-4 bg-slate-50/70 border-b border-slate-200 flex space-x-1 overflow-x-auto">
                            ${tabsHtml}
                        </div>
                        <div class="p-4 bg-white">
                            ${contentHtml}
                        </div>
                    </div>
                </div>
            `;
    }


function getAdminWorkforceTemplate() {
      if (state.activeEmployee) {
        return getEmployeeDetailsTemplate();
      }

      // Robust fallback if state gets corrupted with 'undefined' or 'null' strings
      if (!["employees", "admins", "roles"].includes(state.workforceTab)) {
        state.workforceTab = "employees";
      }

      let tabContent = "";

      if (state.workforceTab === "employees") {
        const getInitials = (name) =>
          name && name !== "N/A"
            ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
            : "U";

        let filteredEmployees = state.allEmployees;
        if (state.empSearchTerm) {
          const st = state.empSearchTerm.toLowerCase();
          filteredEmployees = filteredEmployees.filter((e) => {
            const roleObj = state.allRoles.find((r) => r.id === e.role_id);
            const matchDept =
              (roleObj ? roleObj.department_name : e.department) || "";
            const matchRole =
              (roleObj ? roleObj.role_name : e.job_title) || "";
            return (
              (e.full_name && e.full_name.toLowerCase().includes(st)) ||
              (e.username && e.username.toLowerCase().includes(st)) ||
              (e.email && e.email.toLowerCase().includes(st)) ||
              matchDept.toLowerCase().includes(st) ||
              matchRole.toLowerCase().includes(st)
            );
          });
        }

        const rows =
          filteredEmployees
            .map((e) => {
              const roleObj = state.allRoles.find((r) => r.id === e.role_id);
              const dept = roleObj
                ? roleObj.department_name
                : e.department && e.department !== "N/A"
                  ? e.department
                  : "General";
              const title = roleObj
                ? roleObj.role_name
                : e.job_title && e.job_title !== "N/A"
                  ? e.job_title
                  : e.role_id
                    ? "Assigned Role"
                    : "Employee";

              const empIdentifier = String(e.id || e.username || e.email || '').replace(/'/g, "\\'");
              return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group emp-row-item" onclick="openEmployeeDetails('${empIdentifier}')">
                        <td class="py-2 px-3 whitespace-nowrap overflow-hidden">
                            <div class="flex items-center truncate">
                                <div class="h-6.5 w-6.5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 transition-colors group-hover:bg-indigo-50 group-hover:text-brand-primary">
                                    ${getInitials(e.full_name)}
                                </div>
                                <div class="truncate">
                                    <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-brand-primary transition-colors truncate" title="${e.full_name !== "N/A" ? e.full_name : "Unnamed User"}">
                                        <span class="truncate">${e.full_name !== "N/A" ? e.full_name : "Unnamed User"}</span>
                                        ${e.profile_edit_requested ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 animate-pulse border border-amber-200 shrink-0">Unlock Requested</span>' : ''}
                                        <i data-lucide="external-link" class="w-3.5 h-3.5 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
                                    </div>
                                    <div class="text-[10px] text-slate-450 font-semibold truncate">@${e.username && e.username !== "N/A" ? e.username : "no_user"}</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2 px-3 whitespace-nowrap overflow-hidden">
                            <div class="text-xs text-slate-800 font-bold truncate" title="${title}">${title}</div>
                            <div class="text-[10px] text-slate-450 font-semibold truncate mt-0.5" title="${dept}">${dept}</div>
                        </td>
                        <td class="py-2 px-3 whitespace-nowrap text-xs font-bold text-slate-800">${formatCurrency(e.hourly_cost_rate)}<span class="text-[9px] text-slate-400 font-normal">/hr</span></td>
                        <td class="py-2 px-3 whitespace-nowrap text-xs font-bold text-brand-accent">${formatCurrency(e.hourly_billing_rate)}<span class="text-[9px] text-slate-400 font-normal">/hr</span></td>
                        <td class="py-2 px-3 whitespace-nowrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${e.is_active !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">
                                <span class="w-1 h-1 mr-1 rounded-full ${e.is_active !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}"></span>
                                ${e.is_active !== false ? "Active" : "Disabled"}
                            </span>
                        </td>
                        <td class="py-2 px-3 whitespace-nowrap text-right">
                            <button onclick="event.stopPropagation(); confirmDeleteEmployee('${e.id}')" class="text-slate-400 hover:text-brand-alert p-1 bg-white border border-slate-200 rounded shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </td>
                    </tr>
                `;
            })
            .join("") ||
          `<tr><td colspan="6" class="px-3 py-6 text-center text-slate-500 text-xs">No employees found.</td></tr>`;

        tabContent = `
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-3 w-[32%]">Employee</th>
                                <th class="py-2.5 px-3 w-[26%]">Job Role & Dept</th>
                                <th class="py-2.5 px-3 w-[13%]">Cost Rate</th>
                                <th class="py-2.5 px-3 w-[13%]">Billing Rate</th>
                                <th class="py-2.5 px-3 w-[10%]">Status</th>
                                <th class="py-2.5 px-3 w-[6%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-100" id="emp_tbody">
                            ${rows}
                        </tbody>
                    </table>
                `;
      } else if (state.workforceTab === "admins") {
        const rows =
          state.allAdmins
            .map(
              (a) => `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group" onclick="openAdminDrawer('${a.id}')">
                        <td class="py-2 px-3 whitespace-nowrap overflow-hidden truncate">
                            <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-brand-primary transition-colors">
                                @${a.username}
                                <i data-lucide="external-link" class="w-3 h-3 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"></i>
                            </div>
                        </td>
                        <td class="py-2 px-3 whitespace-nowrap text-xs text-slate-655 overflow-hidden truncate" title="${a.email}">${a.email}</td>
                        <td class="py-2 px-3 whitespace-nowrap">
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-900 text-white border border-slate-800">${a.access_level}</span>
                        </td>
                    </tr>
                `,
            )
            .join("") ||
          `<tr><td colspan="3" class="px-3 py-6 text-center text-slate-500 text-xs">No admins found.</td></tr>`;

        tabContent = `
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-3 w-[40%]">Username</th>
                                <th class="py-2.5 px-3 w-[40%]">Email</th>
                                <th class="py-2.5 px-3 w-[20%]">Access Level</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-100">
                            ${rows}
                        </tbody>
                    </table>
                `;
      } else if (state.workforceTab === "roles") {
        const rows = state.allRoles
          .map(
            (r) => `
              <tr class="border-b border-slate-100 last:border-0 role-row-item">
                  <td class="py-2 px-3 text-xs font-bold text-slate-800 overflow-hidden truncate" title="${r.department_name}">${r.department_name}</td>
                  <td class="py-2 px-3 text-xs text-slate-655 overflow-hidden truncate" title="${r.role_name}">${r.role_name}</td>
              </tr>
            `,
          )
          .join("");
        tabContent = `
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-3 w-[45%]">Department</th>
                                <th class="py-2.5 px-3 w-[55%]">Role Definition</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-100" id="roles_tbody">
                            ${rows}
                        </tbody>
                    </table>
                `;
      }

      return `
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Workforce Directory</h3>
                        <p class="text-slate-500 mt-1">Manage personnel, access tiers, and financial profiles.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="openCreateEmployeeModal()" class="${state.workforceTab === "employees" ? "inline-flex" : "hidden"} bg-brand-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors items-center gap-2 font-medium whitespace-nowrap">
                            <i data-lucide="user-plus" class="w-4 h-4"></i> Add Record
                        </button>
                        <button onclick="openCreateAdminModal()" class="${state.workforceTab === "admins" ? "inline-flex" : "hidden"} bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg shadow-sm transition-colors items-center gap-2 font-medium whitespace-nowrap">
                            <i data-lucide="shield" class="w-4 h-4"></i> Add Admin
                        </button>
                        <button onclick="openCreateRoleModal()" class="${state.workforceTab === "roles" ? "inline-flex" : "hidden"} bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors items-center gap-2 font-medium whitespace-nowrap">
                            <i data-lucide="briefcase" class="w-4 h-4"></i> Add Role
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="border-b border-slate-200 flex p-2 gap-2 bg-slate-50 overflow-x-auto">
                        <button onclick="routeApp('workforce', 'employees')" class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${state.workforceTab === "employees" ? "bg-white text-brand-primary shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}">Employees</button>
                        <button onclick="routeApp('workforce', 'admins')" class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${state.workforceTab === "admins" ? "bg-white text-brand-primary shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}">System Admins</button>
                        <button onclick="routeApp('workforce', 'roles')" class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${state.workforceTab === "roles" ? "bg-white text-brand-primary shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}">Departments & Roles</button>
                    </div>
                    
                    ${state.workforceTab === "employees"
          ? `
                    <div class="p-4 border-b border-slate-100 bg-white">
                        <div class="relative max-w-sm">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true"></i>
                            <input type="text" id="adminEmpSearch" value="${state.empSearchTerm || ""}" oninput="handleAdminEmpSearchDOM(this.value)" placeholder="Search employees…" class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors">
                        </div>
                    </div>`
          : ""
        }

                    ${state.workforceTab === "roles"
          ? `
                    <div class="p-4 border-b border-slate-100 bg-white flex justify-between items-center flex-wrap gap-4">
                        <div class="relative max-w-sm flex-1">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true"></i>
                            <input type="text" id="adminRoleSearch" oninput="handleAdminRoleSearchDOM(this.value)" placeholder="Search departments or roles…" class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors">
                        </div>
                    </div>`
          : ""
        }

                    <div class="overflow-x-auto">
                        ${tabContent}
                    </div>
                </div>
            `;
    }


