
// Types
interface Object {
  x: number;
  y: number;
}

type Player = Object & { id: number, score: number };

interface GameState {
  ball: Object;
  player: Player;
  opponent: Player;
}

interface InputState {
  up: boolean;
  down: boolean;
}

// Constants
const BALL_SPEED = 100
const BALL_RADIUS = 10
const PLAYER_SPEED = 0.1
const PLAYER_WIDTH = 10
const PLAYER_HEIGHT = 100

const COURT_WIDTH = 800
const COURT_HEIGHT = 600

// State
const gameState: GameState = {
  ball: { x: 10, y: 10 },
  player: { x: 0, y: 0, id: 0, score: 0 },
  opponent: { x: 0, y: 0, id: 0, score: 0 },
};

const inputState: InputState = {
  up: false,
  down: false,
};

// Websocket
const ws = new WebSocket("ws://localhost:5000/game?id=1");
ws.binaryType = "arraybuffer";

// Connection opened
ws.addEventListener("open", (event) => {
  console.log("Connected to server.");
});

// Listen for messages
ws.addEventListener("message", (event) => {
  const buffer = event.data as ArrayBuffer;
  const view = new DataView(buffer);

  const numPlayers = (view.byteLength - (4 + 8)) / 16;
  // First 4 bytes is the player id on this client, then 2 players
  const myId = view.getInt32(0, true);
  const players: Array<Player> = Array.from({ length: numPlayers }).map((_, i) => ({
    id: view.getInt32(4 + i * 16, true),
    score: view.getInt32(8 + i * 16, true),
    x: view.getFloat32(12 + i * 16, true),
    y: view.getFloat32(16 + i * 16, true),
  }) as Player);

  const ball = {
    x: view.getFloat32(4 + numPlayers * 16, true),
    y: view.getFloat32(8 + numPlayers * 16, true),
  };

  // Update game state
  gameState.player = players.find((player) => player.id === myId);
  gameState.opponent = players.find((player) => player.id !== myId);
  gameState.ball = ball;
});

// Canvas
const canvas = document.getElementById("game") as HTMLCanvasElement;

// Input
const updateAndSendInput = ({ up, down }: { up?: boolean, down?: boolean }) => {
  if (up !== undefined) {
    inputState.up = up;
  }

  if (down !== undefined) {
    inputState.down = down;
  }

  // Write bytes to buffer, 1 is pressed, 0 is not pressed
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint8(0, inputState.up ? 1 : 0);
  view.setUint8(1, inputState.down ? 1 : 0);

  // Send buffer to server
  console.log("Sent input to server.");
  ws.send(buffer);
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  switch (event.key) {
    case "ArrowUp":
      updateAndSendInput({ up: true });
      break;
    case "ArrowDown":
      updateAndSendInput({ down: true });
      break;
  }
}, false);

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "ArrowUp":
      updateAndSendInput({ up: false });
      break;
    case "ArrowDown":
      updateAndSendInput({ down: false });
      break;
  }
}, false);

// Render
const ctx = canvas.getContext("2d");
const render = () => {
  requestAnimationFrame(render);

  ctx.fillStyle = "#ffffff";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gameState?.player?.x >= 0 && gameState?.player?.y >= 0) {
    ctx.fillRect(gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  if (gameState?.opponent?.x >= 0 && gameState?.opponent?.y >= 0) {
    ctx.fillRect(gameState.opponent.x, gameState.opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  if (gameState?.ball?.x >= 0 && gameState?.ball?.y >= 0) {
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Middle line
  ctx.fillRect(canvas.width / 2, 0, 1, canvas.height);

  // Score
  ctx.font = "30px Arial";

  const isPlayerOnLeft = gameState?.player?.x < canvas.width / 2;

  if (gameState?.player?.score !== undefined) {
    ctx.fillText(gameState.player.score.toString(), isPlayerOnLeft ? canvas.width / 4 : canvas.width / 4 * 3, 30);
  }

  if (gameState?.opponent?.score !== undefined) {
    ctx.fillText(gameState.opponent.score.toString(), isPlayerOnLeft ? canvas.width / 4 * 3 : canvas.width / 4, 30);
  }
};

render();
