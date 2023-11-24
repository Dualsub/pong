package main

type Player struct {
	Id   int
	Name string
	x    int
	y    int
}

type Game struct {
	Id int
	p1 *Player
	p2 *Player
}

func NewGame(id int, p1 *Player, p2 *Player) *Game {
	return &Game{id, p1, p2}
}
