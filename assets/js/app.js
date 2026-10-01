import { baseState } from './data.js';
import { detectConflicts, buildRecommendations, formatDate, timeRange, currency, extractTaskIds } from './engine.js';
import { utilizationReport, projectCostReport, conflictSummary, csv } from './reports.js';

const STORE_KEY = 'nordflow-demo-v2';
const clone = x => JSON.parse(JSON.stringify(x));
const labels = { dashboard:'Dashboard', planner:'Planner', projects:'Projects', resources:'Resources', conflicts:'Conflicts', recommendations:'Recommendations', reports:'Reports', audit:'Audit trail', settings:'Settings' };
let state = loadState();
let currentView = 'dashboard';
let activeConflictFilter = 'All';
let recommendationTab = 'pending';
let lastFocusedElement = null;

function normalize(saved) {
  const current = saved ? { ...clone(baseState), ...saved } : clone(baseState);
  for (const key of ['organizations','users','teams','skills','employeeSkills','projects','tasks','assignments','resources','maintenancePeriods','equipmentAssignments','availability','locations','conflicts','recommendations','audit']) {
    current[key] = Array.isArray(current[key]) ? current[key] : [];
  }
  current.workPolicy = current.workPolicy || clone(baseState.workPolicy);
  current.selectedOrg = current.organizations.some(o => o.id === current.selectedOrg) ? current.selectedOrg : baseState.selectedOrg;
  current.resources = current.resources.map(r => ({
    ...r,
    org: r.org || current.users.find(u => u.id === r.id)?.org || (r.kind === 'Equipment' ? 'fjordkraft' : null)
  }));
  current.audit = current.audit.map(a => ({
    ...a,
    org: a.org || current.users.find(u => u.name === a.actor)?.org || current.selectedOrg
  }));
  return current;
}

function reconcileDerived(current) {
  const previousConflicts = new Map((current.conflicts || []).map(c => [c.id, c]));
  const detected = detectConflicts(current, current.selectedOrg).map(c => {
    const old = previousConflicts.get(c.id);
    return old?.status && old.status !== 'Open' ? { ...c, status: old.status } : c;
  });

  const previousRecommendations = new Map((current.recommendations || []).map(r => [r.id, r]));
  const generated = buildRecommendations(current, detected).map(r => {
    const old = previousRecommendations.get(r.id);
    return old ? { ...r, status: old.status || 'Pending', decidedAt: old.decidedAt || '', decisionNote: old.decisionNote || '' } : r;
  });
  const generatedIds = new Set(generated.map(r => r.id));
  const history = (current.recommendations || []).filter(r => ['Approved','Rejected'].includes(r.status) && !generatedIds.has(r.id));
  current.conflicts = detected;
  current.recommendations = [...generated, ...history];
}

function loadState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { saved = null; }
  const current = normalize(saved);
  reconcileDerived(current);
  return current;
}

function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function org() { return state.organizations.find(o => o.id === state.selectedOrg); }
function actor() { return state.users.find(u => u.org === state.selectedOrg && ['Manager','Organization Owner','Administrator'].includes(u.role)) || state.users.find(u => u.org === state.selectedOrg) || { name:'Operations manager', role:'Manager' }; }
function safePercent(value, total) { return total > 0 ? Math.round(value / total * 100) : 0; }
function now() { return new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(',',''); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

function setActorUI() {
  const currentActor = actor();
  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  if (avatar) avatar.textContent = currentActor.name.split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();
  if (name) name.textContent = currentActor.name;
}

function setView(view) {
  currentView = labels[view] ? view : 'dashboard';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
  document.getElementById('currentViewLabel').textContent = labels[currentView];
  document.getElementById('pageTitle').textContent = `${org()?.name || 'NordFlow'} · ${labels[currentView]}`;
  setActorUI();
  render();
  closeSidebar();
}

function refreshDerived() {
  reconcileDerived(state);
  persist();
  updateCounts();
}

function updateCounts() {
  const c = document.getElementById('navConflictCount');
  const r = document.getElementById('navRecommendationCount');
  if (c) c.textContent = state.conflicts.filter(x => x.status === 'Open').length;
  if (r) r.textContent = state.recommendations.filter(x => x.org === state.selectedOrg && x.status === 'Pending').length;
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove('show'), 2600);
}

