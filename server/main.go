package main

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/acme/autocert"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func handleSessions(sessions *Sessions, w http.ResponseWriter, r *http.Request) {
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

	// Make CORS happy
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)
}

func handlePlay(sessions *Sessions, w http.ResponseWriter, r *http.Request) {

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
}

func main() {

	sessions := NewSessions()
	go sessions.Run()

	certManager := &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domains...),
		Cache:      autocert.DirCache("certs"),
	}

	http.HandleFunc("/sessions", func(w http.ResponseWriter, r *http.Request) {
		handleSessions(sessions, w, r)
	})

	http.HandleFunc("/play", func(w http.ResponseWriter, r *http.Request) {
		handlePlay(sessions, w, r)
	})

	server := &http.Server{
		Addr: ":443",
		TLSConfig: &tls.Config{
			GetCertificate: certManager.GetCertificate,
			MinVersion:     tls.VersionTLS12,
		},
	}

	go func() {
		err := http.ListenAndServe(":80", certManager.HTTPHandler(nil))
		if err != nil {
			fmt.Printf("HTTP server error: %s\n", err)
		}
	}()

	fmt.Println("Server listening on :80 for HTTP challenges and :443 for HTTPS")
	err := server.ListenAndServeTLS("", "")
	if err != nil {
		fmt.Printf("Server error: %s\n", err)
	}
}
