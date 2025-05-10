const express = require('express');
const app = express();
const http = require('http').createServer(app); // Fixed typo in 'const'
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {
  X: null,
  O: null
};

let gameState = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  gameActive: true
};

io.on('connection', (socket) => {
  console.log('Um usuário conectou');

  // Send current game state to new connections
  socket.emit('gameState', gameState);

  socket.on('selectPlayer', (player) => {
    if (!players[player]) {
      players[player] = socket.id;
      socket.player = player;
      io.emit('playerSelected', { player, players });
    }
  });

  socket.on('jogada', (data) => {
    if (gameState.gameActive) {
      // Update server game state
      gameState.board[data.index] = data.player;
      gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

      // Broadcast the updated game state to all clients
      io.emit('jogada', {
        index: data.index,
        symbol: data.player
      });

      io.emit('gameState', {
        ...gameState,
        lastMove: data.index
      });
    }
  });

  socket.on('gameOver', (data) => {
    gameState.gameActive = false;
    io.emit('gameOver', { winner: data.winner });
  });

  socket.on('reset', () => {
    // Update game state immediately
    gameState = {
      board: Array(9).fill(''),
      currentPlayer: 'X',
      gameActive: true
    };
    
    // Broadcast reset with immediate status clear
    io.emit('resetGame', { immediate: true });
    io.emit('gameState', gameState);
  });

  socket.on('disconnect', () => {
    if (socket.player) {
      players[socket.player] = null;
      io.emit('playerLeft', { player: socket.player, players });
    }
    console.log('Um usuário desconectou');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});