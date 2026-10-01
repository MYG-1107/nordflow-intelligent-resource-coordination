import { baseState } from './data.js';
import { detectConflicts, buildRecommendations, formatDate, timeRange, currency } from './engine.js';
import { utilizationReport, projectCostReport, conflictSummary, csv } from './reports.js';

const STORE_KEY = 'nordflow-demo-v1';
const clone = x => JSON.parse(JSON.stringify(x));
let state = loadState();
let currentView = 'dashboard';
let activeConflictFilter = 'All';

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  const current = saved ? JSON.parse(saved) : clone(baseState);
  current.conflicts = detectConflicts(current, current.selectedOrg);
  current.recommendations = buildRecommendations(current, current.conflicts);
  return current;
}
function persist() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function org() { return state.organizations.find(o => o.id === state.selectedOrg); }
function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const labels = { dashboard:'Dashboard', planner:'Planner', projects:'Projects', resources:'Resources', conflicts:'Conflicts', recommendations:'Recommendations', reports:'Reports', audit:'Audit trail', settings:'Settings' };
  document.getElementById('currentViewLabel').textContent = labels[view] || view;
  document.getElementById('pageTitle').textContent = `${org()?.name || 'NordFlow'} · ${labels[view] || view}`;
  render();
  document.getElementById('sidebar')?.classList.remove('open');
}
function refreshDerived() {
  state.conflicts = detectConflicts(state, state.selectedOrg);
  state.recommendations = buildRecommendations(state, state.conflicts);
  persist();
  updateCounts();
}
function updateCounts() {
  document.getElementById('navConflictCount').textContent = state.conflicts.filter(c => c.status === 'Open').length;
  document.getElementById('navRecommendationCount').textContent = state.recommendations.filter(r => r.status === 'Pending').length;
}
function toast(message) {
  const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400);
}
function esc(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

function render() {
  const mount = document.getElementById('appView');
  const views = { dashboard:renderDashboard, planner:renderPlanner, projects:renderProjects, resources:renderResources, conflicts:renderConflicts, recommendations:renderRecommendations, reports:renderReports, audit:renderAudit, settings:renderSettings };
  mount.innerHTML = (views[currentView] || renderDashboard)();
  bindViewEvents();
  updateCounts();
}

function renderDashboard() {
  const projects = state.projects.filter(p => p.org === state.selectedOrg);
  const conflicts = state.conflicts.filter(c => c.status === 'Open');
  const resources = state.resources.filter(r => r.kind === 'Employee' && state.users.some(u => u.id === r.id && u.org === state.selectedOrg));
  const avgUtil = Math.round(resources.reduce((s,r)=>s+r.utilization,0)/Math.max(resources.length,1));
  const budget = projects.reduce((s,p)=>s+p.budget,0), spent = projects.reduce((s,p)=>s+p.spent,0);
  const deadlineProjects = [...projects].sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,4);
  return `
    <div class="view-head"><div><div class="eyebrow">Operations overview</div><h2>Good afternoon, Kari</h2><p>See where delivery capacity is tight, which projects need attention, and what the coordination engine suggests next.</p></div><div class="view-actions"><button class="ghost-button" data-view="planner">Open planner</button><button class="primary-button" data-view="conflicts">Review ${conflicts.length} conflicts</button></div></div>
    <div class="grid grid-4">
      ${metric('Active projects', projects.length, 'Live portfolio scope')}
      ${metric('Open conflicts', conflicts.length, conflicts.filter(c=>c.severity==='Critical').length + ' critical', true)}
      ${metric('Avg. utilization', avgUtil + '%', 'People in selected workspace')}
      ${metric('Budget consumed', Math.round(spent/budget*100) + '%', `${currency(spent)} of ${currency(budget)}`)}
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <section class="card card-pad"><div class="card-title">Capacity by team</div><div class="card-sub">Current planned utilization</div>
        ${['Delivery','Automation','Field'].map(team=>{ const teamRes=resources.filter(r=>r.team===team); const val=teamRes.length?Math.round(teamRes.reduce((s,r)=>s+r.utilization,0)/teamRes.length):0; return `<div class="bar-row"><div class="bar-label">${team}</div><div class="bar-track"><div class="bar-fill" style="width:${val}%"></div></div><div class="bar-value">${val}%</div></div>`;}).join('')}
        <div class="footer-note">High-load resources are surfaced separately so managers can rebalance before assigning new work.</div>
      </section>
      <section class="card card-pad"><div class="card-title">Attention queue</div><div class="card-sub">Explainable issues from the deterministic engine</div>
        <div class="alert-list">${conflicts.slice(0,4).map(c=>`<div class="alert ${c.severity==='Medium'?'warning':''}"><div class="alert-title">${esc(c.title)}</div><div class="alert-copy">${esc(c.explanation)}</div></div>`).join('') || '<div class="empty"><strong>All clear</strong>No unresolved conflicts in this workspace.</div>'}</div>
      </section>
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <section class="card card-pad"><div class="card-title">Upcoming deadlines</div><div class="timeline">${deadlineProjects.map(p=>`<div class="timeline-row"><div class="timeline-time">${formatDate(p.deadline)}</div><div class="timeline-main"><strong>${esc(p.name)}</strong><div class="timeline-meta">${esc(p.client)} · <span class="pill ${p.status==='At risk'?'pill-danger':'pill-success'}">${esc(p.status)}</span></div></div></div>`).join('')}</div></section>
      <section class="card card-pad"><div class="card-title">Budget posture</div><div class="card-sub">Portfolio view in NOK</div><div class="metric-value" style="font-size:24px">${currency(spent)}</div><div class="card-sub">${currency(budget-spent)} remaining</div><div class="bar-track" style="margin-top:14px;height:10px"><div class="bar-fill" style="width:${Math.min(100,spent/budget*100)}%"></div></div><div class="kpi-strip"><div class="kpi-mini"><label>Spend</label><strong>${Math.round(spent/budget*100)}%</strong></div><div class="kpi-mini"><label>At risk</label><strong>${projects.filter(p=>p.status==='At risk').length}</strong></div><div class="kpi-mini"><label>Priority</label><strong>${projects.filter(p=>p.priority==='High').length}</strong></div></div></section>
    </div>`;
}

