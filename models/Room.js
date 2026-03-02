class Room {
    constructor(roomId){
        this.roomId = roomId;
        this.players = {};
    }

    addPlayer(socketId, username) {
        this.players[socketId] = username;
    }

    getPlayerList() {
        return Object.values(this.players);
    }

    removePlayer(socketId){
        delete this.players[socketId];
    }

    isEmpty(){
        return Object.keys(this.players).length === 0;
    }
}

module.exports = Room;