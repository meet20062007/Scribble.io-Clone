class Room {
    constructor(roomId){
        this.roomId = roomId;
        this.players = {};
        this.playerOrder = [];
        this.currentDrawerIndex = 0;
        this.roundTimer=undefined;
    }

    addPlayer(socketId, username) {
        this.players[socketId] = username;
        this.playerOrder.push(socketId);
    }

    getPlayerList() {
        return Object.values(this.players);
    }

    removePlayer(socketId){
        delete this.players[socketId];

        this.playerOrder = this.playerOrder.filter(id => id !== socketId);

        if (this.currentDrawerIndex >= this.playerOrder.length) {
            this.currentDrawerIndex = 0;
        }
    }

    getCurrentDrawer() {
        if (this.playerOrder.length === 0) return null;
        return this.playerOrder[this.currentDrawerIndex];
    }

    nextDrawer() {
        if (this.playerOrder.length === 0) return null;

        this.currentDrawerIndex =
            (this.currentDrawerIndex + 1) % this.playerOrder.length;

        return this.getCurrentDrawer();
    }
    

    // getDrawer() {
    //     return this.drawer;
    // }

    isEmpty(){
        return Object.keys(this.players).length === 0;
    }
}

module.exports = Room;