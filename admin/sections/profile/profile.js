/**
 * YANA OS - ADMIN PANEL PROFILE & SYSTEM GOVERNANCE SECTION (PRB-047)
 * Production & Commercial Grade Admin Management Engine
 */

function getAdminProfileTemplate() {
  // If activeAdminProfile isn't loaded yet, fetch background and return loader
  if (!state.activeAdminProfile) {
    apiFetch('/admins/me').then(admin => {
      if (admin) {
        state.activeAdminProfile = admin;
        renderAdminApp();
      }
    });
    return `
      <div class="h-full w-full flex items-center justify-center bg-slate-50 min-h-[500px]">
        <div class="flex flex-col items-center">
          <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-brand-primary mb-4"></i>
          <p class="text-slate-500 font-medium">Loading administrative profile...</p>
        </div>
      </div>
    `;
  }

  const admin = state.activeAdminProfile;
  const activeTab = state.adminProfileTab || 'profile-identity';
  const initial = (admin.full_name || admin.username || 'A').charAt(0).toUpperCase();
  const fullNameVal = admin.full_name && admin.full_name !== 'N/A' ? admin.full_name : '';
  const emailVal = admin.email && admin.email !== 'N/A' ? admin.email : '';
  const phoneVal = localStorage.getItem('yana_admin_phone') || '';
  const designationVal = localStorage.getItem('yana_admin_designation') || 'Lead Infrastructure & System Administrator';
  const timezoneVal = localStorage.getItem('yana_admin_timezone') || 'UTC+05:30 (Asia/Kolkata - IST)';
  const bioVal = localStorage.getItem('yana_admin_bio') || '';

  // Trigger background loading of Co-Admins and Checklists if on respective tabs
  if (activeTab === 'profile-governance' && (!state.allAdmins || state.allAdmins.length === 0)) {
    setTimeout(loadCoAdministrators, 50);
  }
  if (activeTab === 'profile-checklists') {
    const selectedProjId = state.selectedProfileChecklistProject || (state.allProjects && state.allProjects[0] ? state.allProjects[0].id : 'global');
    setTimeout(() => loadAdminProfileChecklists(selectedProjId), 50);
  }

  return `
    <div class="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto h-full animate-in pb-24">
      
      <!-- Top Breadcrumbs Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div class="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Admin Control</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            <span class="text-brand-primary">My Profile & Governance</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-800 tracking-tight">System Administrator Profile</h2>
        </div>
        <div class="flex items-center space-x-3">
          <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Active Session
          </span>
          <button onclick="logout()" class="inline-flex items-center px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-sm">
            <i data-lucide="log-out" class="w-3.5 h-3.5 mr-1.5"></i>
            Terminate Session
          </button>
        </div>
      </div>

      <!-- Executive Admin Hero Card -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl shadow-md border border-slate-800 p-6 text-white relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div class="flex items-center space-x-5">
            <div class="relative">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-500 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg border-2 border-white/20">
                ${initial}
              </div>
              <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center" title="Online & Authenticated">
                <i data-lucide="check" class="w-3 h-3 text-white"></i>
              </span>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-2xl font-bold text-white tracking-tight">${admin.full_name && admin.full_name !== 'N/A' ? admin.full_name : admin.username}</h3>
                <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wide">
                  ${admin.access_level || 'SystemAdmin'}
                </span>
              </div>
              <p class="text-sm text-slate-300 font-medium mt-0.5">@${admin.username} • <span class="text-indigo-300 font-semibold">${designationVal}</span></p>
              <p class="text-xs text-slate-400 mt-1 flex items-center">
                <i data-lucide="mail" class="w-3.5 h-3.5 mr-1.5 text-slate-400"></i>
                ${admin.email && admin.email !== 'N/A' ? admin.email : 'No registered email'}
              </p>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:border-l md:border-slate-700/60 md:pl-6">
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3">
              <div class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Access Tier</div>
              <div class="text-sm font-bold text-white mt-0.5">${admin.access_level || 'SystemAdmin'}</div>
            </div>
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3">
              <div class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Security Tier</div>
              <div class="text-sm font-bold text-emerald-400 mt-0.5">TLS 1.3 / JWT</div>
            </div>
            <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div class="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Co-Administrators</div>
              <div class="text-sm font-bold text-indigo-300 mt-0.5" id="hero-coadmin-count">${state.allAdmins ? state.allAdmins.length : 1} Active</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Commercial Multi-Tab Navigation Bar -->
      <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm px-2 pt-2 flex space-x-2 overflow-x-auto scrollbar-none">
        <button onclick="switchAdminProfileTab('profile-identity')" 
          class="px-4 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'profile-identity' ? 'border-brand-primary text-brand-primary bg-indigo-50/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}">
          <i data-lucide="user-check" class="w-4 h-4"></i>
          Identity & Contact
        </button>
        <button onclick="switchAdminProfileTab('profile-security')" 
          class="px-4 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'profile-security' ? 'border-brand-primary text-brand-primary bg-indigo-50/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
          Security & Credentials
        </button>
        <button onclick="switchAdminProfileTab('profile-governance')" 
          class="px-4 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'profile-governance' ? 'border-brand-primary text-brand-primary bg-indigo-50/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}">
          <i data-lucide="sliders" class="w-4 h-4"></i>
          Governance & RBAC Matrix
        </button>
        <button onclick="switchAdminProfileTab('profile-preferences')" 
          class="px-4 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 shrink-0 ${activeTab === 'profile-preferences' ? 'border-brand-primary text-brand-primary bg-indigo-50/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}">
          <i data-lucide="settings" class="w-4 h-4"></i>
          Preferences & UI
        </button>
      </div>

      <!-- TAB 1: IDENTITY & CONTACT -->
      ${activeTab === 'profile-identity' ? `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in">
          <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-800">Administrative Identity Details</h3>
              <p class="text-xs text-slate-500 mt-0.5">Manage your display profile, contact information, and regional parameters.</p>
            </div>
            <span class="px-3 py-1 bg-slate-100 text-slate-600 font-mono text-xs font-semibold rounded-lg">ID: ${admin.id}</span>
          </div>

          <form id="admin-profile-identity-form" onsubmit="handleAdminProfileIdentitySubmit(event)" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Username</label>
                <div class="relative">
                  <input type="text" value="${admin.username}" readonly spellcheck="false" autocomplete="username" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold cursor-not-allowed outline-none" />
                  <i data-lucide="lock" class="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Unique login identifier (Read-only System Key).</p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Access Level</label>
                <div class="relative">
                  <input type="text" value="${admin.access_level || 'SystemAdmin'}" readonly class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold cursor-not-allowed outline-none" />
                  <i data-lucide="shield" class="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Controlled via system security policy.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Full Name *</label>
                <input type="text" id="admin-profile-name-input" value="${fullNameVal}" required autocomplete="name" placeholder="e.g. System Admin" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Official Email Address *</label>
                <input type="email" id="admin-profile-email-input" value="${emailVal}" required spellcheck="false" autocomplete="email" placeholder="admin@yana-os.com" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Contact Phone</label>
                <input type="text" id="admin-profile-phone-input" value="${phoneVal}" placeholder="+91 9876543210" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Role Title / Designation</label>
                <input type="text" id="admin-profile-designation-input" value="${designationVal}" placeholder="System Architect" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium" />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Timezone / Locale</label>
                <select id="admin-profile-timezone-input" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium">
                  <option value="UTC+05:30 (Asia/Kolkata - IST)" ${timezoneVal.includes('05:30') ? 'selected' : ''}>UTC+05:30 (Asia/Kolkata - IST)</option>
                  <option value="UTC+00:00 (London - GMT)" ${timezoneVal.includes('00:00') ? 'selected' : ''}>UTC+00:00 (London - GMT)</option>
                  <option value="UTC-05:00 (New York - EST)" ${timezoneVal.includes('05:00') ? 'selected' : ''}>UTC-05:00 (New York - EST)</option>
                  <option value="UTC-08:00 (Pacific - PST)" ${timezoneVal.includes('08:00') ? 'selected' : ''}>UTC-08:00 (Pacific - PST)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Administrative Bio / Operational Notes</label>
              <textarea id="admin-profile-bio-input" rows="3" placeholder="Brief internal notes or system administration focus areas..." class="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium text-sm resize-none">${bioVal}</textarea>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" class="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all">
                <i data-lucide="save" class="w-4 h-4 mr-2"></i> Save Identity Profile
              </button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- TAB 2: SECURITY & CREDENTIALS -->
      ${activeTab === 'profile-security' ? `
        <div class="space-y-6 animate-in">
          <!-- Password Update Card -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-bold text-slate-800">Password & Authentication Hardening</h3>
                <p class="text-xs text-slate-500 mt-0.5">Update your administrative credentials with real-time entropy verification.</p>
              </div>
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <i data-lucide="key-round" class="w-3.5 h-3.5 mr-1"></i> Bcrypt Salt Rounds: 12
              </span>
            </div>

            <form id="admin-profile-security-form" onsubmit="handleAdminProfileSecuritySubmit(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">New Password</label>
                  <div class="relative">
                    <input type="password" id="admin-profile-password" placeholder="••••••••" autocomplete="new-password" oninput="checkAdminPasswordStrength(this.value)" class="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary font-medium" />
                    <button type="button" onclick="toggleAdminPasswordVisibility('admin-profile-password', 'admin-pwd-eye')" aria-label="Toggle password visibility" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                      <i id="admin-pwd-eye" data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                  </div>
                  <!-- Password Strength Meter -->
                  <div class="mt-2.5">
                    <div class="flex justify-between items-center text-xs mb-1">
                      <span class="text-slate-500 font-medium">Strength:</span>
                      <span id="pwd-strength-label" class="font-bold text-slate-400">Enter password</span>
                    </div>
                    <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div id="pwd-strength-bar" class="h-full w-0 bg-rose-500 transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Confirm New Password</label>
                  <div class="relative">
                    <input type="password" id="admin-profile-confirm-password" placeholder="••••••••" autocomplete="new-password" class="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary font-medium" />
                    <button type="button" onclick="toggleAdminPasswordVisibility('admin-profile-confirm-password', 'admin-confirm-pwd-eye')" aria-label="Toggle confirm password visibility" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                      <i id="admin-confirm-pwd-eye" data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-2">Passwords must match exactly.</p>
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" class="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all">
                  <i data-lucide="shield-check" class="w-4 h-4 mr-2"></i> Update Password Credentials
                </button>
              </div>
            </form>
          </div>

          <!-- Active Session Info Card -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 class="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i data-lucide="cpu" class="w-5 h-5 text-indigo-600"></i> Active JWT Session Information
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div class="text-xs font-semibold text-slate-500 uppercase">Current Session ID</div>
                <div class="text-xs font-mono font-bold text-slate-800 truncate mt-1">${admin.current_session_id || 'Active-JWT-Session'}</div>
              </div>
              <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div class="text-xs font-semibold text-slate-500 uppercase">Encryption Cipher</div>
                <div class="text-xs font-mono font-bold text-slate-800 mt-1">HS256 / SHA-256 Signature</div>
              </div>
              <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div class="text-xs font-semibold text-slate-500 uppercase">Bearer Token Storage</div>
                <div class="text-xs font-mono font-bold text-slate-800 mt-1">Local Session Key</div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 3: GOVERNANCE & RBAC MATRIX -->
      ${activeTab === 'profile-governance' ? `
        <div class="space-y-6 animate-in">
          <!-- Privilege Matrix -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div class="mb-6 pb-4 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-800">System Privilege & Governance Matrix</h3>
              <p class="text-xs text-slate-500 mt-0.5">Overview of granted administrative capabilities and security boundaries.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center justify-between mb-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <i data-lucide="users" class="w-4 h-4"></i>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GRANTED</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">System Administration</h4>
                <p class="text-xs text-slate-500 mt-1">Full CRUD permissions over Employees, Managers, and System Admins.</p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center justify-between mb-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GRANTED</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">Financial Privacy Toggle</h4>
                <p class="text-xs text-slate-500 mt-1">Authority to unblur sensitive hourly rates and corporate ledgers.</p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center justify-between mb-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GRANTED</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">System Audit Logging</h4>
                <p class="text-xs text-slate-500 mt-1">Unrestricted visibility into activity logs and operation histories.</p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center justify-between mb-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <i data-lucide="user-x" class="w-4 h-4"></i>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GRANTED</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">Operative Deletion</h4>
                <p class="text-xs text-slate-500 mt-1">Executive right to deactivate or permanently purge staff accounts.</p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div class="flex items-center justify-between mb-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <i data-lucide="clipboard-check" class="w-4 h-4"></i>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">GRANTED</span>
                </div>
                <h4 class="font-bold text-sm text-slate-800">Project Gatekeeper</h4>
                <p class="text-xs text-slate-500 mt-1">Authority to define mandatory start/end phase project checklists.</p>
              </div>
            </div>
          </div>

          <!-- Registered System Admins Directory Table -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 class="font-bold text-lg text-slate-800">Co-Administrators Directory</h3>
                <p class="text-xs text-slate-500 mt-0.5">All administrative accounts registered in Yana OS.</p>
              </div>
              <button onclick="loadCoAdministrators()" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh List
              </button>
            </div>

            <div id="co-admins-table-container" class="overflow-x-auto">
              <div class="p-8 text-center text-slate-400">
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary"></i>
                <p class="text-xs font-medium">Loading co-administrators...</p>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 4: PREFERENCES & UI -->
      ${activeTab === 'profile-preferences' ? `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in">
          <div class="mb-6 pb-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-800">Workspace Preferences & System Display</h3>
            <p class="text-xs text-slate-500 mt-0.5">Configure your personal admin workspace behavior, audio feedback, and data grid density.</p>
          </div>

          <form id="admin-preferences-form" onsubmit="handleSaveAdminPreferences(event)" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

              <!-- Financial Privacy Toggle -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Financial Privacy Blur Mode</h4>
                  <p class="text-xs text-slate-500 mt-0.5">Blur sensitive cost figures across all tables and cards by default.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="pref-hide-financials" ${state.hideFinancials ? 'checked' : ''} class="sr-only peer" />
                  <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>

              <!-- Default Workspace Landing View -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Default Landing View</label>
                <select id="pref-default-view" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary text-slate-800 font-medium">
                  <option value="projects" ${(sessionStorage.getItem("lastAdminView") || "projects") === "projects" ? 'selected' : ''}>Project Control Hub</option>
                  <option value="dashboard" ${(sessionStorage.getItem("lastAdminView")) === "dashboard" ? 'selected' : ''}>Executive Dashboard</option>
                  <option value="clients" ${(sessionStorage.getItem("lastAdminView")) === "clients" ? 'selected' : ''}>Clients Registry</option>
                  <option value="workforce" ${(sessionStorage.getItem("lastAdminView")) === "workforce" ? 'selected' : ''}>Workforce Directory</option>
                  <option value="timesheets" ${(sessionStorage.getItem("lastAdminView")) === "timesheets" ? 'selected' : ''}>Financial Ledger</option>
                </select>
                <p class="text-[11px] text-slate-400 mt-1">Section loaded automatically upon fresh login.</p>
              </div>

              <!-- Compact Table Layout Toggle & Live Preview -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between md:col-span-2">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h4 class="text-sm font-bold text-slate-800">Compact Table Layout (High-Density Grids)</h4>
                    <p class="text-xs text-slate-500 mt-0.5">Reduces cell padding to 6px vertical and text size to 12px across all system data tables (Projects, Employees, Ledgers, Timesheets) for maximum information density.</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input type="checkbox" id="pref-compact-ui" onchange="toggleCompactTableLive(this.checked)" ${localStorage.getItem('yanaCompactUI') === 'true' ? 'checked' : ''} class="sr-only peer" />
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>

                <!-- Live Compactness Preview Box -->
                <div class="mt-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Table Density Preview</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-brand-primary border border-indigo-100">Live Workspace Sample</span>
                  </div>
                  <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th class="py-2.5 px-4">Project / Deliverable</th>
                          <th class="py-2.5 px-4">Category</th>
                          <th class="py-2.5 px-4">Status</th>
                          <th class="py-2.5 px-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        <tr class="hover:bg-slate-50">
                          <td class="py-2.5 px-4 font-bold text-slate-800">Sample Enterprise Project</td>
                          <td class="py-2.5 px-4 text-slate-500">Full-Stack Platform</td>
                          <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span></td>
                          <td class="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">₹1,50,000.00</td>
                        </tr>
                        <tr class="hover:bg-slate-50">
                          <td class="py-2.5 px-4 font-bold text-slate-800">Cloud Infrastructure Retainer</td>
                          <td class="py-2.5 px-4 text-slate-500">DevOps Support</td>
                          <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Monthly</span></td>
                          <td class="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">₹80,000.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Toast & Desktop Audio Alerts -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between md:col-span-2">
                <div>
                  <h4 class="text-sm font-bold text-slate-800">Notification Sound & Audio Feedback</h4>
                  <p class="text-xs text-slate-500 mt-0.5">Synthesize a dual-tone chime (Web Audio API) whenever toast alerts, client payments, or leave requests arrive.</p>
                </div>
                <div class="flex items-center gap-3">
                  <button type="button" onclick="testAudioChime()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-brand-primary border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
                    <i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Test Audio Chime
                  </button>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="pref-audio-alerts" ${localStorage.getItem('yanaAudioAlerts') !== 'false' ? 'checked' : ''} class="sr-only peer" />
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>
              </div>

            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" class="inline-flex items-center px-6 py-3 bg-brand-primary hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all">
                <i data-lucide="save" class="w-4 h-4 mr-2"></i> Save Workspace Preferences
              </button>
            </div>
          </form>
        </div>
      ` : ''}

    </div>
  `;
}

/**
 * Switch Tab in Profile Section
 */
function switchAdminProfileTab(tabId) {
  state.adminProfileTab = tabId;
  renderAdminApp();
}

/**
 * Handle Identity Profile Updates
 */
async function handleAdminProfileIdentitySubmit(event) {
  event.preventDefault();
  if (!state.activeAdminProfile) return;

  const fullName = document.getElementById('admin-profile-name-input').value.trim();
  const email = document.getElementById('admin-profile-email-input').value.trim();
  const phone = document.getElementById('admin-profile-phone-input').value.trim();
  const designation = document.getElementById('admin-profile-designation-input').value.trim();
  const timezone = document.getElementById('admin-profile-timezone-input').value;
  const bio = document.getElementById('admin-profile-bio-input').value.trim();

  // Save local extensions
  if (phone) localStorage.setItem('yana_admin_phone', phone);
  if (designation) localStorage.setItem('yana_admin_designation', designation);
  if (timezone) localStorage.setItem('yana_admin_timezone', timezone);
  if (bio) localStorage.setItem('yana_admin_bio', bio);

  try {
    const res = await apiFetch(`/admins/update/${state.activeAdminProfile.id}`, {
      method: 'PUT',
      body: {
        full_name: fullName,
        email: email
      }
    });

    if (res) {
      showToast("Identity profile updated successfully!", "success");
      state.activeAdminProfile = res;
      renderAdminApp();
    }
  } catch (err) {
    showToast("Failed to update profile: " + err.message, "error");
  }
}

/**
 * Handle Password & Credentials Updates
 */
async function handleAdminProfileSecuritySubmit(event) {
  event.preventDefault();
  if (!state.activeAdminProfile) return;

  const password = document.getElementById('admin-profile-password').value;
  const confirmPassword = document.getElementById('admin-profile-confirm-password').value;

  if (!password) {
    showToast("Please enter a new password.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "error");
    return;
  }

  try {
    const res = await apiFetch(`/admins/update/${state.activeAdminProfile.id}`, {
      method: 'PUT',
      body: { password: password }
    });

    if (res) {
      showToast("Password updated successfully!", "success");
      document.getElementById('admin-profile-password').value = '';
      document.getElementById('admin-profile-confirm-password').value = '';
      state.activeAdminProfile = res;
      renderAdminApp();
    }
  } catch (err) {
    showToast("Failed to update credentials: " + err.message, "error");
  }
}

/**
 * Dynamic Password Strength Calculator
 */
function checkAdminPasswordStrength(val) {
  const bar = document.getElementById('pwd-strength-bar');
  const label = document.getElementById('pwd-strength-label');
  if (!bar || !label) return;

  if (!val) {
    bar.style.width = '0%';
    bar.className = 'h-full w-0 bg-slate-300 transition-all duration-300';
    label.innerText = 'Enter password';
    label.className = 'font-bold text-slate-400';
    return;
  }

  let score = 0;
  if (val.length >= 8) score += 25;
  if (val.length >= 12) score += 15;
  if (/[A-Z]/.test(val)) score += 20;
  if (/[0-9]/.test(val)) score += 20;
  if (/[^A-Za-z0-9]/.test(val)) score += 20;

  bar.style.width = score + '%';
  if (score < 40) {
    bar.className = 'h-full bg-rose-500 transition-all duration-300';
    label.innerText = 'Weak';
    label.className = 'font-bold text-rose-500';
  } else if (score < 75) {
    bar.className = 'h-full bg-amber-500 transition-all duration-300';
    label.innerText = 'Moderate';
    label.className = 'font-bold text-amber-500';
  } else if (score < 90) {
    bar.className = 'h-full bg-emerald-500 transition-all duration-300';
    label.innerText = 'Strong';
    label.className = 'font-bold text-emerald-600';
  } else {
    bar.className = 'h-full bg-indigo-600 transition-all duration-300';
    label.innerText = 'Enterprise Grade';
    label.className = 'font-bold text-indigo-600';
  }
}

/**
 * Toggle Password Visibility
 */
function toggleAdminPasswordVisibility(inputId, eyeIconId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(eyeIconId);
  if (!input || !eye) return;

  if (input.type === 'password') {
    input.type = 'text';
    eye.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    eye.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

/**
 * Fetch and Render Co-Administrators List
 */
async function loadCoAdministrators() {
  const container = document.getElementById('co-admins-table-container');
  if (!container) return;

  try {
    const admins = await apiFetch('/admins/all');
    if (admins && Array.isArray(admins)) {
      state.allAdmins = admins;
      const heroCount = document.getElementById('hero-coadmin-count');
      if (heroCount) heroCount.innerText = `${admins.length} Active`;

      container.innerHTML = `
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-6">Administrator</th>
              <th class="py-3 px-6">Username</th>
              <th class="py-3 px-6">Email Address</th>
              <th class="py-3 px-6">Access Level</th>
              <th class="py-3 px-6 text-right">Registered Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            ${admins.map(a => `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-6 flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold uppercase text-xs">
                    ${(a.full_name || a.username || 'A').charAt(0)}
                  </div>
                  <span class="font-bold text-slate-800">${a.full_name && a.full_name !== 'N/A' ? a.full_name : a.username}</span>
                </td>
                <td class="py-3 px-6 font-mono text-slate-500">@${a.username}</td>
                <td class="py-3 px-6 text-slate-600">${a.email && a.email !== 'N/A' ? a.email : 'N/A'}</td>
                <td class="py-3 px-6">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    ${a.access_level || 'SystemAdmin'}
                  </span>
                </td>
                <td class="py-3 px-6 text-right text-slate-400 font-mono">
                  ${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Failed to load co-administrators:", err);
    container.innerHTML = `
      <div class="p-6 text-center text-rose-500 text-xs font-medium">
        Failed to fetch administrative directory. (${err.message})
      </div>
    `;
  }
}

/**
 * Handle Saving Workspace Preferences
 */
function handleSaveAdminPreferences(event) {
  event.preventDefault();
  
  const hideFin = document.getElementById('pref-hide-financials').checked;
  const defaultView = document.getElementById('pref-default-view').value;
  const compactUI = document.getElementById('pref-compact-ui').checked;
  const audioAlerts = document.getElementById('pref-audio-alerts').checked;

  state.hideFinancials = hideFin;
  localStorage.setItem('yanaHideFinancials', hideFin ? 'true' : 'false');
  sessionStorage.setItem('lastAdminView', defaultView);
  localStorage.setItem('yanaCompactUI', compactUI ? 'true' : 'false');
  localStorage.setItem('yanaAudioAlerts', audioAlerts ? 'true' : 'false');

  if (compactUI) {
    document.body.classList.add('compact-table-mode');
  } else {
    document.body.classList.remove('compact-table-mode');
  }

  showToast("Workspace preferences saved!", "success");
  renderAdminApp();
}

/**
 * Live Compact Table Mode Toggle
 */
function toggleCompactTableLive(checked) {
  localStorage.setItem('yanaCompactUI', checked ? 'true' : 'false');
  if (checked) {
    document.body.classList.add('compact-table-mode');
  } else {
    document.body.classList.remove('compact-table-mode');
  }
}

/**
 * Test Audio Chime Synthesizer
 */
function testAudioChime() {
  if (window.playNotificationSound) {
    window.playNotificationSound();
  }
  showToast("Audio chime sound tested successfully!", "info");
}

// Global Bindings for inline HTML event handling
window.switchAdminProfileTab = switchAdminProfileTab;
window.handleAdminProfileIdentitySubmit = handleAdminProfileIdentitySubmit;
window.handleAdminProfileSecuritySubmit = handleAdminProfileSecuritySubmit;
window.checkAdminPasswordStrength = checkAdminPasswordStrength;
window.toggleAdminPasswordVisibility = toggleAdminPasswordVisibility;
window.loadCoAdministrators = loadCoAdministrators;
window.handleSaveAdminPreferences = handleSaveAdminPreferences;
window.toggleCompactTableLive = toggleCompactTableLive;
window.testAudioChime = testAudioChime;