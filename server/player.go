package main

import (
	"bytes"
	"encoding/binary"
	"time"

	"github.com/gorilla/websocket"
)

const PLAYER_SPEED = 100
const PLAYER_WIDTH = 10
const PLAYER_HEIGHT = 100

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
