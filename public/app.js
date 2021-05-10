document.addEventListener('DOMContentLoaded', ()=>{
 const userGrid = document.querySelector('.grid-user');
 const computerGrid = document.querySelector('.grid-computer');
 const displayGrid = document.querySelector('.grid-display');
 const ships = document.querySelectorAll('.ship');
 const destroyer = document.querySelector('.destroyer-container');
 const submarine = document.querySelector('.submarine-container');
 const cruiser = document.querySelector('.cruiser-container');
 const battleShip = document.querySelector('.battleShip-container');
 const carrier = document.querySelector('.carrier-container');
 const startButton = document.querySelector('#start');
 const rotateButton = document.querySelector('#rotate');
 const turnDisplay = document.querySelector('#whose-go');
 const infoDisplay = document.querySelector('#info');
 const singlePlayerButton = document.querySelector('#singlePlayerButton');
 const multiPlayerButton = document.querySelector('#multiPlayerButton');
 const userSquares = [];
 const computerSquares = [];
 let isHorizontal = true;
 let isGameOver = false;
 let currentPlayer = 'user';

  // createBoards
  const width = 10;
  let gameMode = "";
  let playerNumber = 0;
  let ready = false;
  let enemyReady = false;
  let allShipsPlaced = false;
  let shotFired = -1;

  // Select Player Mode 
  singlePlayerButton.addEventListener('click', startSinglePlayer);
  multiPlayerButton.addEventListener('click', startMutliPlayer);
  
  // Start Multiplayer
  function startMutliPlayer(){
    gameMode = 'multiplayer';
    const socket = io();

  // Get your player number
  socket.on('player-number', (num)=>{
    if(num === -1){
      infoDisplay.innerHTML = 'Sorry the server is full';
    }else{
      playerNumber = parseInt(num);
      if(playerNumber === 1){
        currentPlayer = "enemy";
      }
      console.log(playerNumber)

      // Get Other Players Status
      socket.emit('check-players');
      
    }
  })

  // Another player has connected or disconnected
  socket.on('player-connection', num=>{
    console.log( `Player Number ${num}`);
    playerConnectedOrDisconnected(num);
  })

  //on enemy ready
  socket.on('enemy-ready', num=>{
    enemyReady = true;
    playerReady(num);
    if(ready) playGameMulti(socket);
  })

  // Check Player status
  socket.on('check-players', players=>{
    players.forEach((p,i)=>{
      if(p.connected) playerConnectedOrDisconnected(i);
      if(p.ready){
        playerReady(i);
        if(i!== playerNumber) enemyReady = true;
      }
    })
  })

  // Ready button click
  startButton.addEventListener('click', ()=>{
    if(allShipsPlaced) playGameMulti(socket);
    else infoDisplay.innerHTML = 'Please Place all ships';
  })

    // Setup eventListeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', ()=>{
        if(currentPlayer === 'user' && ready && enemyReady){
          shotFired = square.dataset.id;
          socket.emit('fire', shotFired);
        }
      })
    })
  
  // On Fire recieved
  socket.on('fire', id=>{
    enemyGo(id);
    const square = userSquares[id];
    socket.emit('fire-reply', square.classList);
    playGameMulti(socket); 
  })

  // on fire reply reieved
  socket.on('fire-reply', classlist => {
    console.log('client fire reply')
    revealSquare(classlist);
    playGameMulti(socket);
  })

  // on disconnect
  socket.on('timeout', ()=>{
    infoDisplay.innerHTML = 'You have reached the 10 min limit';
  })

  function playerConnectedOrDisconnected(num){
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .connected span`).classList.toggle('green');
    if(parseInt(num) === playerNumber) document.querySelector(player).style.fontWeight = 'bold'
  }

  }

  // Single Player
  function startSinglePlayer(){
    gameMode = "singlePlayer";

    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', playGameSingle);

  }

  function createBoard(grid, squares){
    for (let i=0; i<width*width; i++){
      const square = document.createElement('div');
      square.dataset.id = i;
      grid.appendChild(square);
      squares.push(square);
    }
  }

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Ships
  const shipArray = [
    {name:'destroyer',directions:[[0,1],[0,width]]},
    {name:'submarine',directions:[[0,1,2],[0,width, 2*width]]},
    {name:'cruiser',directions:[[0,1,2],[0,width, 2*width]]},
    {name:'battleShip',directions:[[0,1,2,3],[0,width, 2*width, 3*width]]},
    {name:'carrier',directions:[[0,1,2,3,4],[0,width, 2*width, 3*width, 4*width]]},
  ]

  // Draw the computers ships in random
  function generate(ship){
    let randomDir = Math.floor(Math.random()* ship.directions.length);
    let current = ship.directions[randomDir];
    if(randomDir === 0) direction = 1;
    if(randomDir === 1) direction = 10;
    let randomStart = Math.abs(Math.floor(Math.random()*computerSquares.length - (ship.directions[0].length*direction)))
    const isTaken = current.some(index=>computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index=>(randomStart + index) % width === width -1);
    const isAtLeftEdge = current.some(index=>(randomStart + index) % width === 0);
    if(!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken',ship.name));
    else generate(ship);
  }

  // rotate the ships
  function rotate(){
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleShip.classList.toggle('battleShip-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = !isHorizontal;
  }
  rotateButton.addEventListener('click', rotate)

  // move around user ship
  ships.forEach(ship=>ship.addEventListener('dragstart', dragStart));
  userSquares.forEach(square=> square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square=> square.addEventListener('dragover', dragOver))
  userSquares.forEach(square=> square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square=> square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square=> square.addEventListener('drop', dragDrop))
  userSquares.forEach(square=> square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex;
  let draggedShip;
  let draggedShipLength;
  let selectedShipIndex;
  ships.forEach(ship => ship.addEventListener('mousedown', (e)=>{
    selectedShipNameWithIndex = e.target.id;
    console.log('SSNWI', selectedShipNameWithIndex)
  }))

  function dragStart(){
    draggedShip = this;
    draggedShipLength = draggedShip.childElementCount;
    console.log('DSL',draggedShipLength)
  }

  function dragOver(e){
    e.preventDefault();
  }
  function dragEnter(e){
    e.preventDefault();
  }
  function dragLeave(){
    console.log('dragleave')
  }
  function dragDrop(){
    let shipNameWithLastId = draggedShip.lastElementChild.id;
    let shipClass = shipNameWithLastId.slice(0,-2);
    console.log(shipClass);
    
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1));
    let shipLastId = lastShipIndex + parseInt(this.dataset.id);
    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,100,1,11,21,31,41,51,61,71,81,91,2,12,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93];
    let notAllowedVertical = [];
    for(let i = 99; i>=60; i--){
      notAllowedVertical.push(i);
    }
    
    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0,10*lastShipIndex);


    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1));

    shipLastId = shipLastId - selectedShipIndex;
    console.log(isHorizontal, draggedShipLength)

    if(isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)){
      for(let i = 0; i<draggedShipLength; i++){
        console.log('info',this.dataset.id, selectedShipIndex, i )
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken',shipClass);
      }
      console.log(userSquares)
    }else if(!isHorizontal && !newNotAllowedVertical.includes(shipLastId)){
      for(let i = 0; i<draggedShipLength; i++){
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken',shipClass);
      }
    }else{
      return
    }

    displayGrid.removeChild(draggedShip);
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true;

  }
  function dragEnd(){
    console.log('draggend')
  }

  // Game logic for multiplayer
  function playGameMulti(socket){
    if(isGameOver) return;
    if(!ready){
      socket.emit('player-ready');
      ready = true;
      playerReady(playerNumber);
    }
     if(enemyReady){
        if(currentPlayer === 'user'){
          turnDisplay.innerHTML = 'Your Go';
        }
        if(currentPlayer === 'enemy'){
          turnDisplay.innerHTML = 'Enemys Go';
        }
      }
  }

  function playerReady(num){
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .ready span`).classList.toggle('green');
  }

  // Game Logic for Single Player
  function playGameSingle(){
    if(isGameOver) return;
    if(currentPlayer ==='user'){
      turnDisplay.innerHTML = 'Your Go';
      computerSquares.forEach(square => square.addEventListener('click', (e)=>{
       shotFired = square.dataset.id;
       revealSquare(square.classList);
      }))
    }
    if(currentPlayer === 'enemy'){
      turnDisplay.innerHTML = 'Computers Go';
      setTimeout(enemyGo, 1000);
    }
  }

  

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleShipCount = 0
  let carrierCount = 0

  function revealSquare(classlist){
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`);
    console.log('REVEAL INFO',shotFired,enemySquare)
    const obj = Object.values(classlist);

    if(!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver){
      if(obj.includes('destroyer')) destroyerCount++;
      if(obj.includes('submarine')) submarineCount++;
      if(obj.includes('cruiser')) cruiserCount++;
      if(obj.includes('battleShip')) battleShipCount++;
      if(obj.includes('carrier')) carrierCount++;
    }
    if(obj.includes('taken')){
      enemySquare.classList.add('boom');
    }else{
      enemySquare.classList.add('miss');
    }
    checkForWins();
    currentPlayer = 'enemy';
    if(gameMode === 'singlePlayer') playGameSingle();
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleShipCount = 0
  let cpuCarrierCount = 0

  function enemyGo(square){
    if(gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length);
    if(!userSquares[square].classList.contains('boom')){
      userSquares[square].classList.add('boom');
      if(userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++;
      if(userSquares[square].classList.contains('submarine')) cpuSubmarineCount++;
      if(userSquares[square].classList.contains('cruiser')) cpuCruiserCount++;
      if(userSquares[square].classList.contains('battleShip')) cpuBattleShipCount++;
      if(userSquares[square].classList.contains('carrier')) cpuCarrierCount++;
      checkForWins();
    }else if(gameMode === 'singlePlayer') enemyGo()

    currentPlayer = 'user';
    turnDisplay.innerHTML = 'Your Go';
  }

  function checkForWins (){
    if(destroyerCount === 2){
      infoDisplay.innerHTML = 'You sunk enemy destroyer';
      destroyerCount = 10;
    }
    if(submarineCount === 3){
      infoDisplay.innerHTML = 'You sunk enemy submarine';
      submarineCount = 10;
    }
    if(cruiserCount === 3){
      infoDisplay.innerHTML = 'You sunk enemy cruiser';
      cruiserCount = 10;
    }
    if(battleShipCount === 4){
      infoDisplay.innerHTML = 'You sunk enemy battleship';
      battleShipCount = 10;
    }
    if(carrierCount === 5){
      infoDisplay.innerHTML = 'You sunk enemy carrier';
      carrierCount = 10;
    }
    ////////////////////////////////
    if(cpuDestroyerCount === 2){
      infoDisplay.innerHTML = 'Enemy sunk your destroyer';
      cpuDestroyerCount = 10;
    }
    if(cpuSubmarineCount === 3){
      infoDisplay.innerHTML = 'Enemy sunk your submarine';
      cpuSubmarineCount = 10;
    }
    if(cpuCruiserCount === 3){
      infoDisplay.innerHTML = 'Enemy sunk your cruiser';
      cpuCruiserCount = 10;
    }
    if(cpuBattleShipCount === 4){
      infoDisplay.innerHTML = 'Enemy sunk your battleship';
      cpuBattleShipCount = 10;
    }
    if(cpuCarrierCount === 5){
      infoDisplay.innerHTML = 'Enemy sunk your carrier';
      cpuCarrierCount = 10;
    }
    if((destroyerCount + submarineCount + cruiserCount + battleShipCount + carrierCount) === 50){
        infoDisplay.innerHTML= 'You Win';
        gameOver();
    }
    if((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleShipCount + cpuCarrierCount) === 50){
        infoDisplay.innerHTML = 'Enemy Wins';
        gameOver();
    }
  }

  function gameOver(){
    isGameOver = true;
    startButton.removeEventListener('click', playGameSingle)
  }

})

