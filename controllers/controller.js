const {createRoom,rooms} = require("../models/Rooms");
const Room = require("../models/Room");

function joinroom(req,res){
    const { username, roomCode, action } = req.body;

    //console.log(username, roomCode, action);

    if(action === "create"){
        const createcode = generateRoomCode();
        const room = createRoom(createcode);
        room.addplayer(username);

        res.redirect(`/room/${createcode}`);
    }
    else if(action === "join"){
        if(rooms[roomCode]){
            rooms[roomCode].addplayer(username);
            res.redirect(`/room/${roomCode}?username=${username}`);
        }else{
            res.send("Room not found");
        }
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