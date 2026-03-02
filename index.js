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

    // 🔥 CLEAR OLD TIMER
    if (room.roundTimeout) {
        clearTimeout(room.roundTimeout);
        room.roundTimeout = null;
    }

    room.resetGuesses();

    const drawerId = room.getCurrentDrawer();
    const drawerName = room.players[drawerId];

    io.to(roomCode).emit("updateDrawer", {
        id: drawerId,
        name: drawerName
    });

    io.to(roomCode).emit("clear");

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

        room.roundStartTime = Date.now();
        room.roundDuration = 20;
        io.to(roomCode).emit("roundStarted", {
            duration: 20,
            startTime: Date.now()
        });

        // After 20 sec → next round
        room.roundTimeout = setTimeout(() => {
            room.nextDrawer();
            startRound(roomCode);
        }, 20000);
    });

    socket.on("guess", (guess) => {

        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms[roomCode];
        if (!room) return;

        if (socket.id === room.getCurrentDrawer()) return;
        if (room.hasGuessed(socket.id)) return;

        const correctWord = room.getWord();
        if (!correctWord) return;

        if (guess.toLowerCase() === correctWord.toLowerCase()) {

            room.addCorrectGuesser(socket.id);

            const username = room.players[socket.id];

            // 🔥 Calculate time left
            const now = Date.now();
            const elapsed = Math.floor((now - room.roundStartTime) / 1000);
            const timeLeft = Math.max(room.roundDuration - elapsed, 0);

            const guessPoints = Math.floor(100 * (timeLeft / room.roundDuration));
            const drawerId = room.getCurrentDrawer();

            // 🔥 Add score
            room.scores[socket.id] += guessPoints;
            room.scores[drawerId] += 50;

            io.to(roomCode).emit("correctGuess", {
                username
            });

            // 🔥 Send updated scores (username → score mapping)
            const scoreData = {};

            for (let id in room.scores) {
                scoreData[room.players[id]] = room.scores[id];
            }

            io.to(roomCode).emit("scoreUpdate", scoreData);

            const totalPlayers = room.playerOrder.length;
            const totalCorrect = room.correctGuessers.size;

            if (totalCorrect === totalPlayers - 1) {

                clearTimeout(room.roundTimeout);

                room.nextDrawer();
                startRound(roomCode);
            }
        }
    });
});

server.listen(8000, () => {
    console.log("Server running on port 8000");
});