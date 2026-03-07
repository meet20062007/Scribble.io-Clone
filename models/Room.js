class Room {
    constructor(roomId){
        this.roomId = roomId;   //
        this.players = {};      //socketId: username
        this.playerOrder = [];      //a vector stores socketId
        this.currentDrawerIndex = 0;    //
        this.currentWord = null;    //
        this.correctGuessers = new Set();   //socketId of correct guessers for current round
        this.countDownInterval = null;   //stores a timer Id which will execute every 1 sec to update time left for current round
        this.roundTimeout = null;       //stores a timer Id which will execute after 90 sec , this is used if we want to stop the timer when all players guess the word before 90 sec
        this.scores = {};   //socketId: score
        this.currentRoundScores = {};   //socketId:points for current round
        this.roundStartTime = null;     //Timestamp of when the round Started
        this.roundDuration = 90;    //
        this.gameState = "choosing a word";     //choosing a word,drawing
        //this.hintRevealCount = 0;
        this.hintInterval = null;   //stores a timer Id which will execute after 20 sec , this is used if we want to stop the timer when all players guess the word before 20 sec
        this.revealedLetterIndices = new Set();     //stores indices of revraled letters for current round
        this.currentHint = "";      //hint string , stores "_ i z _ _" for pizza
    }

    addPlayer(socketId, username) {
        this.players[socketId] = username;
        this.playerOrder.push(socketId);
        this.scores[socketId] = 0;
    }

    getPlayerList() {
        return this.playerOrder.map(id => ({
            username: this.players[id],
            score: this.scores[id]
        }));
    }

    removePlayer(socketId){
        delete this.players[socketId];
        delete this.scores[socketId];  
        delete this.currentRoundScores[socketId];
        if(this.correctGuessers.has(socketId)){ 
            this.correctGuessers.delete(socketId);
        }
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
    setWord(word) {
        this.currentWord = word;
    }

    getWord() {
        return this.currentWord;
    }

    resetGuesses() {
        this.correctGuessers.clear();
    }

    addCorrectGuesser(socketId) {
        this.correctGuessers.add(socketId);
    }

    hasGuessed(socketId) {
        return this.correctGuessers.has(socketId);
    }

    getCorrectGuessers() {
        return Array.from(this.correctGuessers);
    }

    setGameState(state) {
        this.gameState = state;
    }

    getGameState() {
        return this.gameState;
    }

    getHint(word) {
        if (!word) return "";

        const wordLength = word.length;
        const hint = word.split("");

        // Hide all letters initially
        for (let i = 0; i < wordLength; i++) {
            hint[i] = "_";
        }

        // Reveal only the letters that are in revealedLetterIndices
        this.revealedLetterIndices.forEach(index => {
            if (index < wordLength) {
                hint[index] = word[index];
            }
        });

        const hintStr = hint.join(" ");
        this.currentHint = hintStr;
        return hintStr;
    }

    getCurrentHint() {
        return this.currentHint;
    }

    revealRandomLetter(word) {
        if (!word) return;

        const wordLength = word.length;
        const unrevealed = [];

        // Find all unrevealed letter indices
        for (let i = 0; i < wordLength; i++) {
            if (!this.revealedLetterIndices.has(i)) {
                unrevealed.push(i);
            }
        }

        // Pick a random unrevealed letter (but never reveal the complete word)
        if (unrevealed.length > 1) {
            const randomIndex = Math.floor(Math.random() * unrevealed.length);
            this.revealedLetterIndices.add(unrevealed[randomIndex]);
        } else if (unrevealed.length === 1 && wordLength > 1) {
            // If only 1 letter left, don't reveal it (never complete word)
            return;
        }
    }

    // incrementHintReveal() {
    //     this.hintRevealCount++;
    // }

    resetHintReveal() {
        //this.hintRevealCount = 0;
        this.revealedLetterIndices.clear();
        this.currentHint = "";
    }

    // getHintRevealCount() {
    //     return this.hintRevealCount;
    // }

    // getDrawer() {
    //     return this.drawer;
    // }

    isEmpty(){
        return Object.keys(this.players).length === 0;
    }
}

module.exports = Room;