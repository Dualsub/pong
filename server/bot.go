package main

import (
	"math"
	"time"
)

const DEAD_ZONE = 1.0 / 3.0

type BotController struct {
	Sum         float32
	PrevErr     float32
	PrevTargetY float32
	Sequence    uint32
	Kp          float32
	Ki          float32
	Kd          float32
}

func NewBotController() *BotController {
	return &BotController{
		Sum:         0,
		PrevErr:     0,
		PrevTargetY: float32(COURT_HEIGHT / 2),
		Sequence:    0,
		Kp:          100.0 / COURT_HEIGHT,
		Ki:          0.0 / COURT_HEIGHT,
		Kd:          1.0 / COURT_HEIGHT,
	}
}

func (bc *BotController) OnUpdate(dt float32, playerId int32, session *GameSession) {
	if session == nil {
		return
	}

	bc.Sequence = (bc.Sequence + 1) % 256

	// PID controller
	playerX := session.Players[playerId].X
	playerY := session.Players[playerId].Y
	targetY := PredictBallCollision(&session.Ball, playerX) - PLAYER_HEIGHT/2
	// If ball is moving away from player, center player
	if (playerX-session.Ball.X)/session.Ball.VelocityX < 0 {
		targetY = bc.PrevTargetY
	}

	bc.PrevTargetY = targetY

	// fmt.Printf("targetY: %f\n", targetY)

	err := playerY - targetY
	bc.Sum += err * dt
	dErr := (err - bc.PrevErr) / dt
	output := bc.Kp*err + bc.Ki*bc.Sum + bc.Kd*dErr
	// fmt.Printf("err: %f, output: %f\n", err, output)
	bc.PrevErr = err

	input := InputUpdate{
		PlayerId: playerId,
		InputState: InputState{
			UpPressed:   output > DEAD_ZONE,
			DownPressed: output < -DEAD_ZONE,
			Timestamp:   time.Now(),
			Sequence:    bc.Sequence,
		},
	}

	session.AddPlayerInput(input)
}

func PredictBallCollision(ball *Ball, hitX float32) float32 {
	if ball.VelocityX == 0 {
		return ball.Y
	}

	dt := (ball.X - hitX) / ball.VelocityX
	if dt < 0 {
		return ball.Y
	}

	y := ball.Y + ball.VelocityY*dt

	if y < 0 {
		y = -float32(math.Mod(float64(y), float64(COURT_HEIGHT)))
	} else if y > COURT_HEIGHT {
		y = float32(COURT_HEIGHT) - float32(math.Mod(float64(y), float64(COURT_HEIGHT)))
	}

	return y
}
