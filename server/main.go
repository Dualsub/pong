package main

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func handler(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		panic(err)
	}

	for {
		messageType, p, err := conn.ReadMessage()

		if err != nil {
			panic(err)
		}

		if err := conn.WriteMessage(messageType, p); err != nil {
			panic(err)
		}
	}
}

func main() {
	http.HandleFunc("/game", handler)
	http.ListenAndServe(":5000", nil)
}
