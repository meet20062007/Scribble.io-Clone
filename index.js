const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/routes");
const { rooms } = require("./models/Rooms");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/", routes);

io.on("connection", (socket) => {

    socket.on("joinRoom", ({ roomCode, username }) => {

        const room = rooms[roomCode];
        if (!room) return;

        socket.join(roomCode);
        socket.roomCode = roomCode;

        room.addPlayer(socket.id, username);

        io.to(roomCode).emit("updatePlayers", room.getPlayerList());
    });

    socket.on("draw", (data) => {
        if (!socket.roomCode) return;
        socket.to(socket.roomCode).emit("draw", data);
    });

    socket.on("clear", () => {
        if (!socket.roomCode) return;
        socket.to(socket.roomCode).emit("clear");
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

server.listen(8000, () => {
    console.log("Server running on port 8000");
});