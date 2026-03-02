const express = require("express");
const router = express.Router();
const joinroom = require("../controllers/controller.js");
const {createRoom,rooms} = require("../models/Rooms.js");

router.get("", (req, res) => {
    res.redirect("joingame");
});

router.get("/joingame",(req,res)=>{
    res.render("joingame");
});

router.post("/joingame",joinroom);

router.get("/room/:roomCode",(req,res)=>{
    const { roomCode } = req.params;
    res.render("players", { roomCode ,username: req.query.username});
});

module.exports = router;