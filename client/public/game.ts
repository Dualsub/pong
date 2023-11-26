
// Types
interface Object {
    x: number;
    y: number;
}

type Player = Object & { id: number, score: number };
type Ball = Object & { isSmahed: boolean };

interface GameState {
    ball: Ball;
    player: Player;
    opponent: Player;
}

interface InputState {
    up: boolean;
    down: boolean;
}

type InputUpdate = InputState & {
    timestamp: number;
    sequenceNumber: number;
}

// Constants
const BALL_SPEED = 175
const BALL_RADIUS = 10
const BALL_FLASH_COLOR_1 = [255, 255, 0];
const BALL_FLASH_COLOR_2 = [255, 0, 0];

const PLAYER_SPEED = 100
const PLAYER_WIDTH = 10
const PLAYER_HEIGHT = 100

const COURT_WIDTH = 800
const COURT_HEIGHT = 600

const MAX_INPUT_BUFFER_SIZE = 10;
const SOUNDS = {
    hit: {
        playrate: 1.5,
    },
    smash: {
        playrate: 1.0,
    },
    win: {
        playrate: 1.5,
    },
    lose: {
        playrate: 1.5,
    },
};

// Resources
const playableSounds = Object.fromEntries(Object.entries(SOUNDS).map(([sound, settings]) => {
    const audio = document.getElementById(sound) as HTMLAudioElement;
    if (audio !== null) {
        audio.load();
        audio.loop = false;
        audio.volume = 0.5;
        audio.playbackRate = settings.playrate;
    }
    return [sound, audio];
}).filter(([, audio]) => audio !== null) as Array<[string, HTMLAudioElement]>);

const playSound = (sound: string) => {
    const audio = playableSounds[sound];
    if (audio === undefined) {
        return;
    }
    audio.play();
}

// State
const gameState: GameState = {
    ball: { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2, isSmahed: false },
    player: { x: 0, y: 0, id: 0, score: 0 },
    opponent: { x: 0, y: 0, id: 0, score: 0 },
};

const inputState: InputState = {
    up: false,
    down: false,
};

let isConnected = false;

// Get game id from url
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("id");
if (!gameId) {
    throw new Error("No game id in url.");
}

// Websocket
const ws = new WebSocket("ws://192.168.1.25:5000/play?id=" + gameId);
ws.binaryType = "arraybuffer";

// Connection opened
ws.addEventListener("open", (event) => {
    console.log("Connected to server.");
    isConnected = true;
});

// Connection closed
ws.addEventListener("close", (event) => {
    console.log("Disconnected from server.");
    isConnected = false;
});

// Listen for messages
ws.addEventListener("message", (event) => {
    const buffer = event.data as ArrayBuffer;
    const view = new DataView(buffer);

    const numPlayers = (view.byteLength - (4 + 4 + 8 + 3)) / 16;
    // First 4 bytes is the player id on this client, then 2 players
    const myId = view.getInt32(0, true);
    const sequenceNumber = view.getUint32(4, true);

    const players: Array<Player> = Array.from({ length: numPlayers }).map((_, i) => ({
        id: view.getInt32(8 + i * 16, true),
        score: view.getInt32(12 + i * 16, true),
        x: view.getFloat32(16 + i * 16, true),
        y: view.getFloat32(20 + i * 16, true),
    }) as Player);

    const ball = {
        x: view.getFloat32(8 + numPlayers * 16, true),
        y: view.getFloat32(12 + numPlayers * 16, true),
    };

    // Flags
    const ballCollided = view.getUint8(8 + numPlayers * 16 + 8) === 1;
    const ballWasSmahed = view.getUint8(8 + numPlayers * 16 + 9) === 1;
    const newRound = view.getUint8(8 + numPlayers * 16 + 10) === 1;

    // Get previous score
    const lastPlayerScore = gameState.player.score;

    // Update game state
    gameState.player = players.find((player) => player.id === myId) as Player;
    gameState.player = { ...gameState.player, ...getPlayerPosition(gameState.player.x, gameState.player.y, sequenceNumber) };
    gameState.opponent = players.find((player) => player.id !== myId) as Player;
    gameState.ball = { ...gameState.ball, ...ball };

    const playerScored = gameState.player.score > lastPlayerScore;

    // Fire events based on flags
    if (ballCollided && !ballWasSmahed) {
        playSound("hit");
    } else if (ballWasSmahed) {
        playSound("smash");
    }

    if (newRound) {
        if (playerScored) {
            playSound("win");
        } else {
            playSound("lose");
        }
    }

    if (ballWasSmahed) {
        gameState.ball.isSmahed = true;
    } else if (newRound) {
        gameState.ball.isSmahed = false;
    }
});

