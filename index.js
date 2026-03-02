const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/routes");
const { rooms } = require("./models/Rooms");
const { getRandomWords } = require("./models/words");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/", routes);

function startRound(roomCode) {

    const room = rooms[roomCode];
    if (!room) return;

    const drawerId = room.getCurrentDrawer();
    const drawerName = room.players[drawerId];

    // Tell everyone who drawer is
    io.to(roomCode).emit("updateDrawer", {
        id: drawerId,
        name: drawerName
    });

    io.to(roomCode).emit("clear");

    // Send word options to drawer only
    const wordOptions = getRandomWords(3);
    io.to(drawerId).emit("chooseWord", wordOptions);
}

io.on("connection", (socket) => {

    socket.on("joinRoom", ({ roomCode, username }) => {

        const room = rooms[roomCode];
        if (!room) return;

        socket.join(roomCode);
        socket.roomCode = roomCode;

        room.addPlayer(socket.id, username);

        if (!room.roundTimer) {
            room.roundTimer = true; // just to mark game started
            startRound(roomCode);
        }

        io.to(roomCode).emit("updatePlayers", room.getPlayerList());
        const drawerId = room.getCurrentDrawer();
        const drawerName = room.players[drawerId];

        io.to(roomCode).emit("updateDrawer", {
            id: drawerId,
            name: drawerName
        });

        // Tell everyone who drawer is
        //io.to(roomCode).emit("updateDrawer", room.getDrawer());

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

        if (socket.id !== room.getCurrentDrawer()) return;

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

          const wordOptions = getRandomWords(3);
          io.to(drawerId).emit("chooseWord", wordOptions);

          // If room becomes empty → cleanup
          if (room.playerOrder.length === 0) {

              // Stop round timer
              clearInterval(room.roundTimer);

              // Remove room from memory
              delete rooms[roomCode];
          }
      });

    socket.on("wordSelected", (word) => {

        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        if (socket.id !== room.getCurrentDrawer()) return;

        room.setWord(word);

        io.to(roomCode).emit("wordChosen", {
            length: word.length
        });

        // Start 20 second timer
        io.to(roomCode).emit("roundStarted", {
            duration: 20,
            startTime: Date.now()
        });

        // After 20 sec → next round
        setTimeout(() => {

            room.nextDrawer();
            startRound(roomCode);

        }, 20000);
    });
});

server.listen(8000, () => {
    console.log("Server running on port 8000");
});