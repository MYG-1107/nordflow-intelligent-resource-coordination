export const baseState = {
  selectedOrg: 'fjordkraft',
  organizations: [
    { id: 'fjordkraft', name: 'Fjordkraft Engineering', location: 'Oslo · Bergen · Stavanger', focus: 'Engineering & field delivery' },
    { id: 'nordbygg', name: 'Nordbygg AS', location: 'Trondheim · Bodø', focus: 'Construction operations' },
    { id: 'polaris', name: 'Polaris Field Services', location: 'Bergen · Tromsø', focus: 'Industrial maintenance' }
  ],
  users: [
    { id: 'u1', name: 'Kari Manager', role: 'Manager', org: 'fjordkraft', team: 'Delivery' },
    { id: 'u2', name: 'Sarah Nilsen', role: 'Employee', org: 'fjordkraft', team: 'Delivery' },
    { id: 'u3', name: 'David Hansen', role: 'Employee', org: 'fjordkraft', team: 'Automation' },
    { id: 'u4', name: 'Mina Solberg', role: 'Project Manager', org: 'fjordkraft', team: 'Delivery' },
    { id: 'u5', name: 'Ola Berg', role: 'Employee', org: 'fjordkraft', team: 'Field' },
    { id: 'u6', name: 'Erik Lund', role: 'Employee', org: 'fjordkraft', team: 'Field' },
    { id: 'u7', name: 'Admin Demo', role: 'Administrator', org: 'nordbygg', team: 'Operations' },
    { id: 'u8', name: 'Ingrid Moe', role: 'Employee', org: 'nordbygg', team: 'Site' }
  ],
  teams: [
    { id:'t1', org:'fjordkraft', name:'Delivery' }, { id:'t2', org:'fjordkraft', name:'Automation' }, { id:'t3', org:'fjordkraft', name:'Field' },
    { id:'t4', org:'nordbygg', name:'Operations' }, { id:'t5', org:'polaris', name:'Maintenance' }
  ],
  skills: [
    { id:'s1', name:'Electrical engineering', category:'Engineering' },
    { id:'s2', name:'PLC / automation', category:'Automation' },
    { id:'s3', name:'HSE site induction', category:'Safety' },
    { id:'s4', name:'Working at height', category:'Safety' },
    { id:'s5', name:'Project controls', category:'Management' },
    { id:'s6', name:'Mechanical maintenance', category:'Maintenance' }
  ],
  employeeSkills: [
    { employee:'u2', skill:'s1', level:'Advanced', certification:'NEK-aligned training' },
    { employee:'u2', skill:'s3', level:'Advanced', certification:'Site induction' },
    { employee:'u2', skill:'s5', level:'Intermediate', certification:'' },
    { employee:'u3', skill:'s2', level:'Advanced', certification:'PLC certification' },
    { employee:'u3', skill:'s3', level:'Advanced', certification:'Site induction' },
    { employee:'u5', skill:'s1', level:'Intermediate', certification:'Electrical certificate' },
    { employee:'u5', skill:'s3', level:'Advanced', certification:'Site induction' },
    { employee:'u5', skill:'s4', level:'Advanced', certification:'Working at height' },
    { employee:'u6', skill:'s6', level:'Advanced', certification:'Mechanical certificate' },
    { employee:'u6', skill:'s3', level:'Advanced', certification:'Site induction' }
  ],
  projects: [
    { id:'p1', org:'fjordkraft', name:'Oslo Grid Upgrade', client:'Nord Energi', priority:'High', status:'At risk', deadline:'2026-10-14', budget:420000, spent:318500, health:62 },
    { id:'p2', org:'fjordkraft', name:'Bergen Automation Retrofit', client:'WestPort Logistics', priority:'Medium', status:'On track', deadline:'2026-10-22', budget:280000, spent:147800, health:86 },
    { id:'p3', org:'fjordkraft', name:'Stavanger Substation Survey', client:'Rogaland Power', priority:'High', status:'On track', deadline:'2026-10-18', budget:160000, spent:61400, health:81 },
    { id:'p4', org:'fjordkraft', name:'Nordic Safety Audit', client:'Fjordkraft Internal', priority:'Low', status:'Planned', deadline:'2026-11-03', budget:90000, spent:12000, health:94 },
    { id:'p5', org:'nordbygg', name:'Trondheim Terminal Phase 2', client:'Arctic Logistics', priority:'High', status:'On track', deadline:'2026-11-10', budget:920000, spent:454000, health:74 }
  ],
  tasks: [
    { id:'PT-41', project:'p1', name:'Protection relay testing', start:'2026-10-14T10:00', end:'2026-10-14T14:00', requiredSkill:'s1', location:'Oslo Site 3', priority:'High' },
    { id:'PT-42', project:'p2', name:'PLC cabinet commissioning', start:'2026-10-14T12:00', end:'2026-10-14T16:00', requiredSkill:'s2', location:'Bergen Terminal', priority:'Medium' },
    { id:'PT-43', project:'p3', name:'Substation walkdown', start:'2026-10-15T09:00', end:'2026-10-15T13:00', requiredSkill:'s3', location:'Stavanger Site', priority:'High' },
    { id:'PT-44', project:'p1', name:'Cable route verification', start:'2026-10-15T09:00', end:'2026-10-15T15:00', requiredSkill:'s4', location:'Oslo Site 3', priority:'Medium' },
    { id:'PT-45', project:'p2', name:'Automation acceptance test', start:'2026-10-16T10:00', end:'2026-10-16T15:00', requiredSkill:'s2', location:'Bergen Terminal', priority:'Medium' },
    { id:'PT-46', project:'p3', name:'Survey report pack', start:'2026-10-16T12:00', end:'2026-10-16T16:00', requiredSkill:'s5', location:'Oslo Office', priority:'Low' },
    { id:'PT-47', project:'p1', name:'HSE permit review', start:'2026-10-14T08:00', end:'2026-10-14T10:00', requiredSkill:'s3', location:'Oslo Site 3', priority:'High' },
    { id:'PT-48', project:'p3', name:'Mechanical enclosure inspection', start:'2026-10-15T11:00', end:'2026-10-15T15:00', requiredSkill:'s6', location:'Stavanger Site', priority:'Medium' }
  ],
  assignments: [
    { id:'A1', task:'PT-41', employee:'u2', type:'employee', org:'fjordkraft' },
    { id:'A2', task:'PT-42', employee:'u2', type:'employee', org:'fjordkraft' },
    { id:'A3', task:'PT-43', employee:'u5', type:'employee', org:'fjordkraft' },
    { id:'A4', task:'PT-44', employee:'u5', type:'employee', org:'fjordkraft' },
    { id:'A5', task:'PT-45', employee:'u3', type:'employee', org:'fjordkraft' },
    { id:'A6', task:'PT-46', employee:'u4', type:'employee', org:'fjordkraft' },
    { id:'A7', task:'PT-47', employee:'u2', type:'employee', org:'fjordkraft' },
    { id:'A8', task:'PT-48', employee:'u6', type:'employee', org:'fjordkraft' }
  ],
  resources: [
    { id:'u2', org:'fjordkraft', kind:'Employee', name:'Sarah Nilsen', team:'Delivery', location:'Oslo', utilization:94, costRate:980, status:'Overloaded' },
    { id:'u3', org:'fjordkraft', kind:'Employee', name:'David Hansen', team:'Automation', location:'Bergen', utilization:68, costRate:1040, status:'Available' },
    { id:'u5', org:'fjordkraft', kind:'Employee', name:'Ola Berg', team:'Field', location:'Stavanger', utilization:91, costRate:930, status:'High load' },
    { id:'u6', org:'fjordkraft', kind:'Employee', name:'Erik Lund', team:'Field', location:'Stavanger', utilization:59, costRate:910, status:'Available' },
    { id:'eq-1', org:'fjordkraft', kind:'Equipment', name:'Thermal camera TC-8', team:'Field', location:'Oslo', utilization:72, costRate:650, status:'Allocated' },
    { id:'eq-2', org:'fjordkraft', kind:'Equipment', name:'Protection test set PTS-4', team:'Delivery', location:'Oslo', utilization:83, costRate:1100, status:'Allocated' },
    { id:'eq-3', org:'fjordkraft', kind:'Equipment', name:'PLC commissioning kit', team:'Automation', location:'Bergen', utilization:54, costRate:720, status:'Available' }
  ],
  maintenancePeriods: [
    { equipment:'eq-1', start:'2026-10-15T13:00', end:'2026-10-15T17:00', reason:'Calibration / maintenance window' }
  ],
  equipmentAssignments: [
    { id:'EA1', equipment:'eq-2', task:'PT-41', start:'2026-10-14T10:00', end:'2026-10-14T14:00' },
    { id:'EA2', equipment:'eq-2', task:'PT-43', start:'2026-10-14T12:00', end:'2026-10-14T15:00' },
    { id:'EA3', equipment:'eq-1', task:'PT-44', start:'2026-10-15T09:00', end:'2026-10-15T15:00' }
  ],
  availability: [
    { resource:'u2', date:'2026-10-14', available:false, reason:'Client workshop 09:00–16:00' },
    { resource:'u3', date:'2026-10-14', available:true, reason:'' },
    { resource:'u5', date:'2026-10-15', available:true, reason:'' },
    { resource:'u6', date:'2026-10-15', available:true, reason:'' }
  ],
  locations: [
    { id:'l1', name:'Oslo Site 3', city:'Oslo', country:'Norway' },
    { id:'l2', name:'Bergen Terminal', city:'Bergen', country:'Norway' },
    { id:'l3', name:'Stavanger Site', city:'Stavanger', country:'Norway' },
    { id:'l4', name:'Oslo Office', city:'Oslo', country:'Norway' }
  ],
  conflicts: [],
  recommendations: [],
  audit: [
    { at:'2026-10-01 14:42', actor:'Kari Manager', org:'fjordkraft', action:'Created assignment', entity:'PT-41', detail:'Sarah Nilsen assigned to Protection relay testing' },
    { at:'2026-10-01 14:28', actor:'Mina Solberg', org:'fjordkraft', action:'Updated project', entity:'p1', detail:'Oslo Grid Upgrade deadline confirmed for 14 Oct' },
    { at:'2026-10-01 13:58', actor:'Kari Manager', org:'fjordkraft', action:'Approved recommendation', entity:'REC-9', detail:'Moved survey task by one day' }
  ],
  workPolicy: { weeklyTarget: 37.5, dailyAlert: 9, minimumDailyRest: 11, minimumWeeklyRest: 35 }
};
