const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameRoom = require('./game/GameRoom');
const { UPGRADE_TREE, CLASSES } = require('./game/constants');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 5000,
    pingTimeout: 10000
});

// ===== ROOM MANAGEMENT =====
const rooms = new Map();

function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        const room = new GameRoom(roomId);
        room.start();
        rooms.set(roomId, room);
        console.log(`🏠 Room "${roomId}" created`);
    }
    return rooms.get(roomId);
}

function cleanEmptyRooms() {
    for (const [id, room] of rooms) {
        if (room.players.size === 0) {
            room.stop();
            rooms.delete(id);
            console.log(`🗑️ Room "${id}" deleted (empty)`);
        }
    }
}
setInterval(cleanEmptyRooms, 30000);

// ===== HEALTH CHECK =====
app.get('/', (req, res) => {
    const roomList = [];
    for (const [id, room] of rooms) {
        roomList.push({ id, players: room.players.size });
    }
    res.json({
        status: 'ok',
        rooms: roomList,
        totalPlayers: [...rooms.values()].reduce((s, r) => s + r.players.size, 0)
    });
});

// ===== SOCKET HANDLING =====
io.on('connection', (socket) => {
    let currentRoom = null;
    let currentRoomId = null;

    console.log(`🔌 Connected: ${socket.id}`);

    // ===== JOIN =====
    socket.on('join', ({ name, room }) => {
        const roomId = (room || 'public').toLowerCase().trim().substring(0, 20);
        currentRoomId = roomId;
        currentRoom = getOrCreateRoom(roomId);

        const player = currentRoom.addPlayer(socket.id, name || 'Jogador');
        socket.join(roomId);

        socket.emit('joined', {
            id: socket.id,
            room: roomId,
            playerCount: currentRoom.players.size
        });

        io.to(roomId).emit('playerCount', currentRoom.players.size);

        console.log(`👤 "${name}" joined room "${roomId}" (${currentRoom.players.size} players)`);
    });

    // ===== INPUT UPDATE (client sends ~30fps) =====
    socket.on('input', (data) => {
        if (!currentRoom) return;
        const player = currentRoom.getPlayer(socket.id);
        if (!player || !player.alive) return;

        player.lastActive = Date.now();

        // Sanitize input
        player.input.ix = Math.max(-1, Math.min(1, data.ix || 0));
        player.input.iy = Math.max(-1, Math.min(1, data.iy || 0));
        player.input.angle = typeof data.a === 'number' ? data.a : 0;
        player.input.shooting = !!data.sh;

        // Handle shooting
        if (data.sh) {
            currentRoom.playerShoot(socket.id);
        }
    });

    // ===== STAT UPGRADE =====
    socket.on('upgradeStat', (index) => {
        if (!currentRoom) return;
        const player = currentRoom.getPlayer(socket.id);
        if (player) {
            player.upgradeStat(index);
        }
    });

    // ===== CLASS UPGRADE =====
    socket.on('upgradeClass', (newCls) => {
        if (!currentRoom) return;
        const player = currentRoom.getPlayer(socket.id);
        if (!player) return;

        // Validate upgrade path
        const tree = UPGRADE_TREE[player.cls];
        if (!tree) return;

        let valid = false;
        for (const [lvl, opts] of Object.entries(tree)) {
            if (player.lv >= parseInt(lvl) && opts.includes(newCls)) {
                valid = true;
                break;
            }
        }

        if (valid && CLASSES[newCls]) {
            player.upgradeClass(newCls);
        }
    });

    // ===== DISCONNECT =====
    socket.on('disconnect', () => {
        if (currentRoom) {
            const player = currentRoom.getPlayer(socket.id);
            const name = player ? player.name : 'unknown';
            currentRoom.removePlayer(socket.id);
            io.to(currentRoomId).emit('playerCount', currentRoom.players.size);
            console.log(`❌ "${name}" left room "${currentRoomId}"`);
        }
    });
});

// ===== GAME STATE BROADCAST =====
// Send state to each player (with view culling)
setInterval(() => {
    for (const [roomId, room] of rooms) {
        const leaderboard = room.getLeaderboard();

        for (const [socketId, player] of room.players) {
            const state = room.getState(socketId);
            state.lb = leaderboard;
            io.to(socketId).emit('state', state);
        }
    }
}, 1000 / 30); // 30fps state updates

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Diep.io server running on port ${PORT}`);
});