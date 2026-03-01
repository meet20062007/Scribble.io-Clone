const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const routes = require("./routes/routes");

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});