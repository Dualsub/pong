package main

import (
	"bytes"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"math"
	mathrand "math/rand"
	"time"

	"github.com/gorilla/websocket"
)

// 60 Hz
const SESSION_DELTA_TIME = 16666666 * time.Nanosecond

const BALL_SPEED = 175
const MAX_BALL_SPEED_FACTOR = 10
const BALL_SPEED_RATE = 1.018
const BALL_RADIUS = 10

const PLAYER_SPEED = 150
const PLAYER_WIDTH = 10
const PLAYER_HEIGHT = 100

const COURT_WIDTH = 800
const COURT_HEIGHT = 600

const MAX_PLAYERS = 2

// Save some calculations :)
const INV_SQRT_2 = 1.0 / math.Sqrt2

type InputState struct {
	UpPressed   bool
	DownPressed bool
	Timestamp   time.Time
	Sequence    uint32
}

type InputUpdate struct {
	PlayerId   int32
	InputState InputState
}

type Player struct {
	Id          int32
	Connection  *websocket.Conn
	Score       int32
	X           float32
	Y           float32
	InputStates []InputState
	Session     *GameSession
	Ready       chan bool
}

type Ball struct {
	X         float32
	Y         float32
	VelocityX float32
	VelocityY float32
}

type GameSession struct {
	Id               int
	Players          map[int32]*Player
	Ball             Ball
	Time             time.Duration
	RegisterPlayer   chan *Player
	UnregisterPlayer chan *Player
	RegisterInput    chan InputUpdate
	Sessions         *Sessions
}

func Clamp(f float32, min float32, max float32) float32 {
	if f < min {
		return min
	}
	if f > max {
		return max
	}

	return f
}

func NewGameSession(id int) *GameSession {
	return &GameSession{
		Id:      id,
		Players: make(map[int32]*Player),
		Ball: Ball{
			X:         float32(COURT_WIDTH / 2),
			Y:         float32((COURT_HEIGHT-2*BALL_RADIUS)*mathrand.Float32() + BALL_RADIUS),
			VelocityX: BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1),
			VelocityY: BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1),
		},
		Time:             0,
		RegisterPlayer:   make(chan *Player),
		UnregisterPlayer: make(chan *Player),
		RegisterInput:    make(chan InputUpdate),
	}
}

func (gs *GameSession) AddPlayer(player *Player) {
	// Check if session is full
	if len(gs.Players) >= MAX_PLAYERS {
		player.Ready <- false
		return
	}

	// Generate random id using rand package
	b := make([]byte, 4)
	rand.Read(b)
	player.Id = int32(b[0])<<24 | int32(b[1])<<16 | int32(b[2])<<8 | int32(b[3])

	// Check if other player is on the left or right
	if len(gs.Players) == 1 {
		for _, otherPlayer := range gs.Players {
			if otherPlayer.X < float32(COURT_WIDTH/2) {
				player.X = float32(COURT_WIDTH - PLAYER_WIDTH)
			} else {
				player.X = 0
			}
		}
	} else {
		player.X = 0
	}

	player.Y = float32(COURT_HEIGHT/2 - PLAYER_HEIGHT/2)

	// Add player to session
	gs.Players[player.Id] = player
	player.Ready <- true

	fmt.Println("Player added")
}

func (gs *GameSession) RemovePlayer(player *Player) {
	delete(gs.Players, player.Id)
	fmt.Println("Player removed")
}

func (gs *GameSession) AddPlayerInput(inputUpdate InputUpdate) {
	player, ok := gs.Players[inputUpdate.PlayerId]
	if !ok {
		fmt.Println("Player not found")
		return
	}

	player.InputStates = append(player.InputStates, inputUpdate.InputState)
}

func ReadInput(p []byte, playerId int32) InputUpdate {
	var rawInputState struct { // 2 bytes
		UpPressed   byte
		DownPressed byte
		Timestamp   int64 // Retrieved on client side using Date.now()
		Sequence    uint32
	}

	if err := binary.Read(bytes.NewReader(p), binary.LittleEndian, &rawInputState); err != nil {
		panic(err)
	}

	timestamp := time.Unix(0, rawInputState.Timestamp*int64(time.Millisecond))

	return InputUpdate{
		PlayerId: playerId,
		InputState: InputState{
			UpPressed:   rawInputState.UpPressed == 1,
			DownPressed: rawInputState.DownPressed == 1,
			Timestamp:   timestamp,
			Sequence:    rawInputState.Sequence,
		},
	}
}