// Find the last acknowledged input, remove all inputs before that, and replay all inputs after that to get the current position
const getPlayerPosition = (serverX: number, serverY: number, sequenceNumber: number) => {
    const lastAcknowledgedInputIndex = inputBuffer.findIndex((input) => input.sequenceNumber === sequenceNumber);
    const lastAcknowledgedInput = inputBuffer[lastAcknowledgedInputIndex];
    if (!lastAcknowledgedInput) {
        return { x: serverX, y: serverY };
    }

    const inputsToReplay = inputBuffer.filter(iu => iu.timestamp > lastAcknowledgedInput.timestamp);

    let position = { x: serverX, y: serverY };
    inputsToReplay.forEach((input, i) => {
        // Find delta in time between current and next input, except for the last input, where we use the time until now
        let timeDelta = 0;
        if (i === inputsToReplay.length - 1) {
            timeDelta = Date.now() - input.timestamp;
        }
        else {
            const nextInput = inputsToReplay[i + 1];
            timeDelta = nextInput.timestamp - input.timestamp;
        }

        // From milliseconds to seconds
        timeDelta /= 1000;

        // Calculate new position based on input
        const distance = timeDelta * PLAYER_SPEED;
        if (input.up) {
            position.y -= distance;
        }
        else if (input.down) {
            position.y += distance;
        }
    });

    // Clamp position
    position.y = Math.max(0, position.y);
    position.y = Math.min(COURT_HEIGHT - PLAYER_HEIGHT, position.y);

    return position;
}

// Canvas
const canvas = document.getElementById("game") as HTMLCanvasElement;

// Input
const inputBuffer: Array<InputUpdate> = [];
var lastInputSequenceNumber = 0;

const handleInput = ({ up, down }: { up?: boolean, down?: boolean }) => {
    if (up !== undefined) {
        inputState.up = up;
    }

    if (down !== undefined) {
        inputState.down = down;
    }

    const update: InputUpdate = {
        up: inputState.up,
        down: inputState.down,
        timestamp: Date.now(),
        sequenceNumber: lastInputSequenceNumber,
    }

    // Write bytes to buffer, 1 is pressed, 0 is not pressed, with sequence number and timestamp at the end
    const buffer = new ArrayBuffer(2 + 8 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, update.up ? 1 : 0);
    view.setUint8(1, update.down ? 1 : 0);
    view.setBigInt64(2, BigInt(update.timestamp), true);
    view.setUint32(10, update.sequenceNumber, true);

    // Send buffer to server
    console.log("Sent input to server:", update.timestamp);
    ws.send(buffer);

    lastInputSequenceNumber = (lastInputSequenceNumber + 1) % MAX_INPUT_BUFFER_SIZE;
    inputBuffer.push(update);

    if (inputBuffer.length > MAX_INPUT_BUFFER_SIZE) {
        inputBuffer.shift();
    }
}

window.addEventListener("keydown", (event) => {
    if (event.repeat) {
        return;
    }
    switch (event.key) {
        case "ArrowUp":
            handleInput({ up: true });
            break;
        case "ArrowDown":
            handleInput({ down: true });
            break;
    }
}, false);

window.addEventListener("keyup", (event) => {
    switch (event.key) {
        case "ArrowUp":
            handleInput({ up: false });
            break;
        case "ArrowDown":
            handleInput({ down: false });
            break;
    }
}, false);

window.addEventListener("touchstart", (event) => {
    if (event.touches[0].clientY < canvas.height / 2) {
        handleInput({ up: true });
    } else {
        handleInput({ down: true });
    }
}, false);

window.addEventListener("touchend", (event) => {
    handleInput({ up: false, down: false });
}, false);

