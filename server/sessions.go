package main

import "fmt"

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
