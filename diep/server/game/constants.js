module.exports = {
    MAP: 5200,
    HALF: 2600,
    TICK_RATE: 30,           // Updates por segundo
    SHAPES_MAX: 100,
    SHAPE_TYPES: ['sq','sq','sq','sq','tr','tr','pn','cr'],

    // Classes (simplificado para servidor)
    CLASSES: {
        basic:  { n:'Basic',  t:0, r:1,   bs:1,   bz:1,   spd:1 },
        twin:   { n:'Twin',   t:1, r:.55,  bs:1,   bz:.8,  spd:1 },
        sniper: { n:'Sniper', t:1, r:1.5,  bs:1.4, bz:.9,  spd:1 },
        mg:     { n:'MG',     t:1, r:.4,   bs:.9,  bz:.7,  spd:1 },
        flank:  { n:'Flank',  t:1, r:.85,  bs:1,   bz:.9,  spd:1 },
        tripleShot: { n:'Triple Shot', t:2, r:.8, bs:1, bz:.8, spd:1 },
        quad:       { n:'Quad Tank',   t:2, r:.85, bs:1, bz:.85, spd:1 },
        assassin:   { n:'Assassin',    t:2, r:1.8, bs:1.6, bz:.85, spd:1 },
        destroyer:  { n:'Destroyer',   t:2, r:3, bs:.7, bz:2.2, spd:1 },
        triAngle:   { n:'Tri-Angle',   t:2, r:.85, bs:1, bz:.9, spd:1.3 },
        pentaShot:  { n:'Penta Shot',  t:3, r:.7, bs:1, bz:.7, spd:1 },
        ranger:     { n:'Ranger',      t:3, r:2, bs:1.8, bz:.75, spd:1 },
        annihilator:{ n:'Annihilator', t:3, r:3.5, bs:.6, bz:3, spd:1 },
        booster:    { n:'Booster',     t:3, r:.85, bs:1, bz:.85, spd:1.8 },
        fighter:    { n:'Fighter',     t:3, r:.85, bs:1, bz:.85, spd:1.4 },
        octo:       { n:'Octo Tank',   t:3, r:.9, bs:1, bz:.7, spd:1 },
    },

    UPGRADE_TREE: {
        basic: { 15: ['twin','sniper','mg','flank'] },
        twin: { 30: ['tripleShot','quad'] },
        sniper: { 30: ['assassin'] },
        mg: { 30: ['destroyer'] },
        flank: { 30: ['triAngle'] },
        tripleShot: { 45: ['pentaShot'] },
        assassin: { 45: ['ranger'] },
        destroyer: { 45: ['annihilator'] },
        triAngle: { 45: ['booster','fighter'] },
        quad: { 45: ['octo'] },
    },

    XP_FOR_LEVEL: (l) => Math.ceil(18 * Math.pow(l, 1.45)),
    MAX_STAT: 7,
    MAX_LEVEL: 45
};