function metric(label,value,sub,alert=false){ return `<section class="card metric"><div class="metric-top"><span class="metric-label">${label}</span>${alert?'<span class="metric-trend" style="background:#fef2f2;color:#b91c1c">Needs review</span>':''}</div><div class="metric-value">${value}</div><div class="card-sub">${sub}</div></section>`; }

function renderPlanner() {
  const employees = state.resources.filter(r=>r.kind==='Employee' && state.users.some(u=>u.id===r.id && u.org===state.selectedOrg));
  const days = ['14 Oct','15 Oct','16 Oct','19 Oct','20 Oct'];
  const dayIso = ['2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20'];
  const taskFor = (employeeId, date) => state.assignments.filter(a=>a.employee===employeeId).map(a=>state.tasks.find(t=>t.id===a.task)).filter(Boolean).filter(t=>t.start.slice(0,10)===date);
  return `<div class="view-head"><div><div class="eyebrow">Capacity planning</div><h2>Planner</h2><p>Inspect task coverage by resource. Red items are conflicts detected by the rules engine; no schedule is changed automatically.</p></div><div class="filters"><button class="filter active">All resources</button><button class="filter">High load</button><button class="filter">Conflicts</button></div></div>
  <section class="card card-pad plan-board"><div class="plan-grid"><div class="plan-header">Resource</div>${days.map(d=>`<div class="plan-header">${d}</div>`).join('')}${employees.map(r=>`<div class="plan-resource">${esc(r.name)}<div style="font-size:10px;color:#64748b;margin-top:4px">${r.utilization}% planned</div></div>${dayIso.map(day=>`<div class="slot">${taskFor(r.id,day).map(t=>{const conflict=state.conflicts.some(c=>c.status==='Open'&&c.explanation.includes(t.name));return `<button class="assignment-chip ${conflict?'conflict':''}" data-task="${t.id}">${esc(t.name)}<small>${timeRange(t)} · ${esc(t.location)}</small></button>`}).join('')}</div>`).join('')}`).join('')}</div></section>`;
}

