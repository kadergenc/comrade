const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

io.on("connection", (socket) => {
  console.log("Connected to server");

  socket.on("message", (data) => {
    console.log(`Message: ${data}`);

    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnect");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server port: ${PORT}`);
});
