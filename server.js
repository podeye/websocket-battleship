const express = require('express');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 3000;
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

//Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Start Server
server.listen(PORT, ()=>{
  console.log(`Server running on port ${PORT}`);
})

// Handle Socket Connection Request From web client
connections = [null, null];

io.on('connection', (socket)=>{
  // console.log('New websocket connection');
  // Find available player number
  let playerIndex = -1;
  for(const i in connections){
    if(connections[i] === null){
      playerIndex = i;
      break;
    }
  }
  
  // Tell the connection client what player number they are 
  socket.emit('player-number', playerIndex);
  console.log('Player ' + playerIndex + ' has connected');

   // Ignore Player 3
   if(playerIndex === -1) return;

  connections[playerIndex] = false;
  //  Tell everyone what player number connected
  socket.broadcast.emit('player-connection', playerIndex);
  // Handle Disconnect
  socket.on('disconnect', ()=>{
    console.log(`Player ${playerIndex} has disconnected`);
    connections[playerIndex] = null;
    // Tell everyone what player number disconnected
    socket.broadcast.emit('player-connection', playerIndex);
  })

  // on Ready 
  socket.on('player-ready', ()=>{
    socket.broadcast.emit('enemy-ready', playerIndex);
    connections[playerIndex] = true;
  })

  // check player connections
  socket.on('check-players', ()=>{
    const players = [];
    for(const i in connections){
      connections[i] === null ? players.push({connected:false, ready:false}):
      players.push({connected:true, ready: connections[i]});
    }
    socket.emit('check-players', players)
  })

  // on fire received
  socket.on('fire', id=>{
    console.log('shot fired from player index', playerIndex, id);
    // emit move to other player
    socket.broadcast.emit('fire', id)
    })

  // on fire reply
  socket.on('fire-reply', square => {
    console.log('fire-reply',square);
    // Forward the reply to the other player;
    socket.broadcast.emit('fire-reply', square);
  })

  // TimeOut Connection

  setTimeout(()=>{
    connections[playerIndex] = null;
    socket.emit('timeout');
    socket.disconnect();
},600000) // 10 min limit per player


})