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

const PLAYER_SPEED = 100
const PLAYER_WIDTH = 10
const PLAYER_HEIGHT = 100

const ATTACK_DIRECTION = math.Pi / 12
const ATTACK_SPEED_FACTOR = 2

const COURT_WIDTH = 800
const COURT_HEIGHT = 600

const MAX_PLAYERS = 2

const GAME_SCORE_LIMIT = 2
const ROUND_RESET_TIME = 0 * time.Second
const GAME_RESET_TIME = 0 * time.Second

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

type Controller interface {
	OnUpdate(dt float32, playerId int32, session *GameSession)
}

type PlayerController struct {
	Connection *websocket.Conn
}

type Player struct {
	Id          int32
	Controller  Controller
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

// Events that happened during the frame
type FrameEvents struct {
	BallCollided   bool
	BallHitPlayer  bool
	BallWasSmashed bool
	NewRound       bool
}

type Countdown struct {
	Countdown int32
	// Maybe add type later
}

type GameSession struct {
	Id        int
	Players   map[int32]*Player
	Ball      Ball
	Time      time.Duration
	IsRunning bool
	Sessions  *Sessions
	Countdown Countdown
	Events    FrameEvents

	StateBuffer bytes.Buffer

	RegisterPlayer   chan *Player
	UnregisterPlayer chan *Player
	RegisterInput    chan InputUpdate

	PauseTimer *time.Timer
}

type Sessions struct {
	Sessions      map[int]*GameSession
	Register      chan *GameSession
	Unregister    chan *GameSession
	RegisterInput chan InputUpdate
}

func NewSessions() *Sessions {
	return &Sessions{
		Sessions:      make(map[int]*GameSession),
		Register:      make(chan *GameSession),
		Unregister:    make(chan *GameSession),
		RegisterInput: make(chan InputUpdate),
	}
}

func (sessions *Sessions) Run() {
	for {
		select {
		case session := <-sessions.Register:
			sessions.Sessions[session.Id] = session
			session.Sessions = sessions
			fmt.Println("Registered session", session.Id)
			go session.Run()
		case session := <-sessions.Unregister:
			delete(sessions.Sessions, session.Id)
			fmt.Println("Unregistered session", session.Id)
		}
	}
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

func NewBall() Ball {
	return Ball{
		X:         float32(COURT_WIDTH / 2),
		Y:         float32((COURT_HEIGHT-2*BALL_RADIUS)*mathrand.Float32() + BALL_RADIUS),
		VelocityX: BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1),
		VelocityY: BALL_SPEED * float32(INV_SQRT_2) * float32(mathrand.Intn(2)*2-1),
	}
}

func NewGameSession(id int) *GameSession {
	return &GameSession{
		Id:        id,
		Players:   make(map[int32]*Player),
		Ball:      NewBall(),
		Time:      0,
		IsRunning: true,
		Events:    FrameEvents{},

		RegisterPlayer:   make(chan *Player, 1),
		UnregisterPlayer: make(chan *Player, 1),
		RegisterInput:    make(chan InputUpdate, 1),

		PauseTimer: time.NewTimer(0),
	}

}

func (gs *GameSession) AddPlayer(player *Player) {
	_, isBot := player.Controller.(*BotController)

	// Check if session is full
	if len(gs.Players) >= MAX_PLAYERS {
		if !isBot {
			player.Ready <- false
		}
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
	if !isBot {
		player.Ready <- true
	}

	fmt.Println("Player added")
}

func (gs *GameSession) RemovePlayer(player *Player) {
	delete(gs.Players, player.Id)
	fmt.Println("Player removed")
}

func (gs *GameSession) AddPlayerInput(inputUpdate InputUpdate) {
	if !gs.IsRunning {
		return
	}

	player, ok := gs.Players[inputUpdate.PlayerId]
	if !ok {
		fmt.Println("Player not found")
		return
	}

	player.InputStates = append(player.InputStates, inputUpdate.InputState)
}

func (gs *GameSession) EndGame() {

	gs.ResetGame()
}

func (gs *GameSession) ResetGame() {

	gs.ResetRound()

	for _, player := range gs.Players {
		player.Score = 0
	}
}

func (gs *GameSession) ResetRound() {
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
		player.InputStates = make([]InputState, 0)
	}

	gs.Events.NewRound = true
}

func (gs *GameSession) PauseGame(duration time.Duration) {
	gs.IsRunning = false
	gs.PauseTimer.Reset(duration)
}

func ReadInput(p []byte, playerId int32) InputUpdate {
	var rawInputState struct {
		UpPressed   byte
		DownPressed byte
		Timestamp   int64 // Retrieved on client side using Date.now()
		Sequence    uint32
	}

	if err := binary.Read(bytes.NewReader(p), binary.LittleEndian, &rawInputState); err != nil {
		panic(err)
	}

	timestamp := time.Unix(0, rawInputState.Timestamp*int64(time.Millisecond))
	// Get server timestamp, if it's in the future, use it instead
	if timestamp.After(time.Now()) || timestamp.Before(time.Now().Add(-1*time.Second)) {
		timestamp = time.Now()
	}

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

// Function to check if two line segments intersect
func intersects(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2 float32) bool {
	// Calculate vectors & determinants
	dax := ax2 - ax1
	day := ay2 - ay1
	dbx := bx2 - bx1
	dby := by2 - by1
	det := dax*dby - dbx*day

	if det == 0 {
		return false // lines are parallel
	}

	s := (1 / det) * ((ax1-bx1)*dby - (ay1-by1)*dbx)
	t := (1 / det) * ((bx1-ax1)*day - (by1-ay1)*dax)

	return s >= 0 && s <= 1 && t >= 0 && t <= 1
}

func IsColliding(oldBall *Ball, ball *Ball, player *Player) bool {

	// Check for direct collision with current and previous state
	directCollision := (ball.X-BALL_RADIUS < player.X+PLAYER_WIDTH) && (ball.X+BALL_RADIUS > player.X) && (ball.Y-BALL_RADIUS < player.Y+PLAYER_HEIGHT) && (ball.Y+BALL_RADIUS > player.Y)

	// Define player's bounding box edges
	// leftEdge := player.X
	// rightEdge := player.X + PLAYER_WIDTH
	// topEdge := player.Y
	// bottomEdge := player.Y + PLAYER_HEIGHT

	// Check for intersection with each edge of the player's bounding box
	// hitLeft := intersects(oldBall.X, oldBall.Y, ball.X, ball.Y, leftEdge, topEdge, leftEdge, bottomEdge)
	// hitRight := intersects(oldBall.X, oldBall.Y, ball.X, ball.Y, rightEdge, topEdge, rightEdge, bottomEdge)
	// hitTop := intersects(oldBall.X, oldBall.Y, ball.X, ball.Y, leftEdge, topEdge, rightEdge, topEdge)
	// hitBottom := intersects(oldBall.X, oldBall.Y, ball.X, ball.Y, leftEdge, bottomEdge, rightEdge, bottomEdge)

	// Return true if any collision is detected
	return directCollision
}

func (gs *GameSession) Update(dt time.Duration) {

	// Reset events
	gs.Events.BallCollided = false
	gs.Events.BallHitPlayer = false
	gs.Events.BallWasSmashed = false
	gs.Events.NewRound = false

	if !gs.IsRunning {
		return
	}

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

	// Cache old ball state
	oldBall := gs.Ball

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
		gs.Events.BallCollided = true
	}

	if gs.Ball.Y > float32(COURT_HEIGHT-BALL_RADIUS) {
		gs.Ball.Y = float32(COURT_HEIGHT - BALL_RADIUS)
		gs.Ball.VelocityY *= -1
		gs.Events.BallCollided = true
	}

	// Check for player collisions
	for _, player := range gs.Players {
		// Test collision with ball radius taken into account
		if !IsColliding(&oldBall, &gs.Ball, player) {
			continue
		}

		gs.Ball.VelocityX *= -1
		gs.Events.BallCollided = true
		gs.Events.BallHitPlayer = true

		// Move ball outside player
		if gs.Ball.X > COURT_WIDTH/2 {
			gs.Ball.X = player.X - BALL_RADIUS
		} else {
			gs.Ball.X = player.X + PLAYER_WIDTH + BALL_RADIUS
		}

		// If player was moving, change ball direction
		if len(player.InputStates) == 0 {
			continue
		}

		lastInputState := player.InputStates[len(player.InputStates)-1]
		if lastInputState.UpPressed == lastInputState.DownPressed {
			continue
		}

		gs.Events.BallWasSmashed = true

		speedMagnitude := math.Sqrt(float64(gs.Ball.VelocityX*gs.Ball.VelocityX+gs.Ball.VelocityY*gs.Ball.VelocityY)) * ATTACK_SPEED_FACTOR
		var xSign float32 = 1.0
		if gs.Ball.VelocityX < 0 {
			xSign = -1.0
		}

		var angle float64 = 0

		if lastInputState.UpPressed {
			angle = -ATTACK_DIRECTION
		} else {
			angle = ATTACK_DIRECTION
		}

		gs.Ball.VelocityY = float32(speedMagnitude * math.Sin(angle))
		gs.Ball.VelocityX = float32(speedMagnitude*math.Cos(angle)) * xSign

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

		// Check if game is over
		if furthestPlayer.Score >= GAME_SCORE_LIMIT {
			gs.EndGame()
		} else {
			gs.ResetRound()
		}
	}

}

func NewPlayerController(conn *websocket.Conn) *PlayerController {
	return &PlayerController{
		Connection: conn,
	}
}

func (pc *PlayerController) OnUpdate(dt float32, playerId int32, session *GameSession) {
	var playerBuffer bytes.Buffer
	if err := binary.Write(&playerBuffer, binary.LittleEndian, playerId); err != nil {
		panic(err)
	}

	player := session.Players[playerId]

	var lastSequence uint32 = 0
	if len(player.InputStates) > 0 {
		lastSequence = player.InputStates[len(player.InputStates)-1].Sequence
	}

	if err := binary.Write(&playerBuffer, binary.LittleEndian, lastSequence); err != nil {
		panic(err)
	}

	playerBuffer.Write(session.StateBuffer.Bytes())
	pc.Connection.WriteMessage(websocket.BinaryMessage, playerBuffer.Bytes())
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

	// Write ball position and velocity
	if err := binary.Write(&buffer, binary.LittleEndian, gs.Ball); err != nil {
		panic(err)
	}

	// Write frame events
	frameEvent := struct {
		BallCollided   byte
		BallHitPlayer  byte
		BallWasSmashed byte
		NewRound       byte
	}{
		BallCollided:   0,
		BallWasSmashed: 0,
		NewRound:       0,
	}

	if gs.Events.BallCollided {
		frameEvent.BallCollided = 1
	}

	if gs.Events.BallHitPlayer {
		frameEvent.BallHitPlayer = 1
	}

	if gs.Events.BallWasSmashed {
		frameEvent.BallWasSmashed = 1
	}

	if gs.Events.NewRound {
		frameEvent.NewRound = 1
	}

	if err := binary.Write(&buffer, binary.LittleEndian, frameEvent); err != nil {
		panic(err)
	}

	gs.StateBuffer = buffer

	for _, player := range gs.Players {
		player.Controller.OnUpdate(float32(SESSION_DELTA_TIME.Seconds()), player.Id, gs)
	}
}

func (gs *GameSession) Run() {
	tick := time.NewTicker(SESSION_DELTA_TIME)
	gs.PauseTimer.Stop()

	defer tick.Stop()
	defer gs.PauseTimer.Stop()

	// Game session is paused until both players are ready
	gs.IsRunning = false

	fmt.Println("Running session:", gs.Id)

	for {
		select {
		case player := <-gs.RegisterPlayer:
			fmt.Println("Player registered")
			gs.AddPlayer(player)

			// Start session if full
			if len(gs.Players) == MAX_PLAYERS {
				gs.ResetGame()
				gs.IsRunning = true
			} else {
				gs.IsRunning = false
				gs.ResetRound()
			}
		case player := <-gs.UnregisterPlayer:
			gs.RemovePlayer(player)

			gs.EndGame()

			onlyBots := true
			for _, player := range gs.Players {
				_, isBot := player.Controller.(*BotController)
				if !isBot {
					onlyBots = false
					break
				}
			}

			if len(gs.Players) == 0 || onlyBots {
				gs.Sessions.Unregister <- gs
				return
			}

			if len(gs.Players) < MAX_PLAYERS {
				gs.IsRunning = false
				gs.ResetRound()
			}
		case inputUpdate := <-gs.RegisterInput:
			gs.AddPlayerInput(inputUpdate)
		case <-tick.C:
			gs.Update(SESSION_DELTA_TIME)
			gs.Broadcast()
		case <-gs.PauseTimer.C:
			gs.IsRunning = true
		}

	}
}
