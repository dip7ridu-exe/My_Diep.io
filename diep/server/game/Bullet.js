let bulletId = 0;

class Bullet {
    constructor(ownerId, x, y, angle, speed, size, damage, pen, isTrap = false) {
        this.id = ++bulletId;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.r = size;
        this.dmg = damage;
        this.hp = pen;
        this.life = isTrap ? 600 : 110;
        this.alive = true;
        this.isTrap = isTrap;

        if (isTrap) {
            this.vx *= 0.1;
            this.vy *= 0.1;
        }
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.isTrap) {
            this.vx *= Math.pow(0.9, dt);
            this.vy *= Math.pow(0.9, dt);
        }
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
        if (Math.abs(this.x) > 2700 || Math.abs(this.y) > 2700) this.alive = false;
    }

    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            r: +(this.r.toFixed(1)),
            oid: this.ownerId,
            tp: this.isTrap ? 1 : 0
        };
    }
}

module.exports = Bullet;