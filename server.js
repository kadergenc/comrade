#!/usr/bin/env node

const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { log } = require("./utils");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const connectedClients = new Map();

io.on("connection", (socket) => {
  connectedClients.set(socket.id, socket);

  log(`A client has connected to server with socket Id: ${socket.id}`);

  socket.on("message", (data) => {
    log(`Message from client with Id ${socket.id}: ${JSON.stringify(data)}`);

    connectedClients.forEach((clientSocket, id) => {
      if (id !== socket.id) {
        clientSocket.emit("message", { ...data, socketId: socket.id });
      }
    });
  });

  socket.on("disconnect", () => {
    log(`Client disconnect, socket id: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server port: ${PORT}`);
});
