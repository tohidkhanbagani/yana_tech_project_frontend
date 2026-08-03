function getAdminClientsTemplate() {
      if (state.activeClient) {
        return getClientDetailsTemplate();
      }
      return getClientListTemplate();
    }


function getClientListTemplate() {
      let tbody = "";
      const clients = Array.isArray(state.allClients) ? state.allClients : [];
      if (clients.length === 0) {
        tbody =
          '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No clients found.</td></tr>';
      } else {
        tbody = clients
          .map((client) => {
            // Optimized extraction: Check for direct ID link OR fallback to name-matching
            const clientProjects = state.allProjects.filter(
              (p) => p.id === client.project_id || p.client === client.name,
            );
            const totalProjects = clientProjects.length;
            const activeProjects = clientProjects.filter(
              (p) => p.status === "In Progress" || p.status === "Active",
            ).length;

            return `
                    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer group" onclick="openClientDetails('${client.id}')">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors">${client.name}</div>
                            <div class="text-xs text-slate-500">${client.company !== "N/A" ? client.company : "--"}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center text-sm text-slate-600"><i data-lucide="mail" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i> ${client.email || "--"}</div>
                            <div class="flex items-center text-xs text-slate-500 mt-1"><i data-lucide="phone" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i> ${client.phone !== "N/A" ? client.phone : "--"}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                                ${totalProjects} Projects
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeProjects > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}">
                                ${activeProjects} Active
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button class="text-brand-600 hover:text-brand-900 transition-colors p-1 hover:bg-brand-50 rounded"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
                        </td>
                    </tr>
                    `;
          })
          .join("");
      }

      return `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-900 tracking-tight">Client Tracking</h3>
                        <p class="text-sm text-slate-500 mt-1">Manage client relationships and monitor project portfolios.</p>
                    </div>
                    <button onclick="openClientCreateModal()" class="inline-flex items-center px-4 py-2 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        <i data-lucide="plus" class="w-4 h-4 mr-2"></i> New Client
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-left border-collapse">
                            <thead class="bg-white border-b border-slate-200">
                                <tr>
                                    <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                                    <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Info</th>
                                    <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Projects</th>
                                    <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</th>
                                    <th class="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
                                ${tbody}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    }






function getClientDetailsTemplate() {
      const client = state.activeClient;
      if (!client) return "";

      const clientProjects = state.allProjects.filter(
        (p) => p.id === client.project_id || p.client === client.name,
      );
      const activeProjectsCount = clientProjects.filter(
        (p) => p.status === "In Progress" || p.status === "Active",
      ).length;

      // Tab Navigation Builder (Matching Project Style)
      const tabs = [
        { id: "overview", icon: "folder-kanban", label: "Project Portfolio" },
        { id: "details", icon: "info", label: "Profile Information" },
      ];

      const tabsHtml = tabs
        .map(
          (t) => `
                <button type="button" onclick="switchClientTab('${t.id}')" class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${state.activeClientTab === t.id ? "border-brand-primary text-brand-primary" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}">
                    <i data-lucide="${t.icon}" class="w-4 h-4" aria-hidden="true"></i> ${t.label}
                </button>
            `,
        )
        .join("");

      let contentHtml = "";
      if (state.activeClientTab === "overview")
        contentHtml = getClientProjectsTab(client, clientProjects);
      else if (state.activeClientTab === "details")
        contentHtml = getClientProfileTab(client);

      return `
                <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <button type="button" onclick="closeClientDetails()" aria-label="Back to client roster" class="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer">
                            <i data-lucide="arrow-left" class="w-5 h-5 text-slate-600" aria-hidden="true"></i>
                        </button>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">${client.name}</h2>
                                <span class="relative flex h-3 w-3" title="Status: ${activeProjectsCount > 0 ? "Active Projects" : "No Active Projects"}">
                                  ${activeProjectsCount > 0 ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>` : ""}
                                  <span class="relative inline-flex rounded-full h-3 w-3 ${activeProjectsCount > 0 ? "bg-emerald-500" : "bg-slate-300"}"></span>
                                </span>
                            </div>
                            <p class="text-sm text-slate-500 mt-0.5">
                                <span class="font-medium text-slate-700">${client.company !== "N/A" ? client.company : "Individual Client"}</span> 
                                &nbsp;|&nbsp; <i data-lucide="mail" class="w-3 h-3 inline-block mr-1" aria-hidden="true"></i> ${client.email || "--"} 
                                &nbsp;|&nbsp; <i data-lucide="phone" class="w-3 h-3 inline-block mr-1" aria-hidden="true"></i> ${client.phone !== "N/A" ? client.phone : "--"}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button type="button" onclick="openClientEditModal('${client.id}')" aria-label="Edit client details" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-brand-primary">
                            <i data-lucide="edit" class="w-4 h-4" aria-hidden="true"></i> Edit Client
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
                    <div class="px-4 border-b border-slate-200 bg-slate-50/50 flex space-x-2 overflow-x-auto">
                        ${tabsHtml}
                    </div>
                    <div class="p-6 flex-1 bg-slate-50/30">
                        ${contentHtml}
                    </div>
                </div>
            `;
    }