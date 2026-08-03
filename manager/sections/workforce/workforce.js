function getAdminWorkforceTemplate() {
      if (state.activeEmployee) {
        return getEmployeeDetailsTemplate();
      }

      // Robust fallback if state gets corrupted with 'undefined' or 'null' strings
      if (!["employees", "roles"].includes(state.workforceTab)) {
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

              return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group emp-row-item" onclick="openEmployeeDetails('${e.id}')">
                        <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                            <div class="flex items-center truncate">
                                <div class="h-6.5 w-6.5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 transition-colors group-hover:bg-indigo-50 group-hover:text-brand-primary">
                                    ${getInitials(e.full_name)}
                                </div>
                                <div class="truncate">
                                    <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-brand-primary transition-colors truncate" title="${e.full_name !== "N/A" ? e.full_name : "Unnamed User"}">
                                        <span class="truncate">${e.full_name !== "N/A" ? e.full_name : "Unnamed User"}</span>
                                        ${e.profile_edit_requested ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 animate-pulse border border-amber-200 shrink-0">Unlock Requested</span>' : ''}
                                        <i data-lucide="external-link" class="w-3 h-3 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
                                    </div>
                                    <div class="text-[10px] text-slate-450 font-semibold truncate">@${e.username && e.username !== "N/A" ? e.username : "no_user"}</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                            <div class="text-xs text-slate-800 font-bold truncate" title="${title}">${title}</div>
                            <div class="text-[10px] text-slate-450 font-semibold truncate mt-0.5" title="${dept}">${dept}</div>
                        </td>
                        <td class="py-2.5 px-4 whitespace-nowrap"><span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${e.is_active !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">${e.is_active !== false ? "Active" : "Disabled"}</span></td>
                    </tr>
                `;
            })
            .join("") ||
          `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-500">No employees found.</td></tr>`;

        tabContent = `
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-4 w-[45%]">Employee</th>
                                <th class="py-2.5 px-4 w-[40%]">Job Role & Dept</th>
                                <th class="py-2.5 px-4 w-[15%]">Status</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-100" id="emp_tbody">
                            ${rows}
                        </tbody>
                    </table>
                `;
      } else if (state.workforceTab === "roles") {
        const rows = state.allRoles
          .map(
            (r) =>
              `<tr class="border-b border-slate-100 last:border-0 role-row-item"><td class="py-2.5 px-4 text-xs font-bold text-slate-800">${r.department_name}</td><td class="py-2.5 px-4 text-xs text-slate-655">${r.role_name}</td></tr>`,
          )
          .join("");
        tabContent = `
                    <table class="w-full text-left table-fixed border-collapse">
                        <thead class="bg-slate-50/50 border-b border-slate-200">
                            <tr class="text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th class="py-2.5 px-4 w-[45%]">Department</th>
                                <th class="py-2.5 px-4 w-[55%]">Role Definition</th>
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
                        <p class="text-slate-500 mt-1">Manage personnel, access tiers, and performance.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="openCreateEmployeeModal()" class="${state.workforceTab === "employees" ? "inline-flex" : "hidden"} bg-brand-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors items-center gap-2 font-medium whitespace-nowrap">
                            <i data-lucide="user-plus" class="w-4 h-4"></i> Add Record
                        </button>
                        <button onclick="openCreateRoleModal()" class="${state.workforceTab === "roles" ? "inline-flex" : "hidden"} bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors items-center gap-2 font-medium whitespace-nowrap">
                            <i data-lucide="briefcase" class="w-4 h-4"></i> Add Role
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="border-b border-slate-200 flex p-2 gap-2 bg-slate-50 overflow-x-auto">
                        <button onclick="routeApp('workforce', 'employees')" class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${state.workforceTab === "employees" ? "bg-white text-brand-primary shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}">Employees</button>
                        <button onclick="routeApp('workforce', 'roles')" class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${state.workforceTab === "roles" ? "bg-white text-brand-primary shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}">Departments & Roles</button>
                    </div>

                    ${state.workforceTab === "employees"
          ? `
                    <div class="p-4 border-b border-slate-100 bg-white">
                        <div class="relative max-w-sm">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input type="text" id="adminEmpSearch" value="${state.empSearchTerm || ""}" oninput="handleAdminEmpSearchDOM(this.value)" placeholder="Search employees..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all">
                        </div>
                    </div>`
          : ""
        }

                    ${state.workforceTab === "roles"
          ? `
                    <div class="p-4 border-b border-slate-100 bg-white flex justify-between items-center flex-wrap gap-4">
                        <div class="relative max-w-sm flex-1">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input type="text" id="adminRoleSearch" oninput="handleAdminRoleSearchDOM(this.value)" placeholder="Search departments or roles..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all">
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

function getEmployeeDetailsTemplate() {
      const emp = state.activeEmployee;
      if (!emp) return "";

      const activeTab = state.activeEmployeeTab || "overview";

      const tabs = [
        { id: "overview", icon: "user", label: "Overview" },
        { id: "contact", icon: "mail", label: "Contact & Personal" },
        { id: "financials", icon: "banknote", label: "Compliance & Docs" },
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
                <button onclick="switchEmployeeTab('${t.id}')" class="px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${state.activeEmployeeTab === t.id ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-350"}">
                    <i data-lucide="${t.icon}" class="w-3.5 h-3.5"></i> ${t.label}
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

      return `
                <div class="mb-4 p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-md">
                    <div class="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <button onclick="closeEmployeeDetails()" class="w-9 h-9 bg-white border border-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group">
                                <i data-lucide="arrow-left" class="w-4 h-4 text-slate-400 group-hover:text-brand-primary transition-colors"></i>
                            </button>

                            <div class="relative group">
                                <div class="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-slate-200 flex items-center justify-center font-black text-slate-450 text-xl">
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
                                ${state.isEditingEmployee
          ? `
                                    <div class="absolute -bottom-1 -right-1">
                                        <button onclick="document.getElementById('up_profile_${emp.id}').click()" class="w-6 h-6 bg-brand-primary text-white rounded-lg shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                                            <i data-lucide="camera" class="w-3 h-3"></i>
                                        </button>
                                        <input type="file" id="up_profile_${emp.id}" class="hidden" accept="image/*" onchange="uploadEmployeeImage('${emp.id}', 'profile', 'profile', this.id)">
                                    </div>
                                `
          : ""
        }
                            </div>

                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-xl font-black text-slate-900 tracking-tight">${emp.full_name}</h2>
                                    <div class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${emp.is_active !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}">
                                        ${emp.is_active !== false ? "• Online System" : "• Restricted Access"}
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <p class="text-xs font-bold text-brand-primary bg-indigo-50 px-1.5 py-0.2 rounded whitespace-nowrap">${title}</p>
                                    <div class="h-1 w-1 bg-slate-300 rounded-full"></div>
                                    <p class="text-xs font-medium text-slate-500 whitespace-nowrap">${dept}</p>
                                    <div class="h-1 w-1 bg-slate-300 rounded-full"></div>
                                    <p class="text-xs font-mono text-slate-400 whitespace-nowrap">@${emp.username}</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100 flex-shrink-0 flex-wrap">
                            ${emp.profile_edit_requested
                              ? `
                              <button onclick="approveEmployeeUnlock('${emp.id}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-md shadow-amber-250 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap">
                                  <i data-lucide="unlock" class="w-3.5 h-3.5"></i> Approve
                              </button>
                              <button onclick="denyEmployeeUnlock('${emp.id}')" class="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-250 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap">
                                  <i data-lucide="lock" class="w-3.5 h-3.5"></i> Deny
                              </button>
                              <div class="w-px h-6 bg-slate-200 mx-0.5"></div>
                              `
                              : ""
                            }
                            ${state.user && state.user.access_level === 'SystemAdmin' ? `
                            <button onclick="deleteEmployeeAccount('${emp.id}', '${emp.full_name}')" class="px-3 py-1.5 bg-rose-55 text-rose-650 text-xs font-bold rounded-lg shadow-sm hover:bg-rose-100 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap" title="Delete Operative">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <div class="w-px h-6 bg-slate-200 mx-0.5"></div>
                            ` : ''}
                            <button onclick="toggleEmployeeStatusFromPage('${emp.id}')" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap">
                                <i data-lucide="power" class="w-3.5 h-3.5 ${emp.is_active !== false ? "text-rose-500" : "text-emerald-500"}"></i>
                                ${emp.is_active !== false ? "Deactivate" : "Activate"}
                            </button>
                            <div class="w-px h-6 bg-slate-200 mx-0.5"></div>
                            <button id="btnEmployeeEdit" onclick="toggleEmployeeEditMode(true)" class="${state.isEditingEmployee ? "hidden" : "flex"} px-4 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-150 hover:bg-indigo-700 active:scale-95 transition-all items-center gap-1 whitespace-nowrap">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Modify
                            </button>
                            <button id="btnEmployeeSave" onclick="saveEmployeeEdits()" class="${state.isEditingEmployee ? "flex" : "hidden"} px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-150 hover:bg-emerald-700 active:scale-95 transition-all items-center gap-1 whitespace-nowrap">
                                <i data-lucide="save" class="w-3.5 h-3.5"></i> Save
                            </button>
                            <button id="btnEmployeeCancel" onclick="toggleEmployeeEditMode(false)" class="${state.isEditingEmployee ? "flex" : "hidden"} px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg active:scale-95 transition-all items-center gap-1 whitespace-nowrap">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                    <div class="px-4 border-b border-slate-100 bg-white flex space-x-2 overflow-x-auto">
                        ${tabsHtml}
                    </div>
                    <div class="p-4 flex-1 bg-white">
                        ${contentHtml}
                    </div>
                </div>
            `;
}