// project_tooltip.js

function getProjectEmployeesTooltipText(projId) {
    if (!state.projectAssignmentsMap) return "No employees assigned";
    const list = state.projectAssignmentsMap[projId];
    if (!list || list.length === 0) return "No employees assigned";
    return list.join(", ");
}

window.showProjectTooltip = (event, projId) => {
    // FAILSAFE: Block tooltip if we are inside project details view!
    if (state.activeProject) return;

    let tooltip = document.getElementById("global-project-tooltip");
    if (!tooltip) return;

    const text = getProjectEmployeesTooltipText(projId);
    tooltip.innerHTML = `
        <div class="flex items-center gap-1.5 font-bold text-indigo-400 border-b border-slate-800 pb-1.5 mb-1.5">
            <i data-lucide="users" class="w-3.5 h-3.5"></i>
            <span>Assigned Employees</span>
        </div>
        <p class="text-slate-300 font-medium leading-relaxed">${text}</p>
    `;

    if (window.lucide) {
        window.lucide.createIcons({
        attrs: { class: 'w-3.5 h-3.5' },
        nameAttr: 'data-lucide',
        node: tooltip
        });
    }

    tooltip.classList.remove("invisible", "opacity-0", "scale-95");
    tooltip.classList.add("opacity-100", "scale-100");

    const rect = event.currentTarget.getBoundingClientRect();
    let left = rect.right + 16;
    let top = rect.top;

    if (left + 240 > window.innerWidth) {
        left = rect.left - 240 - 16;
    }

    const tooltipHeight = tooltip.offsetHeight || 80;
    if (top + tooltipHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - tooltipHeight - 16);
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
};

window.hideProjectTooltip = () => {
    const tooltip = document.getElementById("global-project-tooltip");
    if (tooltip) {
        tooltip.classList.remove("opacity-100", "scale-100");
        tooltip.classList.add("invisible", "opacity-0", "scale-95");
    }
};
