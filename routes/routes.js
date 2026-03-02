const express = require("express");
const router = express.Router();
const joinroom = require("../controllers/controller.js");
const {createRoom,rooms} = require("../models/Rooms.js");

router.get("", (req, res) => {
    res.render("index");
});

router.get("/joingame",(req,res)=>{
    res.render("joingame");
});

router.post("/joingame",joinroom);

router.get("/room/:roomCode",(req,res)=>{
    const { roomCode } = req.params;
    res.render("players", { roomCode ,players:rooms[roomCode].players,username: req.query.username});
});

router.post("/leave", (req, res) => {
    const { username, roomCode } = req.body;

    const room = rooms[roomCode];

    if (!room) {
        return res.redirect("/joingame");
    }

    // Remove user from room
    room.players = room.players.filter(
        player => player !== username
    );

    // If room becomes empty → delete it
    if (room.players.length === 0) {
        delete rooms[roomCode];
    }

    res.redirect("/joingame");
});

module.exports = router;