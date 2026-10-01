import assert from 'node:assert/strict';
import { baseState } from '../assets/js/data.js';
import { detectConflicts, buildRecommendations } from '../assets/js/engine.js';

const state = structuredClone(baseState);
state.selectedOrg = 'fjordkraft';
const conflicts = detectConflicts(state, state.selectedOrg);

assert(conflicts.some(c => c.type === 'Employee schedule'), 'Expected employee schedule conflict');
assert(conflicts.some(c => c.type === 'Equipment conflict'), 'Expected equipment conflict');
assert(conflicts.some(c => c.type === 'Skill/certification'), 'Expected skill conflict');
assert(conflicts.some(c => c.type === 'Availability'), 'Expected availability conflict');
assert(conflicts.some(c => c.type === 'Project deadline risk'), 'Expected project deadline risk');
assert(conflicts.some(c => c.type === 'Resource over-utilization'), 'Expected utilization conflict');
assert(conflicts.every(c => c.affectedProjects.every(projectId => state.projects.find(p => p.id === projectId)?.org === state.selectedOrg)), 'Conflicts must remain tenant scoped');

const recs = buildRecommendations(state, conflicts);
assert(recs.length > 0, 'Expected recommendations');
assert(recs.every(r => r.status === 'Pending'), 'Recommendations must begin pending');
assert(recs.every(r => r.reason && r.impact), 'Recommendations should be explainable');
assert(recs.every(r => r.org === state.selectedOrg), 'Recommendations must be tenant scoped');
assert(recs.some(r => r.action?.type === 'reassignEmployee'), 'Expected a concrete reassignment action');
assert(recs.some(r => r.action?.type === 'moveTask'), 'Expected a concrete schedule-move action');
assert(new Set(recs.map(r => r.id)).size === recs.length, 'Recommendation IDs must be unique');

const isolated = structuredClone(baseState);
isolated.selectedOrg = 'fjordkraft';
isolated.resources.push({ id:'nord-high', org:'nordbygg', kind:'Employee', name:'Nordbygg High Load', team:'Operations', location:'Trondheim', utilization:99, costRate:800, status:'Overloaded' });
const isolatedConflicts = detectConflicts(isolated, 'fjordkraft');
assert(!isolatedConflicts.some(c => c.id === 'C-UTIL-nord-high'), 'High utilization from another tenant must not leak into this workspace');

const zeroBudget = structuredClone(baseState);
zeroBudget.projects = [{ id:'zero', org:'fjordkraft', name:'Zero Budget Demo', client:'Demo', priority:'Low', status:'Planned', deadline:'2026-11-20', budget:0, spent:0, health:100 }];
assert.doesNotThrow(() => detectConflicts(zeroBudget, 'fjordkraft'), 'Zero-budget projects must not crash conflict detection');

console.log(`NordFlow engine tests passed: ${conflicts.length} conflicts, ${recs.length} recommendations.`);
