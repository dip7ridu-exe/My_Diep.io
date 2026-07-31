const Player = require('./Player');
const Shape = require('./Shape');
const Bullet = require('./Bullet');
const {
    SHAPES_MAX, SHAPE_TYPES, TICK_RATE,
    CLASSES, UPGRADE_TREE
} = require('./constants');

class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();  // socketId -> Player
        this.shapes = [];
        this.bullets = [];
        this.killFeed = [];
        this.lastTick = Date.now();
        this.tickInterval = null;

        this.spawnShapes();
    }

    start() {
        this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_RATE);
    }

    stop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
    }

    // ===== PLAYER MANAGEMENT =====
    addPlayer(socketId, name) {
        const player = new Player(socketId, name);
        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        // Remove bullets owned by this player
        this.bullets = this.bullets.filter(b => b.ownerId !== socketId);
    }

    getPlayer(socketId) {
        return this.players.get(socketId);
    }

    // ===== SHAPES =====
    spawnShapes() {
        while (this.shapes.length < SHAPES_MAX) {
            const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
            this.shapes.push(new Shape(type));
        }
    }

    // ===== SHOOTING =====
    playerShoot(socketId) {
        const player = this.players.get(socketId);
        if (!player || !player.alive || player.reloadTimer > 0) return;

        const cd = CLASSES[player.cls] || CLASSES.basic;
        const baseAngle = player.angle;
        const speed = player.getBulletSpeed();
        const size = player.getBulletSize();
        const dmg = player.getBulletDmg();
        const pen = player.getBulletPen();

        const shotAngles = [];
        if (player.cls === 'twin') {
            shotAngles.push(baseAngle - 0.12, baseAngle + 0.12);
        } else if (player.cls === 'tripleShot') {
            shotAngles.push(baseAngle - 0.18, baseAngle, baseAngle + 0.18);
        } else if (player.cls === 'quad') {
            shotAngles.push(baseAngle - 0.24, baseAngle - 0.08, baseAngle + 0.08, baseAngle + 0.24);
        } else if (player.cls === 'sniper') {
            shotAngles.push(baseAngle);
        } else {
            shotAngles.push(baseAngle);
        }

        const bx = player.x + Math.cos(baseAngle) * (player.r + 6);
        const by = player.y + Math.sin(baseAngle) * (player.r + 6);

        shotAngles.forEach((angle) => {
            this.bullets.push(new Bullet(socketId, bx, by, angle, speed, size, dmg, pen));
        });

        const recoil = 0.8 * (cd.bz || 1) * Math.max(1, shotAngles.length * 0.6);
        player.vx -= Math.cos(baseAngle) * recoil;
        player.vy -= Math.sin(baseAngle) * recoil;

        player.reloadTimer = player.getReloadTime();
    }

    // ===== GAME TICK =====
    tick() {
        const now = Date.now();
        const rawDt = (now - this.lastTick) / 1000;
        const dt = Math.min(rawDt, 0.05) * 60; // Normalized to 60fps
        this.lastTick = now;

        const alivePlayers = [...this.players.values()].filter(p => p.alive);

        // Update players
        for (const p of this.players.values()) {
            p.update(dt);
        }

        // Update shapes
        for (const s of this.shapes) {
            s.update(dt, alivePlayers);
        }

        // Update bullets
        for (const b of this.bullets) {
            b.update(dt);
        }

        // ===== COLLISION DETECTION =====
        this.checkBulletShapeCollisions();
        this.checkBulletPlayerCollisions();
        this.checkPlayerPlayerCollisions();
        this.checkCrasherPlayerCollisions(alivePlayers);

        // Cleanup
        this.shapes = this.shapes.filter(s => s.alive);
        this.bullets = this.bullets.filter(b => b.alive);

        // Respawn shapes
        this.spawnShapes();

        // Remove disconnected players after timeout
        const timeout = 20000;
        for (const [id, p] of this.players) {
            if (Date.now() - p.lastActive > timeout) {
                this.removePlayer(id);
            }
        }
    }

    checkBulletShapeCollisions() {
        for (const b of this.bullets) {
            if (!b.alive) continue;
            for (const s of this.shapes) {
                if (!s.alive) continue;
                const d = Math.hypot(b.x - s.x, b.y - s.y);
                if (d < b.r + s.r) {
                    s.hp -= b.dmg;
                    b.hp -= 3;
                    if (b.hp <= 0) b.alive = false;

                    const a = Math.atan2(s.y - b.y, s.x - b.x);
                    s.vx += Math.cos(a) * 1.3;
                    s.vy += Math.sin(a) * 1.3;

                    if (s.hp <= 0) {
                        s.alive = false;
                        const owner = this.players.get(b.ownerId);
                        if (owner && owner.alive) {
                            owner.addXp(s.xp);
                            owner.score += s.score;
                            this.pushKillFeed(`${owner.name} destruiu ${s.type || 'uma forma'}`);
                        }
                    }
                }
            }
        }
    }

    checkBulletPlayerCollisions() {
        for (const b of this.bullets) {
            if (!b.alive) continue;
            for (const p of this.players.values()) {
                if (!p.alive || b.ownerId === p.id || p.invuln > 0) continue;
                const d = Math.hypot(b.x - p.x, b.y - p.y);
                if (d < b.r + p.r) {
                    p.hp -= b.dmg;
                    p.regenTimer = 0;
                    b.hp -= 4;
                    if (b.hp <= 0) b.alive = false;

                    const a = Math.atan2(p.y - b.y, p.x - b.x);
                    p.vx += Math.cos(a) * 1.2;
                    p.vy += Math.sin(a) * 1.2;

                    if (p.hp <= 0) {
                        p.alive = false;
                        const killer = this.players.get(b.ownerId);
                        if (killer && killer.alive) {
                            killer.addXp(Math.floor(p.score * 0.5 + p.lv * 10));
                            killer.score += Math.floor(p.score * 0.3);
                            killer.kills++;
                            this.pushKillFeed(`${killer.name} eliminou ${p.name}`);
                        }
                        // Auto respawn after delay
                        setTimeout(() => {
                            if (this.players.has(p.id)) {
                                p.alive = true;
                                p.hp = p.mhp;
                                p.x = (Math.random() - 0.5) * 600;
                                p.y = (Math.random() - 0.5) * 600;
                                p.invuln = 120;
                                p.score = Math.floor(p.score * 0.5);
                            }
                        }, 3000);
                    }
                }
            }
        }
    }

    checkPlayerPlayerCollisions() {
        const players = [...this.players.values()].filter(p => p.alive);
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const a = players[i], b = players[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < a.r + b.r && d > 0) {
                    const ov = a.r + b.r - d;
                    const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
                    a.x -= nx * ov * 0.5; a.y -= ny * ov * 0.5;
                    b.x += nx * ov * 0.5; b.y += ny * ov * 0.5;

                    if (a.invuln <= 0) { a.hp -= b.getBodyDmg() * 0.1; a.regenTimer = 0; }
                    if (b.invuln <= 0) { b.hp -= a.getBodyDmg() * 0.1; b.regenTimer = 0; }
                }
            }
        }
    }

    checkCrasherPlayerCollisions(players) {
        for (const s of this.shapes) {
            if (!s.alive || !s.hostile) continue;
            for (const p of players) {
                if (!p.alive || p.invuln > 0) continue;
                const d = Math.hypot(s.x - p.x, s.y - p.y);
                if (d < s.r + p.r) {
                    p.hp -= 5;
                    p.regenTimer = 0;
                    s.hp -= p.getBodyDmg() * 0.5;
                    const a = Math.atan2(p.y - s.y, p.x - s.x);
                    p.vx += Math.cos(a) * 2;
                    p.vy += Math.sin(a) * 2;
                    if (s.hp <= 0) {
                        s.alive = false;
                        p.addXp(s.xp);
                        p.score += s.score;
                        this.pushKillFeed(`${p.name} destruiu ${s.type || 'uma forma'}`);
                    }
                }
            }
        }
    }

    pushKillFeed(text) {
        this.killFeed.push(text);
        if (this.killFeed.length > 8) this.killFeed.shift();
    }

    // ===== STATE SERIALIZATION =====
    getState(forPlayerId) {
        const me = this.players.get(forPlayerId);
        const players = [];
        for (const p of this.players.values()) {
            players.push(p.serialize());
        }

        // Only send nearby shapes/bullets (culling)
        const cx = me ? me.x : 0, cy = me ? me.y : 0;
        const viewDist = 1200;

        const shapes = this.shapes
            .filter(s => Math.abs(s.x - cx) < viewDist && Math.abs(s.y - cy) < viewDist)
            .map(s => typeof s.serialize === 'function' ? s.serialize() : s);

        const bullets = this.bullets
            .filter(b => Math.abs(b.x - cx) < viewDist && Math.abs(b.y - cy) < viewDist)
            .map(b => typeof b.serialize === 'function' ? b.serialize() : b);

        return {
            p: players,
            s: shapes,
            b: bullets,
            me: me ? me.serializeFull() : null,
            lb: this.getLeaderboard(),
            kf: [...this.killFeed],
            time: Date.now()
        };
    }

    getLeaderboard() {
        return [...this.players.values()]
            .filter(p => p.alive)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(p => ({ nm: p.name, sc: p.score, lv: p.lv, cls: p.cls }));
    }
}

module.exports = GameRoom;