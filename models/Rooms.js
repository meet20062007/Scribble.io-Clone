const Room = require("./Room");

const rooms = {};

function createRoom(roomId) {
    const room = new Room(roomId);
    rooms[roomId] = room;
    return room;
}

module.exports = {createRoom,rooms};