function metric(label,value,sub,alert=false){
  return `<section class="card metric"><div class="metric-top"><span class="metric-label">${esc(label)}</span>${alert?'<span class="metric-trend" style="background:#fef2f2;color:#b91c1c">Needs review</span>':''}</div><div class="metric-value">${esc(value)}</div><div class="card-sub">${esc(sub)}</div></section>`;
}

function render() {
  const mount = document.getElementById('appView');
  const views = { dashboard:renderDashboard, planner:renderPlanner, projects:renderProjects, resources:renderResources, conflicts:renderConflicts, recommendations:renderRecommendations, reports:renderReports, audit:renderAudit, settings:renderSettings };
  mount.innerHTML = (views[currentView] || renderDashboard)();
  bindViewEvents();
  updateCounts();
  setActorUI();
}

function renderDashboard() {
  const projects = state.projects.filter(p => p.org === state.selectedOrg);
  const conflicts = state.conflicts.filter(c => c.status === 'Open');
  const resources = state.resources.filter(r => r.kind === 'Employee' && r.org === state.selectedOrg);
  const avgUtil = resources.length ? Math.round(resources.reduce((s,r)=>s+r.utilization,0)/resources.length) : 0;
  const budget = projects.reduce((s,p)=>s+p.budget,0);
  const spent = projects.reduce((s,p)=>s+p.spent,0);
  const teams = state.teams.filter(t => t.org === state.selectedOrg);
  const deadlineProjects = [...projects].sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,4);
  const a = actor();
  return `
    <div class="view-head"><div><div class="eyebrow">Operations overview</div><h2>Good afternoon, ${esc(a.name.split(' ')[0])}</h2><p>See where delivery capacity is tight, which projects need attention, and what the coordination engine suggests next.</p></div><div class="view-actions"><button class="ghost-button" data-view="planner">Open planner</button><button class="primary-button" data-view="conflicts">Review ${conflicts.length} conflicts</button></div></div>
    <div class="grid grid-4">
      ${metric('Active projects', projects.length, 'Live portfolio scope')}
      ${metric('Open conflicts', conflicts.length, `${conflicts.filter(c=>c.severity==='Critical').length} critical`, conflicts.length > 0)}
      ${metric('Avg. utilization', avgUtil + '%', 'People in selected workspace')}
      ${metric('Budget consumed', safePercent(spent,budget) + '%', `${currency(spent)} of ${currency(budget)}`)}
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <section class="card card-pad"><div class="card-title">Capacity by team</div><div class="card-sub">Current planned utilization</div>
        ${teams.length ? teams.map(team=>{ const teamRes=resources.filter(r=>r.team===team.name); const val=teamRes.length?Math.round(teamRes.reduce((s,r)=>s+r.utilization,0)/teamRes.length):0; return `<div class="bar-row"><div class="bar-label">${esc(team.name)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,val)}%"></div></div><div class="bar-value">${val}%</div></div>`;}).join('') : '<div class="empty"><strong>No team capacity data</strong>Create or import teams for this workspace.</div>'}
        <div class="footer-note">High-load resources are surfaced separately so managers can rebalance before assigning new work.</div>
      </section>
      <section class="card card-pad"><div class="card-title">Attention queue</div><div class="card-sub">Explainable issues from the deterministic engine</div>
        <div class="alert-list">${conflicts.slice(0,4).map(c=>`<div class="alert ${c.severity==='Medium'?'warning':''}"><div class="alert-title">${esc(c.title)}</div><div class="alert-copy">${esc(c.explanation)}</div></div>`).join('') || '<div class="empty"><strong>All clear</strong>No unresolved conflicts in this workspace.</div>'}</div>
      </section>
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <section class="card card-pad"><div class="card-title">Upcoming deadlines</div><div class="timeline">${deadlineProjects.map(p=>`<div class="timeline-row"><div class="timeline-time">${formatDate(p.deadline)}</div><div class="timeline-main"><strong>${esc(p.name)}</strong><div class="timeline-meta">${esc(p.client)} · <span class="pill ${p.status==='At risk'?'pill-danger':'pill-success'}">${esc(p.status)}</span></div></div></div>`).join('') || '<div class="empty"><strong>No deadlines in this workspace</strong></div>'}</div></section>
      <section class="card card-pad"><div class="card-title">Budget posture</div><div class="card-sub">Portfolio view in NOK</div><div class="metric-value" style="font-size:24px">${currency(spent)}</div><div class="card-sub">${currency(Math.max(0,budget-spent))} remaining</div><div class="bar-track" style="margin-top:14px;height:10px"><div class="bar-fill" style="width:${Math.min(100,safePercent(spent,budget))}%"></div></div><div class="kpi-strip"><div class="kpi-mini"><label>Spend</label><strong>${safePercent(spent,budget)}%</strong></div><div class="kpi-mini"><label>At risk</label><strong>${projects.filter(p=>p.status==='At risk').length}</strong></div><div class="kpi-mini"><label>Priority</label><strong>${projects.filter(p=>p.priority==='High').length}</strong></div></div></section>
    </div>`;
}

function renderPlanner() {
  const employees = state.resources.filter(r=>r.kind==='Employee' && r.org===state.selectedOrg);
  const dayIso = ['2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20'];
  const days = ['14 Oct','15 Oct','16 Oct','19 Oct','20 Oct'];
  const taskFor = (employeeId, date) => state.assignments.filter(a=>a.org===state.selectedOrg && a.employee===employeeId).map(a=>state.tasks.find(t=>t.id===a.task)).filter(Boolean).filter(t=>t.start.slice(0,10)===date);
  return `<div class="view-head"><div><div class="eyebrow">Capacity planning</div><h2>Planner</h2><p>Inspect task coverage by resource. Red items are conflicts detected by the rules engine; changes are only made after an explicit approval.</p></div><div class="filters"><button class="filter active">All resources</button><button class="filter">High load</button><button class="filter">Conflicts</button></div></div>
  <section class="card card-pad plan-board"><div class="plan-grid"><div class="plan-header">Resource</div>${days.map(d=>`<div class="plan-header">${d}</div>`).join('')}${employees.map(r=>`<div class="plan-resource">${esc(r.name)}<div style="font-size:10px;color:#64748b;margin-top:4px">${r.utilization}% planned</div></div>${dayIso.map(day=>`<div class="slot">${taskFor(r.id,day).map(t=>{const conflict=state.conflicts.some(c=>c.status==='Open'&&c.explanation.includes(t.name));return `<button class="assignment-chip ${conflict?'conflict':''}" data-task="${t.id}" aria-label="Open ${esc(t.name)} details">${esc(t.name)}<small>${timeRange(t)} · ${esc(t.location)}</small></button>`}).join('')}</div>`).join('')}`).join('')}</div></section>`;
}

function renderProjects() {
  const projects = state.projects.filter(p=>p.org===state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">Delivery portfolio</div><h2>Projects</h2><p>Project health, deadlines, budget consumption and delivery priority for the selected organization.</p></div><button class="primary-button" id="demoProject">Create demo project</button></div>
  <section class="card table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Budget</th><th>Health</th></tr></thead><tbody>${projects.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.client)}</td><td><span class="pill ${p.status==='At risk'?'pill-danger':p.status==='On track'?'pill-success':'pill-neutral'}">${esc(p.status)}</span></td><td>${esc(p.priority)}</td><td>${formatDate(p.deadline)}</td><td>${currency(p.spent)} / ${currency(p.budget)}</td><td><div style="width:120px"><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,p.health)}%"></div></div><div style="font-size:10px;color:#64748b;margin-top:4px">${p.health}%</div></div></td></tr>`).join('') || `<tr><td colspan="7"><div class="empty"><strong>No projects yet</strong>Use “Create demo project” to add a local sample project.</div></td></tr>`}</tbody></table></section>`;
}

function renderResources() {
  const resources = state.resources.filter(r=>r.org===state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">People & equipment</div><h2>Resources</h2><p>Use skill, location, capacity and utilization data together before committing a new assignment.</p></div></div>
  <section class="card table-wrap"><table><thead><tr><th>Resource</th><th>Type</th><th>Team</th><th>Location</th><th>Utilization</th><th>Rate</th><th>Status</th></tr></thead><tbody>${resources.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.kind)}</td><td>${esc(r.team)}</td><td>${esc(r.location)}</td><td>${r.utilization}%</td><td>${currency(r.costRate)}/h</td><td><span class="pill ${r.status==='Available'?'pill-success':r.utilization>=90?'pill-danger':'pill-warning'}">${esc(r.status)}</span></td></tr>`).join('') || `<tr><td colspan="7"><div class="empty"><strong>No resources in this workspace</strong>This empty state confirms the workspace is isolated.</div></td></tr>`}</tbody></table></section>`;
}

function renderConflicts() {
  const types = ['All', ...new Set(state.conflicts.map(c=>c.type))];
  const conflicts = state.conflicts.filter(c=>activeConflictFilter==='All'||c.type===activeConflictFilter);
  return `<div class="view-head"><div><div class="eyebrow">Rule engine</div><h2>Conflicts</h2><p>Every issue has a type, severity, affected entities, time period and plain-language explanation.</p></div><button class="ghost-button" id="rerunEngine">Run detection again</button></div>
  <div class="filters">${types.map(t=>`<button class="filter ${activeConflictFilter===t?'active':''}" data-conflict-filter="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  <section class="card table-wrap" style="margin-top:12px"><table><thead><tr><th>Severity</th><th>Conflict</th><th>Type</th><th>Explanation</th><th>Status</th><th></th></tr></thead><tbody>${conflicts.map(c=>`<tr><td><span class="pill ${c.severity==='Critical'?'pill-danger':c.severity==='High'?'pill-warning':'pill-neutral'}">${esc(c.severity)}</span></td><td><strong>${esc(c.title)}</strong><div class="card-sub">${esc(c.timePeriod)}</div></td><td>${esc(c.type)}</td><td style="white-space:normal;min-width:340px;max-width:500px">${esc(c.explanation)}</td><td>${esc(c.status)}</td><td><button class="ghost-button" data-conflict-id="${esc(c.id)}">Details</button></td></tr>`).join('') || `<tr><td colspan="6"><div class="empty"><strong>No conflicts for this filter</strong>Run detection again after changing the demo.</div></td></tr>`}</tbody></table></section>`;
}

function renderRecommendations() {
  const all = state.recommendations.filter(r=>r.org===state.selectedOrg);
  const pending = all.filter(r=>r.status==='Pending');
  const history = all.filter(r=>['Approved','Rejected'].includes(r.status)).sort((a,b)=>(b.decidedAt||'').localeCompare(a.decidedAt||''));
  const list = recommendationTab==='pending' ? pending : history;
  return `<div class="view-head"><div><div class="eyebrow">Human approval required</div><h2>Recommendations</h2><p>The engine proposes changes; managers explicitly approve or reject them. Approval only changes the local demo state when a concrete action is defined.</p></div></div>
    <div class="filters"><button class="filter ${recommendationTab==='pending'?'active':''}" data-rec-tab="pending">Pending <b>${pending.length}</b></button><button class="filter ${recommendationTab==='history'?'active':''}" data-rec-tab="history">Decision history <b>${history.length}</b></button></div>
    <div class="grid grid-2" style="margin-top:14px">${list.map(r=>`<article class="card card-pad"><div style="display:flex;justify-content:space-between;gap:10px"><span class="pill pill-neutral">${esc(r.id)}</span><span class="pill ${r.status==='Approved'?'pill-success':r.status==='Rejected'?'pill-neutral':'pill-warning'}">${esc(r.status)}</span></div><h3 style="font-size:15px;margin:13px 0 6px">${esc(r.title)}</h3><div class="card-sub">Why: ${esc(r.reason)}</div><div class="kpi-strip"><div class="kpi-mini"><label>Impact</label><strong style="font-size:12px">${esc(r.impact)}</strong></div><div class="kpi-mini"><label>Satisfies</label><strong style="font-size:12px">${esc(r.satisfied.join(', ')||'—')}</strong></div><div class="kpi-mini"><label>Trade-off</label><strong style="font-size:12px">${esc(r.violated.join(', ')||'None recorded')}</strong></div></div><div style="margin-top:13px"><div class="card-sub">Affected: ${esc(r.affected.join(' · '))}</div>${r.decisionNote?`<div class="card-sub" style="margin-top:5px">Decision: ${esc(r.decisionNote)}</div>`:''}</div>${r.status==='Pending'?`<div class="modal-actions" style="padding:14px 0 0;margin-top:8px;border:0"><button class="ghost-button" data-reject="${esc(r.id)}">Reject</button><button class="primary-button" data-approve="${esc(r.id)}">Review & approve</button></div>`:''}</article>`).join('') || `<section class="card card-pad"><div class="empty"><strong>${recommendationTab==='pending'?'No pending recommendations':'No decisions recorded yet'}</strong>${recommendationTab==='pending'?'The queue is clear for this organization.':'Approved and rejected recommendations will appear here.'}</div></section>`}</div>`;
}

function renderReports() {
  const util = utilizationReport(state,state.selectedOrg), cost = projectCostReport(state,state.selectedOrg), summary = conflictSummary(state,state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">Operational reporting</div><h2>Reports</h2><p>Lightweight reporting for utilization, project cost and unresolved conflict categories. Export is generated locally in your browser.</p></div><button class="primary-button" id="exportReport">Export report CSV</button></div>
    <div class="grid grid-3"><section class="card card-pad"><div class="card-title">Utilization</div>${util.map(r=>`<div class="bar-row" style="grid-template-columns:105px minmax(0,1fr) 46px"><div class="bar-label">${esc(r.resource.split(' ')[0])}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,r.utilization)}%"></div></div><div class="bar-value">${r.utilization}%</div></div>`).join('') || '<div class="empty">No utilization data.</div>'}</section>
    <section class="card card-pad"><div class="card-title">Conflict categories</div>${summary.map(s=>`<div class="bar-row" style="grid-template-columns:125px minmax(0,1fr) 28px"><div class="bar-label">${esc(s.type)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,s.count*18)}%"></div></div><div class="bar-value">${s.count}</div></div>`).join('') || '<div class="empty">No active conflicts.</div>'}</section>
    <section class="card card-pad"><div class="card-title">Portfolio cost</div><div class="metric-value" style="font-size:24px">${currency(state.projects.filter(p=>p.org===state.selectedOrg).reduce((s,p)=>s+p.spent,0))}</div><div class="card-sub">Total spent in selected workspace.</div><div class="code-block">CSV export is generated locally. No report data is uploaded by this demo.</div></section></div>
    <section class="card table-wrap" style="margin-top:16px"><table><thead><tr><th>Project</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Health</th></tr></thead><tbody>${cost.map(r=>`<tr><td><strong>${esc(r.project)}</strong></td><td>${r.budget}</td><td>${r.spent}</td><td>${r.remaining}</td><td>${r.health}%</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty">No project cost data.</div></td></tr>`}</tbody></table></section>`;
}

function renderAudit() {
  const rows = state.audit.filter(a => !a.org || a.org === state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">Immutable application history</div><h2>Audit trail</h2><p>Important changes are appended as events. This demo does not expose a normal application edit control for audit entries.</p></div></div><section class="card table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.entity)}</td><td>${esc(a.detail)}</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty">No audit events in this workspace.</div></td></tr>`}</tbody></table></section>`;
}

function renderSettings() {
  const p = state.workPolicy;
  return `<div class="view-head"><div><div class="eyebrow">Workspace policy</div><h2>Settings</h2><p>These values are product configuration, not legal advice. In production, policies should be reviewed against the employer's actual agreements and applicable requirements.</p></div></div>
  <div class="grid grid-2"><section class="card card-pad"><div class="card-title">Working-hour policy</div><div class="card-sub">Current demo defaults for the selected organization</div><div class="kpi-strip"><div class="kpi-mini"><label>Weekly target</label><strong>${p.weeklyTarget} h</strong></div><div class="kpi-mini"><label>Daily alert</label><strong>${p.dailyAlert} h</strong></div><div class="kpi-mini"><label>Daily rest</label><strong>${p.minimumDailyRest} h</strong></div></div><div class="code-block">In production: persist organization-specific policies, collective-agreement overrides, exceptions and approval rules on the server.</div></section><section class="card card-pad"><div class="card-title">Security posture</div><div class="card-sub">Static demo boundary</div><div class="alert-list"><div class="alert"><div class="alert-title">Client-side demo only</div><div class="alert-copy">There is no server, database, secret store or authentication authority in this GitHub Pages package.</div></div><div class="alert warning"><div class="alert-title">Production extension</div><div class="alert-copy">Use the architecture documents in /docs as the blueprint for NestJS + PostgreSQL + Redis + background workers.</div></div></div></section></div>`;
}

function findTaskById(id){ return state.tasks.find(t=>t.id===id); }
function addWorkingDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate()+1);
    if (![0,6].includes(d.getDay())) remaining--;
  }
  return d.toISOString().slice(0,10);
}
function shiftTask(task, days) {
  const start = new Date(task.start), end = new Date(task.end);
  const newDate = addWorkingDays(task.start.slice(0,10), days);
  const datePrefix = `${newDate}T`;
  const pad = n => String(n).padStart(2,'0');
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  task.start = `${datePrefix}${startTime}`;
  task.end = `${datePrefix}${endTime}`;
}
function shiftEquipment(equipmentAssignment, days) {
  const start = new Date(equipmentAssignment.start), end = new Date(equipmentAssignment.end);
  const newDate = addWorkingDays(equipmentAssignment.start.slice(0,10), days);
  const pad = n => String(n).padStart(2,'0');
  equipmentAssignment.start = `${newDate}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
  equipmentAssignment.end = `${newDate}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
}
function actionSummary(rec) {
  const a = rec.action;
  if (!a) return 'This recommendation records a management decision but does not automatically alter assignments.';
  if (a.type === 'reassignEmployee') {
    const task = findTaskById(a.taskId), person = state.users.find(u=>u.id===a.employeeId);
    return `Assign ${person?.name || 'the selected employee'} to ${task?.name || 'the task'}.`;
  }
  if (a.type === 'moveTask') {
    const task = findTaskById(a.taskId);
    return `Move ${task?.name || 'the task'} forward by ${a.days} working day.`;
  }
  if (a.type === 'moveEquipmentAssignment') return `Move the equipment booking forward by ${a.days} working day.`;
  return 'Apply the proposed demo change.';
}
function applyRecommendation(rec) {
  const action = rec.action;
  if (!action) return false;
  if (action.type === 'reassignEmployee') {
    const assignment = state.assignments.find(a => a.task === action.taskId && a.org === state.selectedOrg);
    if (!assignment) return false;
    assignment.employee = action.employeeId;
    return true;
  }
  if (action.type === 'moveTask') {
    const task = findTaskById(action.taskId);
    if (!task) return false;
    shiftTask(task, action.days || 1);
    return true;
  }
  if (action.type === 'moveEquipmentAssignment') {
    const ea = state.equipmentAssignments.find(x => x.id === action.equipmentAssignmentId);
    if (!ea) return false;
    shiftEquipment(ea, action.days || 1);
    return true;
  }
  return false;
}

function reviewRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id && r.org===state.selectedOrg); if(!rec)return;
  lastFocusedElement=document.activeElement;
  const applyText = rec.action ? 'Apply in demo & approve' : 'Approve follow-up';
  openModal('Recommendation review', rec.title,
    `<div class="pill pill-warning">Pending approval</div><p style="line-height:1.7;font-size:13px">${esc(rec.reason)}</p><div class="alert"><div class="alert-title">Proposed action</div><div class="alert-copy">${esc(actionSummary(rec))}</div></div><div class="alert warning"><div class="alert-title">Estimated impact</div><div class="alert-copy">${esc(rec.impact)}</div></div><div class="card-sub" style="margin-top:11px">Affected: ${esc(rec.affected.join(' · '))}</div><div class="card-sub" style="margin-top:7px">This GitHub Pages demo stores the decision locally in your browser. It does not call a production API.</div>`,
    `<button class="ghost-button" data-close-modal>Cancel</button><button class="primary-button" data-confirm-approve="${esc(id)}">${applyText}</button>`
  );
  document.querySelector('[data-confirm-approve]')?.addEventListener('click',()=>approveRecommendation(id));
}

function approveRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id && r.org===state.selectedOrg); if(!rec)return;
  const changed = applyRecommendation(rec);
  rec.status='Approved';
  rec.decidedAt=now();
  rec.decisionNote = changed ? 'Approved and applied to the local demo state.' : 'Approved for follow-up; no direct state mutation was defined.';
  state.audit.unshift({at:rec.decidedAt,actor:actor().name,action:'Approved recommendation',entity:rec.id,detail:rec.title,org:state.selectedOrg});
  closeModal();
  refreshDerived();
  toast(changed ? `${rec.id} approved and applied in the demo.` : `${rec.id} approved and recorded.`);
  render();
}

function rejectRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id && r.org===state.selectedOrg); if(!rec)return;
  rec.status='Rejected';
  rec.decidedAt=now();
  rec.decisionNote='Rejected by the current manager.';
  state.audit.unshift({at:rec.decidedAt,actor:actor().name,action:'Rejected recommendation',entity:rec.id,detail:rec.title,org:state.selectedOrg});
  refreshDerived();
  toast(`${rec.id} rejected and retained in decision history.`);
  render();
}

function openModal(eyebrow,title,body,actions){
  const backdrop=document.getElementById('modalBackdrop');
  document.getElementById('modalEyebrow').textContent=eyebrow;
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalActions').innerHTML=actions;
  backdrop.hidden=false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>document.getElementById('closeModal')?.focus());
  document.querySelectorAll('[data-close-modal]').forEach(e=>e.addEventListener('click',closeModal));
}

function closeModal(){
  const backdrop=document.getElementById('modalBackdrop');
  backdrop.hidden=true;
  document.body.classList.remove('modal-open');
  lastFocusedElement?.focus?.();
  lastFocusedElement=null;
}
function closeSidebar(){ document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('sidebarScrim')?.classList.remove('show'); }
function toggleSidebar(){ document.getElementById('sidebar')?.classList.toggle('open'); document.getElementById('sidebarScrim')?.classList.toggle('show'); }
function downloadCsv(data,name){ const blob=new Blob([data],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500); toast('CSV exported.'); }

function bindViewEvents() {
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  document.querySelectorAll('[data-conflict-filter]').forEach(el=>el.addEventListener('click',()=>{activeConflictFilter=el.dataset.conflictFilter;render();}));
  document.querySelectorAll('[data-rec-tab]').forEach(el=>el.addEventListener('click',()=>{recommendationTab=el.dataset.recTab;render();}));
  document.querySelectorAll('[data-task]').forEach(el=>el.addEventListener('click',()=>{const t=state.tasks.find(x=>x.id===el.dataset.task); if(!t)return; const hasConflict=state.conflicts.some(c=>c.status==='Open'&&c.explanation.includes(t.name)); openModal('Task details', t.name, `<div class="card-sub">${esc(t.location)} · ${timeRange(t)}</div><div class="alert-list"><div class="alert ${hasConflict?'':'warning'}"><div class="alert-title">${hasConflict?'Conflict detected':'No direct conflict detected'}</div><div class="alert-copy">The planner requires an explicit approval before any recommendation changes this task.</div></div></div>`, `<button class="ghost-button" data-close-modal>Close</button>`);}));
  document.querySelectorAll('[data-conflict-id]').forEach(el=>el.addEventListener('click',()=>{const c=state.conflicts.find(x=>x.id===el.dataset.conflictId); if(c) openModal('Conflict explanation', c.title, `<div class="pill ${c.severity==='Critical'?'pill-danger':c.severity==='High'?'pill-warning':'pill-neutral'}">${esc(c.severity)}</div><p style="line-height:1.7;font-size:13px">${esc(c.explanation)}</p><div class="kpi-strip"><div class="kpi-mini"><label>Type</label><strong style="font-size:12px">${esc(c.type)}</strong></div><div class="kpi-mini"><label>Affected</label><strong style="font-size:12px">${esc(c.affectedResources.join(', ') || 'Projects only')}</strong></div><div class="kpi-mini"><label>Detected</label><strong style="font-size:12px">${esc(c.detectedAt)}</strong></div></div>`, `<button class="ghost-button" data-close-modal>Close</button>`)}));
  document.querySelectorAll('[data-approve]').forEach(el=>el.addEventListener('click',()=>reviewRecommendation(el.dataset.approve)));
  document.querySelectorAll('[data-reject]').forEach(el=>el.addEventListener('click',()=>rejectRecommendation(el.dataset.reject)));
  document.getElementById('rerunEngine')?.addEventListener('click',()=>{reconcileDerived(state);persist();toast('Conflict engine re-run complete.');render();});
  document.getElementById('exportReport')?.addEventListener('click',()=>downloadCsv(csv(projectCostReport(state,state.selectedOrg)),'nordflow-project-cost.csv'));
  document.getElementById('demoProject')?.addEventListener('click',()=>{ const id=`p-${Date.now()}`; state.projects.push({id,org:state.selectedOrg,name:'Lofoten Field Optimisation Pilot',client:'Demo client',priority:'Medium',status:'Planned',deadline:'2026-11-14',budget:120000,spent:0,health:100}); state.audit.unshift({at:now(),actor:actor().name,action:'Created project',entity:id,detail:'Created Lofoten Field Optimisation Pilot',org:state.selectedOrg}); refreshDerived(); toast('Demo project created.'); render(); });
}

const orgSelect=document.getElementById('orgSelect');
orgSelect.innerHTML=state.organizations.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('');
orgSelect.value=state.selectedOrg;
orgSelect.addEventListener('change',()=>{state.selectedOrg=orgSelect.value;activeConflictFilter='All';recommendationTab='pending';refreshDerived();toast(`Switched to ${org().name}`);setView(currentView);});
document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
document.getElementById('mobileMenu').addEventListener('click',toggleSidebar);
document.getElementById('sidebarScrim').addEventListener('click',closeSidebar);
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
document.getElementById('resetDemo').addEventListener('click',()=>{localStorage.removeItem(STORE_KEY);state=loadState();orgSelect.value=state.selectedOrg;activeConflictFilter='All';recommendationTab='pending';toast('Demo reset.');setView('dashboard');});
document.getElementById('exportCsv').addEventListener('click',()=>downloadCsv(csv(utilizationReport(state,state.selectedOrg)),'nordflow-utilization.csv'));
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const modal=document.getElementById('modalBackdrop'); if(modal && !modal.hidden) closeModal(); else closeSidebar(); } });

refreshDerived();
setActorUI();
render();