function renderProjects() {
  const projects = state.projects.filter(p=>p.org===state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">Delivery portfolio</div><h2>Projects</h2><p>Project health, deadlines, budget consumption and delivery priority for the selected organization.</p></div><button class="primary-button" id="demoProject">Create demo project</button></div>
  <section class="card table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Budget</th><th>Health</th></tr></thead><tbody>${projects.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.client)}</td><td><span class="pill ${p.status==='At risk'?'pill-danger':p.status==='On track'?'pill-success':'pill-neutral'}">${esc(p.status)}</span></td><td>${esc(p.priority)}</td><td>${formatDate(p.deadline)}</td><td>${currency(p.spent)} / ${currency(p.budget)}</td><td><div style="width:120px"><div class="bar-track"><div class="bar-fill" style="width:${p.health}%"></div></div><div style="font-size:10px;color:#64748b;margin-top:4px">${p.health}%</div></div></td></tr>`).join('')}</tbody></table></section>`;
}

function renderResources() {
  const resources = state.resources.filter(r=>state.users.some(u=>u.id===r.id && u.org===state.selectedOrg) || (r.kind==='Equipment' && state.projects.some(p=>p.org===state.selectedOrg)));
  return `<div class="view-head"><div><div class="eyebrow">People & equipment</div><h2>Resources</h2><p>Use skill, location, capacity and utilization data together before committing a new assignment.</p></div></div>
  <section class="card table-wrap"><table><thead><tr><th>Resource</th><th>Type</th><th>Team</th><th>Location</th><th>Utilization</th><th>Rate</th><th>Status</th></tr></thead><tbody>${resources.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${r.kind}</td><td>${esc(r.team)}</td><td>${esc(r.location)}</td><td>${r.utilization}%</td><td>${currency(r.costRate)}/h</td><td><span class="pill ${r.status==='Available'?'pill-success':r.utilization>=90?'pill-danger':'pill-warning'}">${esc(r.status)}</span></td></tr>`).join('')}</tbody></table></section>`;
}

function renderConflicts() {
  const types = ['All', ...new Set(state.conflicts.map(c=>c.type))];
  const conflicts = state.conflicts.filter(c=>activeConflictFilter==='All'||c.type===activeConflictFilter);
  return `<div class="view-head"><div><div class="eyebrow">Rule engine</div><h2>Conflicts</h2><p>Every issue has a type, severity, affected entities, time period and plain-language explanation.</p></div><button class="ghost-button" id="rerunEngine">Run detection again</button></div>
  <div class="filters">${types.map(t=>`<button class="filter ${activeConflictFilter===t?'active':''}" data-conflict-filter="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  <section class="card table-wrap" style="margin-top:12px"><table><thead><tr><th>Severity</th><th>Conflict</th><th>Type</th><th>Explanation</th><th>Status</th><th></th></tr></thead><tbody>${conflicts.map(c=>`<tr><td><span class="pill ${c.severity==='Critical'?'pill-danger':c.severity==='High'?'pill-warning':'pill-neutral'}">${c.severity}</span></td><td><strong>${esc(c.title)}</strong><div class="card-sub">${esc(c.timePeriod)}</div></td><td>${esc(c.type)}</td><td style="white-space:normal;min-width:340px;max-width:500px">${esc(c.explanation)}</td><td>${c.status}</td><td><button class="ghost-button" data-conflict-id="${c.id}">Details</button></td></tr>`).join('') || `<tr><td colspan="6"><div class="empty"><strong>No conflicts for this filter</strong>Run detection again after changing the demo.</div></td></tr>`}</tbody></table></section>`;
}

function renderRecommendations() {
  const recs = state.recommendations.filter(r=>r.status==='Pending');
  return `<div class="view-head"><div><div class="eyebrow">Human approval required</div><h2>Recommendations</h2><p>The engine proposes changes; managers explicitly approve or reject them. Applying a recommendation creates an audit event.</p></div></div>
  <div class="grid grid-2">${recs.map(r=>`<article class="card card-pad"><div style="display:flex;justify-content:space-between;gap:10px"><span class="pill pill-neutral">${esc(r.id)}</span><span class="pill pill-warning">Pending</span></div><h3 style="font-size:15px;margin:13px 0 6px">${esc(r.title)}</h3><div class="card-sub">Why: ${esc(r.reason)}</div><div class="kpi-strip"><div class="kpi-mini"><label>Impact</label><strong style="font-size:12px">${esc(r.impact)}</strong></div><div class="kpi-mini"><label>Satisfies</label><strong style="font-size:12px">${esc(r.satisfied.join(', ')||'—')}</strong></div><div class="kpi-mini"><label>Trade-off</label><strong style="font-size:12px">${esc(r.violated.join(', ')||'None recorded')}</strong></div></div><div style="margin-top:13px"><div class="card-sub">Affected: ${esc(r.affected.join(' · '))}</div></div><div class="modal-actions" style="padding:14px 0 0;margin-top:8px;border:0"><button class="ghost-button" data-reject="${r.id}">Reject</button><button class="primary-button" data-approve="${r.id}">Review & approve</button></div></article>`).join('') || `<section class="card card-pad"><div class="empty"><strong>No pending recommendations</strong>The queue is clear for this organization.</div></section>`}</div>`;
}

function renderReports() {
  const util = utilizationReport(state,state.selectedOrg), cost = projectCostReport(state,state.selectedOrg), summary = conflictSummary(state,state.selectedOrg);
  return `<div class="view-head"><div><div class="eyebrow">Operational reporting</div><h2>Reports</h2><p>Lightweight reporting for utilization, project cost and unresolved conflict categories. Export is available as CSV.</p></div><button class="primary-button" id="exportReport">Export report CSV</button></div>
    <div class="grid grid-3"><section class="card card-pad"><div class="card-title">Utilization</div>${util.map(r=>`<div class="bar-row" style="grid-template-columns:105px minmax(0,1fr) 46px"><div class="bar-label">${esc(r.resource.split(' ')[0])}</div><div class="bar-track"><div class="bar-fill" style="width:${r.utilization}%"></div></div><div class="bar-value">${r.utilization}%</div></div>`).join('')}</section>
    <section class="card card-pad"><div class="card-title">Conflict categories</div>${summary.map(s=>`<div class="bar-row" style="grid-template-columns:125px minmax(0,1fr) 28px"><div class="bar-label">${esc(s.type)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,s.count*18)}%"></div></div><div class="bar-value">${s.count}</div></div>`).join('') || '<div class="empty">No active conflicts.</div>'}</section>
    <section class="card card-pad"><div class="card-title">Portfolio cost</div><div class="metric-value" style="font-size:24px">${currency(state.projects.filter(p=>p.org===state.selectedOrg).reduce((s,p)=>s+p.spent,0))}</div><div class="card-sub">Total spent in selected workspace.</div><div class="code-block">CSV export is generated locally in your browser. No data is uploaded by this demo.</div></section></div>
    <section class="card table-wrap" style="margin-top:16px"><table><thead><tr><th>Project</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Health</th></tr></thead><tbody>${cost.map(r=>`<tr><td><strong>${esc(r.project)}</strong></td><td>${r.budget}</td><td>${r.spent}</td><td>${r.remaining}</td><td>${r.health}%</td></tr>`).join('')}</tbody></table></section>`;
}

function renderAudit() {
  return `<div class="view-head"><div><div class="eyebrow">Immutable application history</div><h2>Audit trail</h2><p>Important changes are appended as events. This static demo does not expose an edit control for audit entries.</p></div></div><section class="card table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>${state.audit.map(a=>`<tr><td>${esc(a.at)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.entity)}</td><td>${esc(a.detail)}</td></tr>`).join('')}</tbody></table></section>`;
}

