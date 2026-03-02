class Room {
    constructor(roomId){
        this.roomId = roomId;
        this.players = {};
        this.drawer = null;
    }

    addPlayer(socketId, username) {
        this.players[socketId] = username;

        if (!this.drawer) 
            this.drawer = socketId;
    }

    getPlayerList() {
        return Object.values(this.players);
    }

    removePlayer(socketId){
        delete this.players[socketId];

        if (this.drawer === socketId) {
            const remainingPlayers = Object.keys(this.players);
            this.drawer = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
        }
    }

    getDrawer() {
        return this.drawer;
    }

    isEmpty(){
        return Object.keys(this.players).length === 0;
    }
}

module.exports = Room;