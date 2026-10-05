// the weapons the hero can hold: blades wear out (dura), guns use ammo
// off = blade angle against the forearm (melee); guns point along the forearm
export const WEAPONS = [
  { id: 'fists', name: 'Fists', labels: ['Punch', 'Heavy punch'] },
  { id: 'katana', name: 'Katana', labels: ['Slash', 'Heavy slash'], melee: true, dura: 8, len: 15, off: -1.1 },
  { id: 'axe', name: 'Axe', labels: ['Chop', 'Heavy chop'], melee: true, dura: 8, len: 13, off: -1.3 },
  { id: 'shotgun', name: 'Shotgun', labels: ['Fire', 'Fire'], gun: true, ammo: 10, len: 15, forend: 10, cd: 0.65, pellets: 6, spread: 0.16, power: 70, speed: 520, life: 0.22, lift: 0.45, kick: 2.4, body: 1, push: 70, climb: 0 },
  { id: 'mg', name: 'Machine gun', labels: ['Fire (hold)', 'Fire'], gun: true, ammo: 80, len: 18, forend: 11, cd: 0.08, pellets: 1, spread: 0.085, power: 45, speed: 640, life: 0.45, lift: 0.03, kick: 1.2, body: 0.4, push: 9, climb: 0, auto: true },
];