function renderSettings() {
  const p = state.workPolicy;
  return `<div class="view-head"><div><div class="eyebrow">Workspace policy</div><h2>Settings</h2><p>These values are product configuration, not legal advice. In a production deployment, policies should be configured and reviewed for the employer's actual employment agreements and applicable requirements.</p></div></div>
  <div class="grid grid-2"><section class="card card-pad"><div class="card-title">Working-hour policy</div><div class="card-sub">Current demo defaults for the selected organization</div><div class="kpi-strip"><div class="kpi-mini"><label>Weekly target</label><strong>${p.weeklyTarget} h</strong></div><div class="kpi-mini"><label>Daily alert</label><strong>${p.dailyAlert} h</strong></div><div class="kpi-mini"><label>Daily rest</label><strong>${p.minimumDailyRest} h</strong></div></div><div class="code-block">In production: persist organization-specific policies, collective-agreement overrides, exceptions and approval rules on the server.</div></section><section class="card card-pad"><div class="card-title">Security posture</div><div class="card-sub">Static demo boundary</div><div class="alert-list"><div class="alert"><div class="alert-title">Client-side demo only</div><div class="alert-copy">There is no server, database, secret store or authentication authority in this GitHub Pages package.</div></div><div class="alert warning"><div class="alert-title">Production extension</div><div class="alert-copy">Use the architecture documents in /docs as the blueprint for NestJS + PostgreSQL + Redis + background workers.</div></div></div></section></div>`;
}

