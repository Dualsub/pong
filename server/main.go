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
			fmt.Println("Sessions:", len(sessions.Sessions))
		case session := <-sessions.Register:
			sessions.Sessions[session.Id] = session
			fmt.Println("Registered session", session.Id)
			go session.Run()
			fmt.Println("Started session", session.Id)
		case session := <-sessions.Unregister:
			delete(sessions.Sessions, session.Id)
		}
	}
}

func main() {

	sessions := NewSessions()
	go sessions.Run()

	// REST endpoint for listing sessions, id and num players in json
	http.HandleFunc("/sessions", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "[")
		for id := range sessions.Sessions {
			fmt.Fprintf(w, "{")
			fmt.Fprintf(w, "\"id\": %d", id)
			fmt.Fprintf(w, ",")
			fmt.Fprintf(w, "\"numPlayers\": %d", len(sessions.Sessions[id].Players))
			fmt.Fprintf(w, "},")
		}
		fmt.Fprintf(w, "]")
	})

	http.HandleFunc("/game", func(w http.ResponseWriter, r *http.Request) {

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

				if (mt != websocket.BinaryMessage) || (len(p) != 2) {
					continue loop
				}

				inputUpdate := InputUpdate{
					PlayerId: player.Id,
					InputState: InputState{
						UpPressed:   p[0] == 1,
						DownPressed: p[1] == 1,
						Timestamp:   time.Now(),
					},
				}

				session.RegisterInput <- inputUpdate
			}
		}

		session.UnregisterPlayer <- player
	})

	http.ListenAndServe(":5000", nil)
}
