if (window.__onlineCleanup) window.__onlineCleanup();
if (window.__onlineBeforeunload) window.removeEventListener('beforeunload', window.__onlineBeforeunload);

var localPlayerLetter = null;
var opponentLetter = null;
var gameId = null;
var unsubscribeGame = null;
var cells = document.querySelectorAll(".cell");

var turnDisplay = document.getElementById("player_turn");
var statusInfo = document.getElementById("game_status");
var mainBoard = document.getElementById("board");
var pingIndicator = document.getElementById("game_ping");

function getUrlParams() {
    var params = {};
    var s = window.location.search;
    if (s.length < 2) return params;
    s.substring(1).split("&").forEach(function(param) {
        var parts = param.split("=");
        params[parts[0]] = decodeURIComponent(parts[1]);
    });
    return params;
}

function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createNewGame(id, privacy, gridSize) {
    if (privacy === undefined) privacy = "public";
    if (gridSize === undefined) gridSize = 3;
    gameId = id;
    localPlayerLetter = "X";
    opponentLetter = "O";
    var gameOnDB = db.collection("games").doc(gameId);
    var board = Array(+gridSize * +gridSize).fill(null);

    await gameOnDB.set({
        board: board,
        status: "waiting",
        playerX_active: true,
        playerO_active: null,
        privacy: privacy,
        boardSize: +gridSize,
        turn: "X",
        playerX: "x",
        playerO: null,
        winner: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    statusInfo.textContent = "Your game is ready to share! Share this join code: " + gameId;
    listenToGameUpdates(gameOnDB);
}

async function joinExistingGame(id) {
    gameId = id;
    localPlayerLetter = "O";
    opponentLetter = "X";
    var gameOnDB = db.collection("games").doc(gameId);

    try {
        var doc = await gameOnDB.get();
        if (!doc.exists) {
            statusInfo.textContent = "404 Could not find your requested game.";
            return;
        }
        var gameData = doc.data();
        updateBoard(gameData);
        cells = document.querySelectorAll(".cell");

        if (gameData.status === "playing" || gameData.playerO) {
            statusInfo.textContent = "403 Requested game is already in session.";
            return;
        }

        await gameOnDB.update({ playerO: 'o', status: 'playing', playerO_active: true });
        statusInfo.textContent = "Joined requested game. You are O.";
        listenToGameUpdates(gameOnDB);
    } catch (e) {
        console.error("Error joining the requested game. ", e);
        statusInfo.textContent = "500 An unexpected error occurred.";
    }
}

async function handleQueue() {
    var waitingGame = await db.collection("games")
        .where("status", "==", "waiting")
        .where("playerX_active", "==", true)
        .where("privacy", "==", "public")
        .limit(1).get();

    if (!waitingGame.empty) {
        await joinExistingGame(waitingGame.docs[0].id);
    } else {
        await createNewGame(generateGameId(), "public", 3);
    }
}

function listenToGameUpdates(gameOnDB) {
    if (unsubscribeGame) unsubscribeGame();
    unsubscribeGame = gameOnDB.onSnapshot(function(docSnapshot) {
        if (docSnapshot.exists) {
            updateLocalState(docSnapshot.data());
        } else {
            statusInfo.textContent = "Game ended or was removed.";
        }
    }, function(error) {
        console.error("Game error! ", error);
    });
}

function updateLocalState(gameData) {
    if (mainBoard.children.length === 0 || mainBoard.children.length !== (gameData.boardSize * gameData.boardSize))
        updateBoard(gameData);
    cells = document.querySelectorAll(".cell");

    gameData.board.forEach(function(letter, idx) {
        var cell = cells[idx];
        if (cell.textContent !== (letter || "")) {
            cell.textContent = letter;
            cell.classList.remove("x", "o");
            if (letter) cell.classList.add(letter.toLowerCase());
        }
    });

    var isLocalTurn = gameData.turn === localPlayerLetter;

    if (gameData.status === "waiting") {
        if (gameData.privacy === "public")
            statusInfo.textContent = "Your game is waiting for players.";
    } else if (gameData.status === "playing") {
        statusInfo.textContent = "You are " + localPlayerLetter + ".";
        turnDisplay.textContent = isLocalTurn
            ? "It is currently your turn."
            : "It is currently not your turn.";
    } else if (gameData.status === "finished") {
        if (gameData.winner === "_") {
            statusInfo.textContent = "DRAW! Thanks for playing.";
        } else if (gameData.winner === localPlayerLetter) {
            statusInfo.textContent = "You win! Thanks for playing.";
        } else {
            statusInfo.textContent = "You lose! Thanks for playing.";
        }
        turnDisplay.style.display = "none";
        cells.forEach(function(cell) { cell.style.cursor = "default"; });
        if (unsubscribeGame) { unsubscribeGame(); unsubscribeGame = null; }
    }
}

async function cellClick(event) {
    var idx = parseInt(event.target.dataset.index);
    var gameOnDB = db.collection("games").doc(gameId);
    var start = Date.now();

    await db.runTransaction(async function(transaction) {
        var doc = await transaction.get(gameOnDB);
        var data = doc.data();

        if (data.status !== "playing" || data.turn !== localPlayerLetter || data.board[idx] !== null)
            return Promise.reject("Invalid move or not your turn.");

        var newBoard = [];
        for (var i = 0; i < data.board.length; i++) newBoard[i] = data.board[i];
        newBoard[idx] = localPlayerLetter;
        var newTurn = opponentLetter;

        var winner = checkWin(newBoard, data.boardSize);
        var newStatus = "playing";
        var newWinner = null;

        if (winner) {
            newStatus = "finished";
            newWinner = winner === "no one" ? "Draw" : winner;
        }

        transaction.update(gameOnDB, {
            board: newBoard,
            turn: newTurn,
            status: newStatus,
            winner: newWinner
        });
    }).then(function() {
        var ping = Date.now() - start;
        pingIndicator.textContent = "Ping: " + ping + " ms";

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
    }).catch(function(error) {
        console.error("Fail. ", error);
        pingIndicator.textContent = "Ping: Error. Did you move out of turn?";
        pingIndicator.style.color = "red";
    });
}

function checkWin(board, gridSize) {
    if (board === undefined || board === null) return null;
    var lines = [];

    for (var i = 0; i < gridSize; i++) {
        var row = [];
        var col = [];
        for (var x = 0; x < gridSize; x++) {
            row.push(board[i * gridSize + x]);
            col.push(board[x * gridSize + i]);
        }
        lines.push(row);
        lines.push(col);
    }

    var diag1 = [];
    var diag2 = [];
    for (var i = 0; i < gridSize; i++) {
        diag1.push(board[i * gridSize + i]);
        diag2.push(board[i * gridSize + (gridSize - 1 - i)]);
    }
    lines.push(diag1);
    lines.push(diag2);

    for (var i = 0; i < lines.length; i++) {
        var first = lines[i][0];
        if (first !== null) {
            var allSame = true;
            for (var j = 1; j < lines[i].length; j++) {
                if (lines[i][j] !== first) { allSame = false; break; }
            }
            if (allSame) return first;
        }
    }

    for (var i = 0; i < board.length; i++) {
        if (board[i] === null) return null;
    }
    return "no one";
}

function updateBoard(gameData) {
    var gridSize = gameData.boardSize;
    var boardSize = gridSize * gridSize;

    mainBoard.style.gridTemplateColumns = "repeat(" + gridSize + ", 1fr)";
    mainBoard.style.gridTemplateRows = "repeat(" + gridSize + ", 1fr)";
    mainBoard.innerHTML = "";

    for (var i = 0; i < boardSize; i++) {
        var cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = "" + i;
        cell.textContent = gameData.board[i] || "";
        if (gameData.board[i]) cell.classList.add(gameData.board[i].toLowerCase());
        cell.addEventListener("click", cellClick);
        mainBoard.appendChild(cell);
    }
}

for (var i = 0; i < cells.length; i++) {
    cells[i].addEventListener("click", cellClick);
}

(function init() {
    var params = getUrlParams();
    var mode = params.mode;
    var code = params.gameId;
    var gridSize = params.gridSize;

    if (mode === "queue") {
        handleQueue();
    } else if (mode === "code" && code) {
        joinExistingGame(code.toUpperCase());
    } else if (mode === "code" && !code) {
        statusInfo.textContent = "No game code provided.";
    } else if (mode === "private") {
        createNewGame(generateGameId(), "private", gridSize);
    } else {
        statusInfo.textContent = "No game mode provided.";
    }
})();

window.__onlineBeforeunload = function() {
    if (!unsubscribeGame) return;
    unsubscribeGame();
    var gameOnDB = db.collection("games").doc(gameId);
    var updateData = {};
    if (opponentLetter === "O")
        updateData.playerO_active = false;
    else if (opponentLetter === "X")
        updateData.playerX_active = false;
    gameOnDB.update(updateData).catch(function() {});
};

window.addEventListener('beforeunload', window.__onlineBeforeunload);

window.__onlineCleanup = function() {
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
    var cells2 = document.querySelectorAll(".cell");
    for (var i = 0; i < cells2.length; i++) cells2[i].style.cursor = "";
    if (window.__onlineBeforeunload)
        window.removeEventListener('beforeunload', window.__onlineBeforeunload);
};