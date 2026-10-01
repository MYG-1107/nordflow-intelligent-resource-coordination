import { currency } from './engine.js';

export function utilizationReport(state, orgId) {
  const resources = state.resources.filter(r => r.kind === 'Employee' && state.users.find(u => u.id === r.id)?.org === orgId);
  return resources.map(r => ({ resource:r.name, team:r.team, utilization:r.utilization, costRate:currency(r.costRate), status:r.status }));
}

export function projectCostReport(state, orgId) {
  return state.projects.filter(p => p.org === orgId).map(p => ({ project:p.name, budget:currency(p.budget), spent:currency(p.spent), remaining:currency(p.budget-p.spent), health:p.health }));
}

export function conflictSummary(state, orgId) {
  const conflicts = state.conflicts.filter(c => state.projects.some(p => p.org === orgId && c.affectedProjects.includes(p.id)) || c.affectedProjects.length === 0);
  const counts = {};
  for (const c of conflicts) counts[c.type] = (counts[c.type] || 0) + 1;
  return Object.entries(counts).map(([type,count]) => ({type,count}));
}

export function csv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  return lines.join('\n');
}