function bindViewEvents() {
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  document.querySelectorAll('[data-conflict-filter]').forEach(el=>el.addEventListener('click',()=>{activeConflictFilter=el.dataset.conflictFilter;render();}));
  document.querySelectorAll('[data-task]').forEach(el=>el.addEventListener('click',()=>{const t=state.tasks.find(x=>x.id===el.dataset.task); openModal('Task details', t?.name || 'Task', `<div class="card-sub">${esc(t?.location || '')} · ${t ? timeRange(t):''}</div><div class="alert-list"><div class="alert ${state.conflicts.some(c=>c.explanation.includes(t.name))?'':'warning'}"><div class="alert-title">${state.conflicts.some(c=>c.explanation.includes(t.name))?'Conflict detected':'No direct conflict detected'}</div><div class="alert-copy">The planner never silently changes this assignment.</div></div></div>`, `<button class="ghost-button" data-close-modal>Close</button>`)}));
  document.querySelectorAll('[data-conflict-id]').forEach(el=>el.addEventListener('click',()=>{const c=state.conflicts.find(x=>x.id===el.dataset.conflictId); if(c) openModal('Conflict explanation', c.title, `<div class="pill ${c.severity==='Critical'?'pill-danger':c.severity==='High'?'pill-warning':'pill-neutral'}">${esc(c.severity)}</div><p style="line-height:1.7;font-size:13px">${esc(c.explanation)}</p><div class="kpi-strip"><div class="kpi-mini"><label>Type</label><strong style="font-size:12px">${esc(c.type)}</strong></div><div class="kpi-mini"><label>Affected</label><strong style="font-size:12px">${esc(c.affectedResources.join(', ') || 'Projects only')}</strong></div><div class="kpi-mini"><label>Detected</label><strong style="font-size:12px">${esc(c.detectedAt)}</strong></div></div>`, `<button class="ghost-button" data-close-modal>Close</button>`)}));
  document.querySelectorAll('[data-approve]').forEach(el=>el.addEventListener('click',()=>reviewRecommendation(el.dataset.approve)));
  document.querySelectorAll('[data-reject]').forEach(el=>el.addEventListener('click',()=>rejectRecommendation(el.dataset.reject)));
  document.getElementById('rerunEngine')?.addEventListener('click',()=>{refreshDerived();toast('Conflict engine re-run complete.');render();});
  document.getElementById('exportReport')?.addEventListener('click',()=>downloadCsv(csv(projectCostReport(state,state.selectedOrg)),'nordflow-project-cost.csv'));
  document.getElementById('demoProject')?.addEventListener('click',()=>{ state.projects.push({id:`p-${Date.now()}`,org:state.selectedOrg,name:'Lofoten Field Optimisation Pilot',client:'Demo client',priority:'Medium',status:'Planned',deadline:'2026-11-14',budget:120000,spent:0,health:100}); state.audit.unshift({at:now(),actor:'Kari Manager',action:'Created project',entity:'Demo',detail:'Created Lofoten Field Optimisation Pilot'}); refreshDerived(); toast('Demo project created.'); render(); });
}

function reviewRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id); if(!rec)return;
  openModal('Approval required', rec.title, `<p style="line-height:1.7;font-size:13px">${esc(rec.reason)}</p><div class="alert warning"><div class="alert-title">Estimated impact</div><div class="alert-copy">${esc(rec.impact)}</div></div><div class="card-sub" style="margin-top:11px">Affected: ${esc(rec.affected.join(' · '))}</div>`, `<button class="ghost-button" data-close-modal>Cancel</button><button class="primary-button" data-confirm-approve="${id}">Approve change</button>`);
  document.querySelector('[data-confirm-approve]')?.addEventListener('click',()=>approveRecommendation(id));
}
function approveRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id); if(!rec)return;
  rec.status='Approved';
  const conflict=state.conflicts.find(c=>c.id===rec.conflictId); if(conflict) conflict.status='Resolved';
  state.audit.unshift({at:now(),actor:'Kari Manager',action:'Approved recommendation',entity:rec.id,detail:rec.title});
  persist(); closeModal(); refreshDerived(); toast(`${rec.id} approved and recorded in audit trail.`); render();
}
function rejectRecommendation(id) {
  const rec=state.recommendations.find(r=>r.id===id); if(!rec)return;
  rec.status='Rejected'; state.audit.unshift({at:now(),actor:'Kari Manager',action:'Rejected recommendation',entity:rec.id,detail:rec.title}); persist(); toast(`${rec.id} rejected.`); refreshDerived(); render();
}
function now(){return new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(',','');}
function openModal(eyebrow,title,body,actions){document.getElementById('modalEyebrow').textContent=eyebrow;document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modalActions').innerHTML=actions;document.getElementById('modalBackdrop').hidden=false;document.querySelectorAll('[data-close-modal]').forEach(e=>e.addEventListener('click',closeModal));}
function closeModal(){document.getElementById('modalBackdrop').hidden=true;}
function downloadCsv(data,name){const blob=new Blob([data],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('CSV exported.');}

const orgSelect=document.getElementById('orgSelect');
orgSelect.innerHTML=state.organizations.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('');
orgSelect.value=state.selectedOrg;
orgSelect.addEventListener('change',()=>{state.selectedOrg=orgSelect.value;refreshDerived();toast(`Switched to ${org().name}`);setView(currentView);});
document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
document.getElementById('resetDemo').addEventListener('click',()=>{localStorage.removeItem(STORE_KEY);state=loadState();orgSelect.value=state.selectedOrg;toast('Demo reset.');render();});
document.getElementById('exportCsv').addEventListener('click',()=>downloadCsv(csv(utilizationReport(state,state.selectedOrg)),'nordflow-utilization.csv'));
refreshDerived();
render();
