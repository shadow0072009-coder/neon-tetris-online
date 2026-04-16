import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode) || { players: [] };
    if (room.players.length < 2) {
      room.players.push(socket.id);
      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.emit('room-joined', { roomCode, playerNumber: room.players.length });
      if (room.players.length === 2) io.to(roomCode).emit('player-ready');
    } else {
      socket.emit('error', 'Room full');
    }
  });

  socket.on('game-state-sync', ({ roomCode, state }) => {
    socket.to(roomCode).emit('opponent-state-sync', state);
  });

  socket.on('send-attack', ({ roomCode, lines }) => {
    socket.to(roomCode).emit('receive-attack', { lines });
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomCode) => {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter(id => id !== socket.id);
        if (room.players.length === 0) rooms.delete(roomCode);
        else io.to(roomCode).emit('opponent-disconnected');
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server: ${PORT}`));