func (gs *GameSession) Update(dt time.Duration) {
	gs.Time += dt
	now := time.Now()
	// Replay all inputs, integrating player positions
	for _, player := range gs.Players {
		// Take into consideration the time since the last update
		integrated := player.Y
		for i := 0; i < len(player.InputStates); i++ {
			inputState := player.InputStates[i]
			inputDelta := time.Duration(0)
			if i == len(player.InputStates)-1 {
				inputDelta = now.Sub(inputState.Timestamp)
			} else {
				nextInputState := player.InputStates[i+1]
				inputDelta = nextInputState.Timestamp.Sub(inputState.Timestamp)
			}

			// Integrate
			if inputState.UpPressed {
				integrated -= PLAYER_SPEED * float32(inputDelta.Seconds())
			}
			if inputState.DownPressed {
				integrated += PLAYER_SPEED * float32(inputDelta.Seconds())
			}
		}

		// Check for collisions
		if integrated < 0 {
			integrated = 0
		}

		if integrated > float32(COURT_HEIGHT-PLAYER_HEIGHT) {
			integrated = float32(COURT_HEIGHT - PLAYER_HEIGHT)
		}

		// Update player position
		player.Y = integrated

		// Remove everything except the last input state
		if len(player.InputStates) > 1 {
			player.InputStates = player.InputStates[len(player.InputStates)-1:]
		}
	}

	// Update ball position
	velocityScale := float32(math.Pow(BALL_SPEED_RATE, float64(gs.Time.Seconds())))
	if velocityScale > MAX_BALL_SPEED_FACTOR {
		velocityScale = MAX_BALL_SPEED_FACTOR
	}

	gs.Ball.X = Clamp(gs.Ball.X+gs.Ball.VelocityX*float32(dt.Seconds())*velocityScale, -BALL_RADIUS, float32(COURT_WIDTH+BALL_RADIUS))
	gs.Ball.Y = Clamp(gs.Ball.Y+gs.Ball.VelocityY*float32(dt.Seconds())*velocityScale, -BALL_RADIUS, float32(COURT_HEIGHT+BALL_RADIUS))

	// Check for collisions
	if gs.Ball.Y < BALL_RADIUS {
		gs.Ball.Y = BALL_RADIUS
		gs.Ball.VelocityY *= -1
	}

	if gs.Ball.Y > float32(COURT_HEIGHT-BALL_RADIUS) {
		gs.Ball.Y = float32(COURT_HEIGHT - BALL_RADIUS)
		gs.Ball.VelocityY *= -1
	}

	// Check for player collisions
	for _, player := range gs.Players {
		// Test collision with ball radius taken into account
		if (gs.Ball.X-BALL_RADIUS < player.X+PLAYER_WIDTH) && (gs.Ball.X+BALL_RADIUS > player.X) && (gs.Ball.Y-BALL_RADIUS < player.Y+PLAYER_HEIGHT) && (gs.Ball.Y+BALL_RADIUS > player.Y) {
			gs.Ball.VelocityX *= -1
		}
	}

	// Check if ball is out of bounds, then which player is furthest away
	if gs.Ball.X < 0 || gs.Ball.X > float32(COURT_WIDTH) {
		// Find player furthest away from ball
		var furthestPlayer *Player
		for _, player := range gs.Players {
			if furthestPlayer == nil {
				furthestPlayer = player
			} else {
				if float32(math.Abs(float64(player.X-gs.Ball.X))) > float32(math.Abs(float64(furthestPlayer.X-gs.Ball.X))) {
					furthestPlayer = player
				}
			}
		}

		// Increment furthest player score
		furthestPlayer.Score++

		// Reset ball position
		gs.Ball.X = float32(COURT_WIDTH / 2)
		gs.Ball.Y = float32((COURT_HEIGHT-2*BALL_RADIUS)*mathrand.Float32() + BALL_RADIUS)

		// Reset ball velocity

		gs.Ball.VelocityX = BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1)
		gs.Ball.VelocityY = BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1)

		// Reset time
		gs.Time = 0

		// Reset player positions
		for _, player := range gs.Players {
			player.Y = float32(COURT_HEIGHT/2 - PLAYER_HEIGHT/2)
		}
	}

}

func (gs *GameSession) Broadcast() {
	// Send player positions
	var buffer bytes.Buffer

	for _, player := range gs.Players {
		playerData := struct {
			Id    int32
			Score int32
			X     float32
			Y     float32
		}{
			Id:    player.Id,
			Score: player.Score,
			X:     player.X,
			Y:     player.Y,
		}

		if err := binary.Write(&buffer, binary.LittleEndian, playerData); err != nil {
			panic(err)
		}
	}

	// Send ball position
	if err := binary.Write(&buffer, binary.LittleEndian, gs.Ball.X); err != nil {
		panic(err)
	}
	if err := binary.Write(&buffer, binary.LittleEndian, gs.Ball.Y); err != nil {
		panic(err)
	}

	for _, player := range gs.Players {
		// Prepend player id to message and send
		var playerBuffer bytes.Buffer
		if err := binary.Write(&playerBuffer, binary.LittleEndian, player.Id); err != nil {
			panic(err)
		}

		var lastSequence uint32 = 0
		if len(player.InputStates) > 0 {
			lastSequence = player.InputStates[len(player.InputStates)-1].Sequence
		}

		if err := binary.Write(&playerBuffer, binary.LittleEndian, lastSequence); err != nil {
			panic(err)
		}

		playerBuffer.Write(buffer.Bytes())
		player.Connection.WriteMessage(websocket.BinaryMessage, playerBuffer.Bytes())
	}
}

func (gs *GameSession) Run() {
	tick := time.NewTicker(SESSION_DELTA_TIME)
	defer tick.Stop()

	fmt.Println("Running session:", gs.Id)

	for {
		select {
		case player := <-gs.RegisterPlayer:
			gs.AddPlayer(player)
		case player := <-gs.UnregisterPlayer:
			gs.RemovePlayer(player)
			if len(gs.Players) == 0 {
				gs.Sessions.Unregister <- gs
				return
			}
		case inputUpdate := <-gs.RegisterInput:
			gs.AddPlayerInput(inputUpdate)
		case <-tick.C:
			gs.Update(SESSION_DELTA_TIME)
			gs.Broadcast()
		}

	}
}
