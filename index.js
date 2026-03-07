const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/routes");
const { rooms } = require("./models/Rooms");
const { getRandomWords } = require("./models/words");
const PORT = process.env.PORT || 8000;

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

    const roundResults = [];
    for (let id in room.currentRoundScores) {
        roundResults.push({
            username: room.players[id],
            points: room.currentRoundScores[id] || 0
        });
    }   

    roundResults.sort((a, b) => b.points - a.points);

    if(room.countDownInterval){
        clearInterval(room.countDownInterval);
        room.countDownInterval = null;
    }
    io.to(roomCode).emit("roundEnded", roundResults);

    room.currentRoundScores = {};

    // 🔥 CLEAR OLD TIMER
    if (room.roundTimeout) {
        clearTimeout(room.roundTimeout);
        room.roundTimeout = null;
    }

    // 🔥 CLEAR OLD HINT INTERVAL
    if (room.hintInterval) {
        clearInterval(room.hintInterval);
        room.hintInterval = null;
    }

    room.resetGuesses();
    room.resetHintReveal();
    room.setGameState("choosing a word");

    const drawerId = room.getCurrentDrawer();
    const drawerName = room.players[drawerId];

    io.to(roomCode).emit("updateDrawer", {
        drawerId,
        drawerName,
        state: room.getGameState()
    });

    io.to(roomCode).emit("clear");

    const wordOptions = getRandomWords(3);
    io.to(drawerId).emit("chooseWord", wordOptions);
}

io.on("connection", (socket) => {

    socket.on("joinRoom", ({ roomCode, username }) => {

        const room = rooms[roomCode];
        if (!room) return;

        socket.join(roomCode);   //By writing this we can write io.to(roomCode).emit() to send message to everyone in that room
        socket.roomCode = roomCode;   //We are creating a new property (variable) on the socket object to access roomcode , instead of asking roomcode from frontend everytime

        room.addPlayer(socket.id, username);

        io.to(roomCode).emit("updatePlayers", room.getPlayerList());

        const drawerId = room.getCurrentDrawer();
        const drawerName = room.players[drawerId];
        io.to(roomCode).emit("updateDrawer", {drawerId,drawerName,state: room.getGameState()});

        if(Object.keys(room.players).length === 1){
            const wordOptions = getRandomWords(3);
            io.to(drawerId).emit("chooseWord", wordOptions);

            io.to(roomCode).emit("clear");
        }
        else{
            if(room.getGameState() === "drawing"){
                const currentWord = room.getWord();
                const hint = room.getHint(currentWord);
                io.to(socket.id).emit("hintUpdate",hint)
                io.to(roomCode).emit("wordChosen", {
                    length: room.getWord().length,
                    word: room.getWord()
                });
            }
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

          io.to(roomCode).emit("updateDrawer", {drawerId,drawerName });

          const wordOptions = getRandomWords(3);
          io.to(drawerId).emit("chooseWord", wordOptions);

          // If room becomes empty → cleanup
          if (room.playerOrder.length === 0) {
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
        room.setGameState("drawing");
        room.resetHintReveal();

        const drawerId = room.getCurrentDrawer();
        const drawerName = room.players[drawerId];

        io.to(roomCode).emit("updateDrawer", {
            drawerId,
            drawerName,
            state: room.getGameState()
        });

        io.to(roomCode).emit("wordChosen", {
            length: word.length,
            word: word
        });

        // Start 90 second timer
        room.roundStartTime = Date.now();
        room.roundDuration = 90;

        room.countDownInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
            const timeleft = room.roundDuration - elapsed;
            if (timeleft >= 0) {
                io.to(roomCode).emit("timeleft", {timeleft});
            }
            else{
                clearInterval(room.countDownInterval);
                room.countDownInterval = null;
            }
        }, 1000);

        // 🔥 START HINT INTERVAL - Emit hint every 20 seconds
        if (room.hintInterval) {
            clearInterval(room.hintInterval);
        }

        // First hint after 20 seconds, then every 20 seconds after that
        room.hintInterval = setInterval(() => {
            const currentWord = room.getWord();
            if (!currentWord) return;
            
            room.revealRandomLetter(currentWord);
            const hint = room.getHint(currentWord);
            
            // Send hints ONLY to current non-drawer players who haven't guessed
            room.playerOrder.forEach(playerId => {
                if (playerId !== drawerId && !room.hasGuessed(playerId)) {
                    io.to(playerId).emit("hintUpdate", { hint });
                }
            });
        }, 20000);

        // After 90 sec → next round
        room.roundTimeout = setTimeout(() => {
            if (room.hintInterval) {
                clearInterval(room.hintInterval);
                room.hintInterval = null;
            }
            room.nextDrawer();
            startRound(roomCode);
        }, 90000);
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
            room.currentRoundScores[socket.id] = guessPoints;
            room.currentRoundScores[drawerId] = (room.currentRoundScores[drawerId] || 0) + 50;
            room.scores[socket.id] += guessPoints;
            room.scores[drawerId] += 50;

            io.to(socket.id).emit("revealWord", {correctWord});

            io.to(roomCode).emit("correctGuess", {username});

            io.to(roomCode).emit("updatePlayers", room.getPlayerList());

            const totalPlayers = room.playerOrder.length;
            const totalCorrect = room.correctGuessers.size;

            if (totalCorrect === totalPlayers - 1) {

                clearTimeout(room.roundTimeout);

                room.nextDrawer();
                startRound(roomCode);
            }
        }
        else {
            const username = room.players[socket.id];

            io.to(roomCode).emit("chatMessage", {
                username,
                message: guess
            });

        }
    });
});

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});