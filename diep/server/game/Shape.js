const { MAP, HALF } = require('./constants');

let shapeId = 0;

class Shape {
    constructor(type, x, y) {
        this.id = ++shapeId;
        this.x = x ?? (Math.random() * MAP - HALF);
        this.y = y ?? (Math.random() * MAP - HALF);
        this.vx = 0;
        this.vy = 0;
        this.angle = Math.random() * Math.PI * 2;
        this.rot = (Math.random() - 0.5) * 0.03;
        this.type = type;
        this.alive = true;

        switch (type) {
            case 'sq':
                this.r = 14; this.hp = 10; this.mhp = 10;
                this.xp = 10; this.score = 10; break;
            case 'tr':
                this.r = 18; this.hp = 30; this.mhp = 30;
                this.xp = 25; this.score = 25; break;
            case 'pn':
                this.r = 28; this.hp = 100; this.mhp = 100;
                this.xp = 130; this.score = 130;
                // Pentagons spawn near center
                this.x = (Math.random() - 0.5) * 1000;
                this.y = (Math.random() - 0.5) * 1000;
                break;
            case 'cr':
                this.r = 12; this.hp = 15; this.mhp = 15;
                this.xp = 15; this.score = 15;
                this.hostile = true; this.spd = 2.5; break;
        }
    }

    update(dt, players) {
        // Crashers chase nearest player
        if (this.hostile && players.length > 0) {
            let nearest = null, nd = 500;
            for (const p of players) {
                const d = Math.hypot(p.x - this.x, p.y - this.y);
                if (d < nd) { nd = d; nearest = p; }
            }
            if (nearest) {
                const a = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                this.vx += Math.cos(a) * (this.spd || 2) * 0.08 * dt;
                this.vy += Math.sin(a) * (this.spd || 2) * 0.08 * dt;
            }
        }

        this.vx *= Math.pow(0.95, dt);
        this.vy *= Math.pow(0.95, dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.rot * dt;

        // Clamp to map
        this.x = Math.max(-HALF + 20, Math.min(HALF - 20, this.x));
        this.y = Math.max(-HALF + 20, Math.min(HALF - 20, this.y));
    }

    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            a: +(this.angle.toFixed(2)),
            tp: this.type,
            hp: Math.round(this.hp),
            mhp: this.mhp,
            r: this.r
        };
    }
}

module.exports = Shape;