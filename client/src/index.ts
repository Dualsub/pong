console.log("Hello!");
const ws = new WebSocket("ws://localhost:5000/game");

// Connection opened
ws.addEventListener("open", (event) => {
  ws.send("Hello Server!");
  console.log("Sent something to server!");
});

// Listen for messages
ws.addEventListener("message", (event) => {
  console.log("Message from server ", event.data);
});
