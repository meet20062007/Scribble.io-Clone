class Room {
    constructor(roomId){
        this.roomId = roomId;
        this.players = [];
    }

    addplayer(username){
        this.players.push(username);
    }
}

module.exports = Room;