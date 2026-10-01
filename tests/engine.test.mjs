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

const recs = buildRecommendations(state, conflicts);
assert(recs.length > 0, 'Expected recommendations');
assert(recs.every(r => r.status === 'Pending'), 'Recommendations must begin pending');
assert(recs.every(r => r.reason && r.impact), 'Recommendations should be explainable');

console.log(`NordFlow engine tests passed: ${conflicts.length} conflicts, ${recs.length} recommendations.`);