window.addEventListener("touchcancel", (event) => {
    handleInput({ up: false, down: false });
}, false);

window.addEventListener("touchmove", (event) => {
    if (event.touches[0].clientY < canvas.height / 2) {
        handleInput({ up: true });
    } else {
        handleInput({ down: true });
    }
}, false);

// Update and Render

const ctx = canvas.getContext("2d");
if (!ctx) {
    throw new Error("Could not get canvas context.");
}
ctx.textAlign = "center";
let lastTime = Date.now();

const avgFpsBufferSize = 10;
let avgFpsBuffer: Array<number> = [];
let fps = "";

const loop = () => {
    requestAnimationFrame(loop);

    // Update delta time
    const time = Date.now();
    const timeDelta = (time - lastTime) / 1000;
    lastTime = time;

    // Calculate fps
    avgFpsBuffer.push(1.0 / timeDelta);
    if (avgFpsBuffer.length > avgFpsBufferSize) {
        fps = Math.round(avgFpsBuffer.reduce((a, b) => a + b, 0) / avgFpsBufferSize).toString();
        avgFpsBuffer = [];
    }

    // Update
    if (isConnected) {
        update(timeDelta);
    }

    // Render
    render();
};

const update = (timeDelta: number) => {
    // Move player
    const distance = timeDelta * PLAYER_SPEED;
    let integrated = gameState.player.y;
    if (inputState.up) {
        integrated -= distance;
    }

    if (inputState.down) {
        integrated += distance;
    }

    // Clamp player position
    integrated = Math.max(0, integrated);
    integrated = Math.min(COURT_HEIGHT - PLAYER_HEIGHT, integrated);

    // Update player position
    gameState.player.y = integrated;
};

const render = () => {
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw fps
    ctx.font = "20px monospace";
    ctx.fillText(fps, 20, 20);

    if (!isConnected) {
        ctx.font = "20px monospace";
        ctx.fillText("Not connected to server.", canvas.width / 2, canvas.height / 2);
        return
    }

    if (gameState?.player?.x >= 0 && gameState?.player?.y >= 0) {
        ctx.fillRect(gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }

    if (gameState?.opponent?.x >= 0 && gameState?.opponent?.y >= 0) {
        ctx.fillRect(gameState.opponent.x, gameState.opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }

    if (gameState?.ball?.x >= 0 && gameState?.ball?.y >= 0) {
        if (gameState.ball.isSmahed) {
            const currentTime = Date.now();
            const sineValue = Math.sin(currentTime / 100);
            const cosineValue = Math.cos(currentTime / 100);

            const interpolatedColor = [
                Math.floor(BALL_FLASH_COLOR_1[0] + (BALL_FLASH_COLOR_2[0] - BALL_FLASH_COLOR_1[0]) * (0.5 + 0.5 * sineValue)),
                Math.floor(BALL_FLASH_COLOR_1[1] + (BALL_FLASH_COLOR_2[1] - BALL_FLASH_COLOR_1[1]) * (0.5 + 0.5 * sineValue)),
                Math.floor(BALL_FLASH_COLOR_1[2] + (BALL_FLASH_COLOR_2[2] - BALL_FLASH_COLOR_1[2]) * (0.5 + 0.5 * cosineValue))
            ];

            ctx.fillStyle = `rgb(${interpolatedColor.join(', ')})`;

        } else {
            ctx.fillStyle = "#ffffff";
        }

        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
    }

    // Middle line
    ctx.fillRect(canvas.width / 2, 0, 1, canvas.height);

    // Use cool retro font
    ctx.font = "40px monospace";

    const isPlayerOnLeft = gameState?.player?.x < canvas.width / 2;

    if (gameState?.player?.score !== undefined) {
        ctx.fillText(gameState.player.score.toString(), isPlayerOnLeft ? canvas.width / 4 : canvas.width / 4 * 3, 50);
    }

    if (gameState?.opponent?.score !== undefined) {
        ctx.fillText(gameState.opponent.score.toString(), isPlayerOnLeft ? canvas.width / 4 * 3 : canvas.width / 4, 50);
    }
};

requestAnimationFrame(loop);
