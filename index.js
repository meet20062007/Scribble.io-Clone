const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/routes");
const {createRoom,rooms} = require("./models/Rooms");

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set("view engine", "ejs");

// Static files
app.use(express.static("public"));

// Routes
app.use("/", routes);

// HTTP + Socket.io
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
    socket.on("joinRoom",({roomCode,username})=>{
        const room = rooms[roomCode];
        if(!room)
          return;

            socket.join(roomCode);
            socket.roomCode = roomCode;
            room.addPlayer(socket.id, username);
            io.to(roomCode).emit("updatePlayers", room.getPlayerList());

    });

    socket.on("disconnect", () => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        room.removePlayer(socket.id);

        io.to(roomCode).emit("updatePlayers", room.getPlayerList());

        if (room.isEmpty()) {
            delete rooms[roomCode];
        }
    });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});