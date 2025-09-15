import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("instruction", async (msg) => {
    console.log("Instrucción recibida:", msg);

    // 🚨 Aquí luego conectaremos OpenAI/Gemini para modificar HTML
    const editedHtml = `<h1>Documento modificado</h1><p>${msg}</p>`;

    io.emit("docUpdate", editedHtml);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

server.listen(3001, () => {
  console.log("Servidor Socket.IO corriendo en http://localhost:3001");
});
