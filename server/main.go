package main

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
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
	ticker := time.NewTicker(10 * time.Second)
	for {
		select {
		case <-ticker.C:
			fmt.Println("Sessions:")
			for id := range sessions.Sessions {
				fmt.Println("  ", id)
				fmt.Println("    Players:")
				for playerId := range sessions.Sessions[id].Players {
					fmt.Println("      ", playerId)
				}
			}

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

func main() {

	sessions := NewSessions()
	go sessions.Run()

	// REST endpoint for listing sessions, id and num players in json
	http.HandleFunc("/sessions", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "[")
		var index int = 0
		for id := range sessions.Sessions {
			fmt.Fprintf(w, "{")
			fmt.Fprintf(w, "\"id\": %d", id)
			fmt.Fprintf(w, ",")
			fmt.Fprintf(w, "\"numPlayers\": %d", len(sessions.Sessions[id].Players))
			fmt.Fprintf(w, "}")
			if index < len(sessions.Sessions)-1 {
				fmt.Fprintf(w, ",")
			}
			index++
		}
		fmt.Fprintf(w, "]")

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/play", func(w http.ResponseWriter, r *http.Request) {

		// Find or register session
		id, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil {
			panic(err)
		}

		session, ok := sessions.Sessions[id]
		if !ok {
			session = NewGameSession(id)
			sessions.Register <- session
		}

		// Create and register player
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			panic(err)
		}
		defer conn.Close()

		player := &Player{
			Connection:  conn,
			Score:       0,
			X:           0,
			Y:           0,
			Session:     session,
			InputStates: make([]InputState, 0),
			Ready:       make(chan bool),
		}

		session.RegisterPlayer <- player

		playerOk := false

	loop:
		for {
			select {
			case ok := <-player.Ready:
				if !ok {
					break loop
				}
				playerOk = true
			default:
				if !playerOk {
					continue loop
				}

				mt, p, err := conn.ReadMessage()
				if err != nil {
					break loop
				}

				if mt == websocket.CloseMessage {
					break loop
				}

				if (mt != websocket.BinaryMessage) && (len(p) != (2 + 4 + 4)) {
					continue loop
				}

				inputUpdate := ReadInput(p, player.Id)
				session.RegisterInput <- inputUpdate
			}
		}

		session.UnregisterPlayer <- player
	})

	http.ListenAndServe("0.0.0.0:5000", nil)
}
