var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// Constants
var BALL_SPEED = 175;
var BALL_RADIUS = 10;
var BALL_FLASH_COLOR_1 = [255, 255, 0];
var BALL_FLASH_COLOR_2 = [255, 0, 0];
var PLAYER_SPEED = 100;
var PLAYER_WIDTH = 10;
var PLAYER_HEIGHT = 100;
var COURT_WIDTH = 800;
var COURT_HEIGHT = 600;
var MAX_INPUT_BUFFER_SIZE = 10;
var SOUNDS = {
    hit: {
        playbackRate: 1.5,
    },
    smash: {
        playbackRate: 1.0,
    },
    win: {
        playbackRate: 1.5,
    },
    lose: {
        playbackRate: 1.5,
    },
};
// Resources
var playableSounds = Object.fromEntries(Object.entries(SOUNDS).map(function (_a) {
    var sound = _a[0], settings = _a[1];
    try {
        var audio = document.getElementById(sound);
        if (audio !== null) {
            audio.load();
            audio.loop = false;
            audio.volume = 0.5;
            audio.playbackRate = settings.playbackRate;
        }
        return [sound, audio];
    }
    catch (error) {
        return [sound, null];
    }
}).filter(function (_a) {
    var audio = _a[1];
    return audio !== null;
}));
var playSound = function (sound) {
    var audio = playableSounds[sound];
    if (audio === undefined || audio === null) {
        return;
    }
    try {
        audio.play();
    }
    catch (error) {
        alert("Could not play sound.");
    }
};
// State
var gameState = {
    ball: { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2, isSmahed: false },
    player: { x: 0, y: 0, id: 0, score: 0 },
    opponent: { x: 0, y: 0, id: 0, score: 0 },
};
var inputState = {
    up: false,
    down: false,
};
var isConnected = false;
// Get game id from url
var urlParams = new URLSearchParams(window.location.search);
var gameId = urlParams.get("id");
if (!gameId) {
    throw new Error("No game id in url.");
}
// Websocket
var ws = new WebSocket("ws://165.22.204.103:8080/play?id=" + gameId);
ws.binaryType = "arraybuffer";
// Connection opened
ws.addEventListener("open", function (event) {
    console.log("Connected to server.");
    isConnected = true;
});
// Connection closed
ws.addEventListener("close", function (event) {
    console.log("Disconnected from server.");
    isConnected = false;
});
// Listen for messages
ws.addEventListener("message", function (event) {
    var buffer = event.data;
    var view = new DataView(buffer);
    var numPlayers = (view.byteLength - (4 + 4 + 8 + 3)) / 16;
    // First 4 bytes is the player id on this client, then 2 players
    var myId = view.getInt32(0, true);
    var sequenceNumber = view.getUint32(4, true);
    var players = Array.from({ length: numPlayers }).map(function (_, i) { return ({
        id: view.getInt32(8 + i * 16, true),
        score: view.getInt32(12 + i * 16, true),
        x: view.getFloat32(16 + i * 16, true),
        y: view.getFloat32(20 + i * 16, true),
    }); });
    var ball = {
        x: view.getFloat32(8 + numPlayers * 16, true),
        y: view.getFloat32(12 + numPlayers * 16, true),
    };
    // Flags
    var ballCollided = view.getUint8(8 + numPlayers * 16 + 8) === 1;
    var ballWasSmahed = view.getUint8(8 + numPlayers * 16 + 9) === 1;
    var newRound = view.getUint8(8 + numPlayers * 16 + 10) === 1;
    // Get previous score
    var lastPlayerScore = gameState.player.score;
    // Update game state
    gameState.player = players.find(function (player) { return player.id === myId; });
    gameState.player = __assign(__assign({}, gameState.player), getPlayerPosition(gameState.player.x, gameState.player.y, sequenceNumber));
    gameState.opponent = players.find(function (player) { return player.id !== myId; });
    gameState.ball = __assign(__assign({}, gameState.ball), ball);
    var playerScored = gameState.player.score > lastPlayerScore;
    // Fire events based on flags
    if (ballCollided && !ballWasSmahed) {
        playSound("hit");
    }
    else if (ballWasSmahed) {
        playSound("smash");
    }
    if (newRound) {
        if (playerScored) {
            playSound("win");
        }
        else {
            playSound("lose");
        }
    }
    if (ballWasSmahed) {
        gameState.ball.isSmahed = true;
    }
    else if (newRound) {
        gameState.ball.isSmahed = false;
    }
});
// Find the last acknowledged input, remove all inputs before that, and replay all inputs after that to get the current position
var getPlayerPosition = function (serverX, serverY, sequenceNumber) {
    var lastAcknowledgedInputIndex = inputBuffer.findIndex(function (input) { return input.sequenceNumber === sequenceNumber; });
    var lastAcknowledgedInput = inputBuffer[lastAcknowledgedInputIndex];
    if (!lastAcknowledgedInput) {
        return { x: serverX, y: serverY };
    }
    var inputsToReplay = inputBuffer.filter(function (iu) { return iu.timestamp > lastAcknowledgedInput.timestamp; });
    var position = { x: serverX, y: serverY };
    inputsToReplay.forEach(function (input, i) {
        // Find delta in time between current and next input, except for the last input, where we use the time until now
        var timeDelta = 0;
        if (i === inputsToReplay.length - 1) {
            timeDelta = Date.now() - input.timestamp;
        }
        else {
            var nextInput = inputsToReplay[i + 1];
            timeDelta = nextInput.timestamp - input.timestamp;
        }
        // From milliseconds to seconds
        timeDelta /= 1000;
        // Calculate new position based on input
        var distance = timeDelta * PLAYER_SPEED;
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
};
// Canvas
var canvas = document.getElementById("game");
// Input
var inputBuffer = [];
var lastInputSequenceNumber = 0;
var handleInput = function (_a) {
    var up = _a.up, down = _a.down;
    if (up !== undefined) {
        inputState.up = up;
    }
    if (down !== undefined) {
        inputState.down = down;
    }
    var update = {
        up: inputState.up,
        down: inputState.down,
        timestamp: Date.now(),
        sequenceNumber: lastInputSequenceNumber,
    };
    // Write bytes to buffer, 1 is pressed, 0 is not pressed, with sequence number and timestamp at the end
    var buffer = new ArrayBuffer(2 + 8 + 4);
    var view = new DataView(buffer);
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
};
window.addEventListener("keydown", function (event) {
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
window.addEventListener("keyup", function (event) {
    switch (event.key) {
        case "ArrowUp":
            handleInput({ up: false });
            break;
        case "ArrowDown":
            handleInput({ down: false });
            break;
    }
}, false);
window.addEventListener("touchstart", function (event) {
    if (event.touches[0].clientY < canvas.height / 2) {
        handleInput({ up: true });
    }
    else {
        handleInput({ down: true });
    }
}, false);
window.addEventListener("touchend", function (event) {
    handleInput({ up: false, down: false });
}, false);
window.addEventListener("touchcancel", function (event) {
    handleInput({ up: false, down: false });
}, false);
window.addEventListener("touchmove", function (event) {
    if (event.touches[0].clientY < canvas.height / 2) {
        handleInput({ up: true });
    }
    else {
        handleInput({ down: true });
    }
}, false);
// Update and Render
var ctx = canvas.getContext("2d");
if (!ctx) {
    throw new Error("Could not get canvas context.");
}
ctx.textAlign = "center";
var lastTime = Date.now();
var avgFpsBufferSize = 10;
var avgFpsBuffer = [];
var fps = "";
var loop = function () {
    requestAnimationFrame(loop);
    // Update delta time
    var time = Date.now();
    var timeDelta = (time - lastTime) / 1000;
    lastTime = time;
    // Calculate fps
    avgFpsBuffer.push(1.0 / timeDelta);
    if (avgFpsBuffer.length > avgFpsBufferSize) {
        fps = Math.round(avgFpsBuffer.reduce(function (a, b) { return a + b; }, 0) / avgFpsBufferSize).toString();
        avgFpsBuffer = [];
    }
    // Update
    if (isConnected) {
        update(timeDelta);
    }
    // Render
    render();
};
var update = function (timeDelta) {
    // Move player
    var distance = timeDelta * PLAYER_SPEED;
    var integrated = gameState.player.y;
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
var render = function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw fps
    ctx.font = "20px monospace";
    ctx.fillText(fps, 20, 20);
    if (!isConnected) {
        ctx.font = "20px monospace";
        ctx.fillText("Not connected to server.", canvas.width / 2, canvas.height / 2);
        return;
    }
    if (((_a = gameState === null || gameState === void 0 ? void 0 : gameState.player) === null || _a === void 0 ? void 0 : _a.x) >= 0 && ((_b = gameState === null || gameState === void 0 ? void 0 : gameState.player) === null || _b === void 0 ? void 0 : _b.y) >= 0) {
        ctx.fillRect(gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }
    if (((_c = gameState === null || gameState === void 0 ? void 0 : gameState.opponent) === null || _c === void 0 ? void 0 : _c.x) >= 0 && ((_d = gameState === null || gameState === void 0 ? void 0 : gameState.opponent) === null || _d === void 0 ? void 0 : _d.y) >= 0) {
        ctx.fillRect(gameState.opponent.x, gameState.opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    }
    if (((_e = gameState === null || gameState === void 0 ? void 0 : gameState.ball) === null || _e === void 0 ? void 0 : _e.x) >= 0 && ((_f = gameState === null || gameState === void 0 ? void 0 : gameState.ball) === null || _f === void 0 ? void 0 : _f.y) >= 0) {
        if (gameState.ball.isSmahed) {
            var currentTime = Date.now();
            var sineValue = Math.sin(currentTime / 100);
            var cosineValue = Math.cos(currentTime / 100);
            var interpolatedColor = [
                Math.floor(BALL_FLASH_COLOR_1[0] + (BALL_FLASH_COLOR_2[0] - BALL_FLASH_COLOR_1[0]) * (0.5 + 0.5 * sineValue)),
                Math.floor(BALL_FLASH_COLOR_1[1] + (BALL_FLASH_COLOR_2[1] - BALL_FLASH_COLOR_1[1]) * (0.5 + 0.5 * sineValue)),
                Math.floor(BALL_FLASH_COLOR_1[2] + (BALL_FLASH_COLOR_2[2] - BALL_FLASH_COLOR_1[2]) * (0.5 + 0.5 * cosineValue))
            ];
            ctx.fillStyle = "rgb(".concat(interpolatedColor.join(', '), ")");
        }
        else {
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
    var isPlayerOnLeft = ((_g = gameState === null || gameState === void 0 ? void 0 : gameState.player) === null || _g === void 0 ? void 0 : _g.x) < canvas.width / 2;
    if (((_h = gameState === null || gameState === void 0 ? void 0 : gameState.player) === null || _h === void 0 ? void 0 : _h.score) !== undefined) {
        ctx.fillText(gameState.player.score.toString(), isPlayerOnLeft ? canvas.width / 4 : canvas.width / 4 * 3, 50);
    }
    if (((_j = gameState === null || gameState === void 0 ? void 0 : gameState.opponent) === null || _j === void 0 ? void 0 : _j.score) !== undefined) {
        ctx.fillText(gameState.opponent.score.toString(), isPlayerOnLeft ? canvas.width / 4 * 3 : canvas.width / 4, 50);
    }
};
requestAnimationFrame(loop);
