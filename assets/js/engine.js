function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function hours(start, end) {
  return (new Date(end) - new Date(start)) / 3600000;
}

function resourceOrg(state, resource) {
  return resource.org || state.users.find(u => u.id === resource.id)?.org || null;
}

function timeRangeObj(x) {
  return `${new Date(x.start).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}–${new Date(x.end).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
}

export function detectConflicts(state, orgId) {
  const tasks = state.tasks.filter(t => state.projects.find(p => p.id === t.project)?.org === orgId);
  const taskIds = new Set(tasks.map(t => t.id));
  const assignments = state.assignments.filter(a => a.org === orgId && taskIds.has(a.task));
  const out = [];

  const push = (id, type, severity, title, explanation, affectedResources, affectedProjects, timePeriod) => {
    out.push({ id, type, severity, title, explanation, affectedResources, affectedProjects, timePeriod, status:'Open', detectedAt:'2026-10-01 15:00' });
  };

  const employeeTasks = new Map();
  for (const a of assignments) {
    const t = state.tasks.find(x => x.id === a.task);
    if (!t) continue;
    const arr = employeeTasks.get(a.employee) || [];
    arr.push(t);
    employeeTasks.set(a.employee, arr);
  }

  for (const [employeeId, employeeTaskList] of employeeTasks) {
    for (let i = 0; i < employeeTaskList.length; i++) {
      for (let j = i + 1; j < employeeTaskList.length; j++) {
        const a = employeeTaskList[i], b = employeeTaskList[j];
        if (overlaps(a.start, a.end, b.start, b.end)) {
          const person = state.users.find(u => u.id === employeeId);
          push(`C-SCH-${a.id}-${b.id}`, 'Employee schedule', 'Critical', `${person?.name || employeeId} has overlapping assignments`, `${person?.name || employeeId} is assigned to ${a.name} (${timeRange(a)}) and ${b.name} (${timeRange(b)}), so the same capacity is committed twice.`, [person?.name || employeeId], [a.project, b.project], `${a.start} → ${a.end}`);
        }
      }
    }
  }

  for (const a of assignments) {
    const task = state.tasks.find(t => t.id === a.task);
    const project = state.projects.find(p => p.id === task?.project);
    if (!task || !project) continue;
    const skills = state.employeeSkills.filter(es => es.employee === a.employee);
    if (!skills.some(es => es.skill === task.requiredSkill)) {
      const person = state.users.find(u => u.id === a.employee);
      const skill = state.skills.find(s => s.id === task.requiredSkill);
      push(`C-SKILL-${a.id}`, 'Skill/certification', 'High', `Skill gap on ${task.name}`, `${person?.name || a.employee} is assigned to a task requiring ${skill?.name || task.requiredSkill}, but no matching skill is recorded for this employee.`, [person?.name || a.employee], [project.id], `${task.start} → ${task.end}`);
    }
  }

  for (const a of assignments) {
    const task = state.tasks.find(t => t.id === a.task);
    const day = task?.start?.slice(0,10);
    if (!task || !day) continue;
    const record = state.availability.find(v => v.resource === a.employee && v.date === day && !v.available);
    if (record) {
      const person = state.users.find(u => u.id === a.employee);
      push(`C-AVL-${a.id}`, 'Availability', 'High', `${person?.name || a.employee} is unavailable`, `${person?.name || a.employee} has an unavailable window on ${day}: ${record.reason}. The current task overlaps that constraint.`, [person?.name || a.employee], [task.project], `${task.start} → ${task.end}`);
    }
  }

  const dailyHours = new Map();
  for (const a of assignments) {
    const task = state.tasks.find(t => t.id === a.task);
    if (!task) continue;
    const key = `${a.employee}|${task.start.slice(0,10)}`;
    dailyHours.set(key, (dailyHours.get(key) || 0) + hours(task.start, task.end));
  }
  for (const [key, total] of dailyHours) {
    if (total > state.workPolicy.dailyAlert) {
      const [employeeId, day] = key.split('|');
      const person = state.users.find(u => u.id === employeeId);
      push(`C-WH-${employeeId}-${day}`, 'Working-hour policy', 'High', `${person?.name || employeeId} exceeds the daily alert`, `${person?.name || employeeId} has ${total.toFixed(1)} planned hours on ${day}, above the configured ${state.workPolicy.dailyAlert}-hour alert threshold.`, [person?.name || employeeId], [], day);
    }
  }

  const equipmentGroups = new Map();
  for (const ea of state.equipmentAssignments) {
    const eq = state.resources.find(r => r.id === ea.equipment && r.kind === 'Equipment');
    const task = state.tasks.find(t => t.id === ea.task);
    if (!eq || !task || resourceOrg(state, eq) !== orgId || !taskIds.has(task.id)) continue;
    const arr = equipmentGroups.get(eq.id) || [];
    arr.push({ ...ea, task });
    equipmentGroups.set(eq.id, arr);
  }
  for (const [eqId, items] of equipmentGroups) {
    for (let i=0;i<items.length;i++) for (let j=i+1;j<items.length;j++) {
      if (overlaps(items[i].start, items[i].end, items[j].start, items[j].end)) {
        const eq = state.resources.find(r => r.id === eqId);
        push(`C-EQ-${items[i].id}-${items[j].id}`, 'Equipment conflict', 'Critical', `${eq.name} is double-booked`, `${eq.name} is allocated to ${items[i].task.name} and ${items[j].task.name} during overlapping windows.`, [eq.name], [items[i].task.project, items[j].task.project], `${items[i].start} → ${items[i].end}`);
      }
    }
  }

  for (const maintenance of (state.maintenancePeriods || [])) {
    const eq = state.resources.find(r => r.id === maintenance.equipment && r.kind === 'Equipment');
    if (!eq || resourceOrg(state, eq) !== orgId) continue;
    const items = equipmentGroups.get(eq.id) || [];
    for (const item of items) {
      if (overlaps(item.start, item.end, maintenance.start, maintenance.end)) {
        push(`C-MAINT-${item.id}`, 'Maintenance conflict', 'High', `${eq.name} is allocated during maintenance`, `${eq.name} is scheduled for ${item.task.name} while its maintenance window is ${timeRangeObj(maintenance)}.`, [eq.name], [item.task.project], `${maintenance.start} → ${maintenance.end}`);
      }
    }
  }

  for (const project of state.projects.filter(p => p.org === orgId)) {
    if (project.status === 'At risk' || project.health < 70) {
      push(`C-DEAD-${project.id}`, 'Project deadline risk', 'Medium', `${project.name} is approaching a delivery risk`, `Project health is ${project.health}% and the deadline is ${formatDate(project.deadline)}. Resource constraints should be reviewed before the next planning cycle.`, [], [project.id], project.deadline);
    }
    if (project.budget > 0 && project.spent / project.budget > .8) {
      push(`C-BUD-${project.id}`, 'Budget warning', 'Medium', `${project.name} is above 80% budget consumption`, `${currency(project.spent)} of ${currency(project.budget)} has been consumed (${Math.round(project.spent/project.budget*100)}%).`, [], [project.id], project.deadline);
    }
  }

  for (const r of state.resources.filter(r => r.kind === 'Employee' && resourceOrg(state, r) === orgId && r.utilization >= 90)) {
    push(`C-UTIL-${r.id}`, 'Resource over-utilization', r.utilization >= 95 ? 'Critical' : 'High', `${r.name} is at ${r.utilization}% utilization`, `${r.name}'s planned utilization is above the configured alert threshold. Review assignments before adding more work.`, [r.name], [], 'Current planning horizon');
  }

  return dedupe(out);
}

