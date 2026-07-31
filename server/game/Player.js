const { CLASSES, XP_FOR_LEVEL, MAX_STAT, MAX_LEVEL, HALF } = require('./constants');

class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name || 'Jogador';
        this.x = (Math.random() - 0.5) * 500;
        this.y = (Math.random() - 0.5) * 500;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.r = 24;
        this.hp = 50;
        this.mhp = 50;
        this.cls = 'basic';
        this.mode = 'online';
        this.lv = 1;
        this.xp = 0;
        this.score = 0;
        this.kills = 0;
        this.stats = [0,0,0,0,0,0,0,0];
        this.sp = 0; // stat points
        this.alive = true;
        this.reloadTimer = 0;
        this.regenTimer = 0;
        this.invuln = 90;

        // Input state (received from client)
        this.input = { ix: 0, iy: 0, angle: 0, shooting: false };

        this.lastActive = Date.now();
    }

    getSpeed() {
        let s = 3.2 * (1 + this.stats[7] * 0.11);
        const cd = CLASSES[this.cls];
        if (cd && cd.spd) s *= 1 + (cd.spd - 1) * 0.35;
        return s;
    }

    getMaxHp() { return 50 * (1 + this.stats[1] * 0.2) + this.lv * 2; }
    getBodyDmg() { return 5 * (1 + this.stats[2] * 0.25); }
    getRegen() { return 0.08 * (1 + this.stats[0] * 0.45); }
    getReloadTime() {
        const cd = CLASSES[this.cls];
        return Math.max(2, (30 * (cd ? cd.r : 1)) / (1 + this.stats[6] * 0.15));
    }
    getBulletSpeed() {
        const cd = CLASSES[this.cls];
        return 6.5 * (cd ? cd.bs : 1) * (1 + this.stats[3] * 0.14);
    }
    getBulletSize() {
        const cd = CLASSES[this.cls];
        return 8 * (cd ? cd.bz : 1) * (1 + this.stats[3] * 0.03);
    }
    getBulletDmg() { return 7 + this.stats[5] * 4; }
    getBulletPen() { return 6 + this.stats[4] * 3; }

    addXp(amount) {
        this.xp += amount;
        let leveled = false;
        while (this.lv < MAX_LEVEL && this.xp >= XP_FOR_LEVEL(this.lv)) {
            this.xp -= XP_FOR_LEVEL(this.lv);
            this.lv++;
            this.sp++;
            this.mhp = this.getMaxHp();
            this.hp = this.mhp;
            this.r = 24 + this.lv * 0.35;
            leveled = true;
        }
        return leveled;
    }

    upgradeStat(index) {
        if (this.sp <= 0 || index < 0 || index > 7) return false;
        if (this.stats[index] >= MAX_STAT) return false;
        this.stats[index]++;
        this.sp--;
        this.mhp = this.getMaxHp();
        this.hp = Math.min(this.hp + 6, this.mhp);
        return true;
    }

    upgradeClass(newCls) {
        if (!CLASSES[newCls]) return false;
        this.cls = newCls;
        this.mhp = this.getMaxHp();
        this.hp = this.mhp;
        return true;
    }

    update(dt) {
        if (!this.alive) return;

        const spd = this.getSpeed();
        const { ix, iy, angle } = this.input;

        if (this.cls === 'booster' || this.cls === 'fighter') {
            this.vx += Math.cos(angle || 0) * 0.04 * dt;
            this.vy += Math.sin(angle || 0) * 0.04 * dt;
        }

        // Movement
        this.vx += ix * spd * 0.35 * dt;
        this.vy += iy * spd * 0.35 * dt;
        this.vx *= Math.pow(0.82, dt);
        this.vy *= Math.pow(0.82, dt);

        const curSpd = Math.hypot(this.vx, this.vy);
        const maxSpd = spd * 1.1;
        if (curSpd > maxSpd) {
            this.vx *= maxSpd / curSpd;
            this.vy *= maxSpd / curSpd;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.x = Math.max(-HALF + 30, Math.min(HALF - 30, this.x));
        this.y = Math.max(-HALF + 30, Math.min(HALF - 30, this.y));

        this.angle = angle;

        // Regen
        this.regenTimer += dt;
        if (this.regenTimer > 80) {
            this.hp = Math.min(this.mhp, this.hp + this.getRegen() * dt);
        }

        // Invulnerability
        if (this.invuln > 0) this.invuln -= dt;

        // Reload
        if (this.reloadTimer > 0) this.reloadTimer -= dt;
    }

    serialize() {
        return {
            id: this.id,
            nm: this.name,
            x: Math.round(this.x),
            y: Math.round(this.y),
            a: +(this.angle.toFixed(2)),
            r: +(this.r.toFixed(1)),
            hp: Math.round(this.hp),
            mhp: Math.round(this.mhp),
            cls: this.cls,
            lv: this.lv,
            sc: this.score,
            ki: this.kills,
            alive: this.alive,
            inv: this.invuln > 0
        };
    }

    serializeFull() {
        return {
            ...this.serialize(),
            xp: Math.round(this.xp),
            xpNext: XP_FOR_LEVEL(this.lv),
            sp: this.sp,
            st: [...this.stats]
        };
    }
}

module.exports = Player;