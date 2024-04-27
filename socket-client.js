const io = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("message", (data) => {
  console.log(`Message from server: ${data}`);
});

function sendMessage(message) {
  socket.emit("message", message);
}

sendMessage("Test message");