function candidateAvailable(state, candidate, task) {
  if (!candidate || !task) return false;
  const hasSkill = state.employeeSkills.some(es => es.employee === candidate.id && es.skill === task.requiredSkill);
  if (!hasSkill) return false;
  const day = task.start.slice(0,10);
  if (state.availability.some(v => v.resource === candidate.id && v.date === day && !v.available)) return false;
  const candidateAssignments = state.assignments.filter(a => a.org === state.selectedOrg && a.employee === candidate.id);
  return candidateAssignments.every(a => {
    const other = state.tasks.find(t => t.id === a.task);
    return !other || !overlaps(task.start, task.end, other.start, other.end);
  });
}

function nextWorkingDay(iso, days=1) {
  const date = new Date(`${iso}T12:00:00`);
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return date.toISOString().slice(0,10);
}

export function buildRecommendations(state, conflicts) {
  const active = conflicts.filter(c => c.status === 'Open');
  const recs = [];

  for (const c of active) {
    if (c.type === 'Employee schedule') {
      const [personName] = c.affectedResources;
      const employee = state.users.find(u => u.name === personName);
      const taskIds = extractTaskIds(c.id);
      const tasks = taskIds.map(id => state.tasks.find(t => t.id === id)).filter(Boolean);
      const secondary = tasks[1];
      const candidates = state.users.filter(u => u.org === state.selectedOrg && u.role === 'Employee' && u.id !== employee?.id);
      const candidate = candidates.find(u => candidateAvailable(state, u, secondary));
      if (candidate && secondary) {
        recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:`Assign ${candidate.name} to the secondary task`, reason:`${candidate.name} has the required skill and no overlapping task or unavailable window in this demo dataset.`, impact:'Removes the employee overlap without changing the task deadline.', affected:[candidate.name, secondary.name], satisfied:['Unique employee allocation','Required skill'], violated:[], action:{type:'reassignEmployee',taskId:secondary.id,employeeId:candidate.id}, status:'Pending' });
      }
      if (secondary) {
        recs.push({ id:`REC-${c.id}-B`, org:state.selectedOrg, conflictId:c.id, title:'Move the secondary task to the next working day', reason:'Shift the lower-priority task so the current employee is no longer double-booked.', impact:'Preserves the employee allocation but changes timing.', affected:[secondary.name], satisfied:['Unique employee allocation'], violated:['Original task timing'], action:{type:'moveTask',taskId:secondary.id,days:1}, status:'Pending' });
      }
    } else if (c.type === 'Equipment conflict') {
      const ids = c.id.replace('C-EQ-','').split('-');
      const secondId = ids[1];
      if (secondId) recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:'Move the second equipment allocation to the next working day', reason:'Keep the equipment on one site at a time while preserving the task itself.', impact:'Prevents a physical double-booking and shifts the equipment window.', affected:c.affectedResources, satisfied:['Single-site equipment use'], violated:['Original timing'], action:{type:'moveEquipmentAssignment',equipmentAssignmentId:secondId,days:1}, status:'Pending' });
    } else if (c.type === 'Skill/certification') {
      const assignmentId = c.id.replace('C-SKILL-','');
      const assignment = state.assignments.find(a=>a.id===assignmentId);
      const task = state.tasks.find(t=>t.id===assignment?.task);
      const candidates = state.users.filter(u => u.org === state.selectedOrg && u.role === 'Employee' && u.id !== assignment?.employee);
      const candidate = candidates.find(u => candidateAvailable(state, u, task));
      if (candidate && assignment && task) recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:`Reassign ${task.name} to ${candidate.name}`, reason:`${candidate.name} has a matching skill record and a clear planning window in the demo data.`, impact:'Removes the skill-gap warning without an override.', affected:[candidate.name, task.name], satisfied:['Required skill'], violated:[], action:{type:'reassignEmployee',taskId:task.id,employeeId:candidate.id}, status:'Pending' });
    } else if (c.type === 'Availability') {
      const assignmentId = c.id.replace('C-AVL-','');
      const assignment = state.assignments.find(a=>a.id===assignmentId);
      const task = state.tasks.find(t=>t.id===assignment?.task);
      if (task) recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:'Move the task outside the unavailable window', reason:'The current resource is marked unavailable for the task day.', impact:'Keeps the same resource and avoids the documented availability violation.', affected:c.affectedResources, satisfied:['Availability'], violated:['Original timing'], action:{type:'moveTask',taskId:task.id,days:1}, status:'Pending' });
    } else if (c.type === 'Maintenance conflict') {
      const assignmentId = c.id.replace('C-MAINT-','');
      if (assignmentId) recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:'Move the equipment allocation after maintenance', reason:'Shift the equipment booking so it no longer overlaps the maintenance window.', impact:'Preserves the task but changes equipment timing.', affected:c.affectedResources, satisfied:['Maintenance window respected'], violated:['Original timing'], action:{type:'moveEquipmentAssignment',equipmentAssignmentId:assignmentId,days:1}, status:'Pending' });
    } else if (c.type === 'Resource over-utilization') {
      const candidate = state.users.find(u => u.org === state.selectedOrg && u.role === 'Employee' && state.resources.find(r => r.id === u.id)?.utilization < 75);
      if (candidate) recs.push({ id:`REC-${c.id}-A`, org:state.selectedOrg, conflictId:c.id, title:`Review spare capacity on ${candidate.name}`, reason:`${candidate.name} is currently below the high-load threshold and can be assessed for reassignment.`, impact:'Potentially reduces the overloaded employee’s planned utilization.', affected:[candidate.name, c.affectedResources[0]], satisfied:['Capacity balance'], violated:['Potential team continuity'], action:null, status:'Pending' });
    }
  }
  return recs;
}

export function formatDate(iso) { return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${iso}T00:00`)); }
export function timeRange(task) { return `${new Date(task.start).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}–${new Date(task.end).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`; }
export function currency(value) { return new Intl.NumberFormat('nb-NO', { style:'currency', currency:'NOK', maximumFractionDigits:0 }).format(value); }
export function extractTaskIds(id) { return id.replace('C-SCH-','').split('-').reduce((acc,v,i,arr) => { if (i % 2 === 0 && i+1 < arr.length) acc.push(`${v}-${arr[i+1]}`); return acc; }, []); }
function dedupe(items) { return [...new Map(items.map(x => [x.id, x])).values()]; }
