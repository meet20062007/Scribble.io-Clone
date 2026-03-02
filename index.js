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
        const drawerId = room.getCurrentDrawer();
        const drawerName = room.players[drawerId];

        io.to(roomCode).emit("updateDrawer", {
            id: drawerId,
            name: drawerName
        });

        // Tell everyone who drawer is
        //io.to(roomCode).emit("updateDrawer", room.getDrawer());

        if (!room.roundTimer) {

            room.roundTimer = setInterval(() => {

                const nextDrawerId = room.nextDrawer();
                const nextDrawerName = room.players[nextDrawerId];

                io.to(roomCode).emit("updateDrawer", {
                    id: nextDrawerId,
                    name: nextDrawerName
                });
                io.to(roomCode).emit("clear");

            }, 20000); // 20 seconds per round

        }
    });

    socket.on("draw", (data) => {

        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        if (socket.id !== room.getCurrentDrawer()) return;

        socket.to(roomCode).emit("draw", data);
    });

    socket.on("clear", () => {

        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        if (socket.id !== room.getDrawer()) return;

        socket.to(roomCode).emit("clear");
    });

      socket.on("disconnect", () => {

          const roomCode = socket.roomCode;
          if (!roomCode) return;

          const room = rooms[roomCode];
          if (!room) return;

          // Remove player
          room.removePlayer(socket.id);

          // Update player list for everyone
          io.to(roomCode).emit("updatePlayers", room.getPlayerList());

          // Update drawer for everyone
          const drawerId = room.getCurrentDrawer();
          const drawerName = room.players[drawerId];

          io.to(roomCode).emit("updateDrawer", {
              id: drawerId,
              name: drawerName
          });

          // If room becomes empty → cleanup
          if (room.playerOrder.length === 0) {

              // Stop round timer
              clearInterval(room.roundTimer);

              // Remove room from memory
              delete rooms[roomCode];
          }
      });

});

server.listen(8000, () => {
    console.log("Server running on port 8000");
});