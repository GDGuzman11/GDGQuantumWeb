"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesForFamily = categoriesForFamily;
const AR = [
    { id: 'barrel', label: 'Barrel', slot: 'barrel', primary: 'dmg' },
    { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'rate' },
    { id: 'magazine', label: 'Magazine', slot: 'magazine', primary: 'mag' },
    { id: 'optics', label: 'Optics', slot: 'optic', primary: 'handling' },
    { id: 'rear', label: 'Rear Assembly', slot: 'rear', primary: 'reload' },
];
const LMG = [
    { id: 'barrel', label: 'Heavy Barrel', slot: 'barrel', primary: 'dmg' },
    { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'rate' },
    { id: 'feed', label: 'Ammo Feed', slot: 'feed', primary: 'mag' },
    { id: 'cooling', label: 'Cooling System', slot: 'cooling', primary: 'rate' },
    { id: 'stability', label: 'Stability Assembly', slot: 'stability', primary: 'handling' },
];
const ENERGY = [
    { id: 'emitter', label: 'Emitter', slot: 'emitter', primary: 'dmg' },
    { id: 'core', label: 'Power Core', slot: 'core', primary: 'rate' },
    { id: 'cooling', label: 'Cooling Chamber', slot: 'cooling', primary: 'mag' },
    { id: 'targeting', label: 'Targeting Module', slot: 'targeting', primary: 'handling' },
    { id: 'reactor', label: 'Rear Reactor', slot: 'reactor', primary: 'reload' },
];
const SNIPER = [
    { id: 'barrel', label: 'Precision Barrel', slot: 'barrel', primary: 'dmg' },
    { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'reload' },
    { id: 'scope', label: 'Scope', slot: 'scope', primary: 'handling' },
    { id: 'bolt', label: 'Bolt Assembly', slot: 'bolt', primary: 'rate' },
    { id: 'stock', label: 'Precision Stock', slot: 'stock', primary: 'handling' },
];
const LAUNCHER = [
    { id: 'tube', label: 'Launch Tube', slot: 'tube', primary: 'dmg' },
    { id: 'warhead', label: 'Warhead Chamber', slot: 'warhead', primary: 'dmg' },
    { id: 'core', label: 'Power Core', slot: 'core', primary: 'rate' },
    { id: 'targeting', label: 'Targeting Module', slot: 'targeting', primary: 'handling' },
    { id: 'stabilizer', label: 'Stabilizer', slot: 'stabilizer', primary: 'reload' },
];
const SIDEARM = [
    { id: 'slide', label: 'Slide', slot: 'slide', primary: 'dmg' },
    { id: 'frame', label: 'Frame', slot: 'frame', primary: 'handling' },
    { id: 'magazine', label: 'Magazine', slot: 'magazine', primary: 'mag' },
    { id: 'sight', label: 'Sight', slot: 'sight', primary: 'handling' },
    { id: 'grip', label: 'Grip', slot: 'grip', primary: 'reload' },
];
const BY_FAMILY = {
    rifle: AR,
    mg: LMG,
    laser: ENERGY,
    sniper: SNIPER,
    launcher: LAUNCHER,
    pistol: SIDEARM,
};
function categoriesForFamily(family) {
    return BY_FAMILY[family];
}
