const {createRoom,rooms} = require("../models/Rooms");
const Room = require("../models/Room");

function joinroom(req,res){
    const { username, roomCode, action } = req.body;

    if(action === "create"){
        const createcode = generateRoomCode();
        createRoom(createcode);

        return res.redirect(`/room/${createcode}?username=${username}`);
    }
    else if(action === "join"){
        if (!rooms[roomCode]) {
            return res.send("Room not found");
        }
        else if(rooms[roomCode].getGameState() === "drawing"){
            return res.send("Game already in progress");
        }
        return res.redirect(`/room/${roomCode}?username=${username}`);
    }
}

function generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
    }

    return code;
}

module.exports = joinroom;