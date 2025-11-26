let localPlayerLetter = null;
let opponentLetter = null;
let gameId = null;
let unsubscribeGame = null;

const cells = document.querySelectorAll(".cell")
const turnDisplay = document.getElementById("player_turn");
const statusInfo = document.getElementById("game_status");
const mainBoard = document.getElementById("board");
const pingIndicator = document.getElementById("game_ping");

// TODO: refactor this later to be more efficient, smaller and more readable.
function getUrlParams() {
    const params = {};
    window.location.search.substring(1).split("&").forEach(param => {
        const [key,value] = param.split("=");
        params[key] = decodeURIComponent(value);
    });
    return params;
}

function generateGameId() {
    return Math.random().toString(36).substring(2,8).toUpperCase();
}

async function createNewGame(id, privacy = "public") {
    gameId = id;
    localPlayerLetter = "X";
    opponentLetter = "O";

    const gameOnDB = db.collection("games").doc(gameId);

    await gameOnDB.set({
        board: Array(9).fill(null),
        status: "waiting",
        playerX_active: true,
        playerO_active: null,
        privacy: privacy,
        turn: "X",
        playerX: "x",
        playerO: null,
        winner: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    statusInfo.textContent = `Your game is ready to share! Share this join code: ${gameId}`;

    listenToGameUpdates(gameOnDB);
}

async function joinExistingGame(id) {
    gameId = id;
    localPlayerLetter = "O"
    opponentLetter = "X";

    const gameOnDB = db.collection("games").doc(gameId);

    try {
        const doc = await gameOnDB.get();

        if (!doc.exists) {
            statusInfo.textContent = "404 Could not find your requested game.";
            return;
        }

        const gameData = doc.data();

        if (gameData.status == "playing" || gameData.playerO) {
            statusInfo.textContent = "403 Requested game is already in session.";
            return;
        }

        await gameOnDB.update({
            playerO: 'o',
            status: 'playing',
            playerO_active: true
        });

        statusInfo.textContent = "Joined requested game. You are O.";

        listenToGameUpdates(gameOnDB);
    } catch (e) {
        console.error("Error joining the requested game. ", e);
        statusInfo.textContent = "500 An unexpected error occured."
    }
}

async function handleQueue() {
    const waitingGame = await db.collection("games")
    .where("status","==","waiting")
    .where("playerX_active", "==", true)
    .where("privacy", "==", "public")
    .limit(1).get();

    if (!waitingGame.empty) {
        const gameDoc = waitingGame.docs[0];
        const existingGameId = gameDoc.id;

        await joinExistingGame(existingGameId);
    } else {
        const newGameId = generateGameId();
        await createNewGame(newGameId);
    }
}

function listenToGameUpdates(gameOnDB) {
    if (unsubscribeGame) {
        unsubscribeGame();
    }

    unsubscribeGame = gameOnDB.onSnapshot(docSnapshot => {
        if (docSnapshot.exists) {
            const gameData = docSnapshot.data();
            updateLocalState(gameData);
        } else {
            statusInfo.textContent = "Game ended or was removed.";
        }
    }, error => {
        console.error("Game error! ", error)
    });
}

function updateLocalState(gameData) {
    gameData.board.forEach((letter,idx) => {
        const cell = cells[idx];

        if (cell.textContent !== (letter || "")) {
            cell.textContent = letter;
            cell.classList.remove("x","x");
            if (letter) {
                cell.classList.add(letter.toLowerCase());
            }
        }
    });

    const isLocalTurn = gameData.turn == localPlayerLetter;

    if (gameData.status == "waiting") {
        if (gameData.privacy == "public") {
            statusInfo.textContent = "Your game is waiting for players.";
        }
    } else if (gameData.status == "playing") {
        statusInfo.textContent = `You are ${localPlayerLetter}.`;
        if (isLocalTurn) {
            turnDisplay.textContent = "It is currently your turn.";
        } else {
            turnDisplay.textContent = "It is currently not your turn.";
        }
    } else if (gameData.status == "finished") {
        if (gameData.winner == "_") {
            statusInfo.textContent = "DRAW! Thanks for playing.";
        } else if (gameData.winner == localPlayerLetter) {
            statusInfo.textContent = "You win! Thanks for playing.";
        } else {
            statusInfo.textContent = "You lose! Thanks for playing.";
        }

        turnDisplay.style.display = "none";

        cells.forEach(cell => cell.style.cursor = "default");

        if (unsubscribeGame) {
            unsubscribeGame();
        }
    }
}

async function cellClick(event) {
    const idx = parseInt(event.target.dataset.index);
    const gameOnDB = db.collection("games").doc(gameId);

    const transactionStartTimestamp = Date.now();

    await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameOnDB);
        const gameData = gameDoc.data();

        if (gameData.status !== "playing" || gameData.turn !== localPlayerLetter || gameData.board[idx] !== null) {
            return Promise.reject("Invalid move or not your turn.");
        }

        const newBoard = [...gameData.board];
        newBoard[idx] = localPlayerLetter;
        const newTurn = opponentLetter;

        const winner = checkWin(newBoard);
        let newStatus = "playing";
        let newWinner = null;

        if (winner) {
            newStatus = "finished";
            newWinner = winner == "no one" ? "Draw" : winner;
        }

        transaction.update(gameOnDB, {
            board: newBoard,
            turn: newTurn,
            status: newStatus,
            winner: newWinner
        });
    })
    .then(() => {
        const transactionEndTimestamp = Date.now();
        const ping = transactionEndTimestamp - transactionStartTimestamp;

        pingIndicator.textContent = `Ping: ${ping} ms`;

        if (ping > 1000) {
            pingIndicator.style.color = "#F00";
            pingIndicator.style.textShadow = "0 0 10px #F00";
        } else if (ping > 300) {
            pingIndicator.style.color = "#FF0";
            pingIndicator.style.textShadow = "0 0 10px #FF0";
        } else {
            pingIndicator.style.color = "#0F0";
            pingIndicator.style.textShadow = "0 0 10px #0F0";
        }
    })
    .catch(error => {
        console.error("Fail. ", error);

        pingIndicator.textContent = "Ping: Error. Did you move out of turn?"
        pingIndicator.style.color = "red";
    });
}

function checkWin(board) {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    const isMatch = (a,b,c) => board[a] && board[b] == board[a] && board[c] == board[a] ? board[a] : null;

    for (const [a,b,c] of winConditions) {
        const match = isMatch(a,b,c);
        if (match) {
            return match;
        }
    }

    if (!board.includes(null)) {
        return "no one";
    }
    return null;
}

cells.forEach(cell => {
    cell.addEventListener("click", cellClick);
});

window.onload = () => {
    const params = getUrlParams();
    const mode = params.mode;
    const code = params.gameId;

    if (mode == "queue") {
        handleQueue();
    } else if (mode == "code" && code) {
        joinExistingGame(code.toUpperCase());
    } else if (mode == "code" && !code) {
        statusInfo.textContent = "No game code provided."
    } else if (mode == "private") {
        console.log("(i) Private mode")
        createNewGame(generateGameId(),"private")
    } else {
        statusInfo.textContent = "No game mode provided."
    }
};

window.onbeforeunload = () => {
    if (unsubscribeGame) {
        unsubscribeGame();

        const gameOnDB = db.collection("games").doc(gameId)
        let updateData = {};

        if (opponentLetter == "O") {
            updateData.playerX_active = false;
        } else if (opponentLetter == "X") {
            updateData.playerO_active = false;
        }

        gameOnDB.update(updateData).catch(e => {
            console.warn("(W) Cannot update data. Process probably doesn't have time to finish.")
        });
    }
}


