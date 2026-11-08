if (window.__offlineCleanup) window.__offlineCleanup();

var board = Array(9).fill(null);
var playerTurn = true;
var activeGame = true;
var difficulty = false;

var playerLetter = "X";
var cpuLetter = "O";

var cells = document.querySelectorAll(".cell");
var turnDisplay = document.getElementById("player_turn");
var difficultyDisplay = document.getElementById("difficulty");
var newGameEasyButton = document.getElementById("new_game_easy");
var newGameHardButton = document.getElementById("new_game_hard");

function updateBoard(idx, letter) {
    var cell = cells[idx];
    cell.textContent = letter;
    cell.classList.add(letter.toLowerCase());
}

function isMatch(a, b, c) {
    return a && a === b && a === c ? a : null;
}

function checkWin() {
    var winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (var i = 0; i < winConditions.length; i++) {
        var match = isMatch(board[winConditions[i][0]], board[winConditions[i][1]], board[winConditions[i][2]]);
        if (match) return match;
    }
    if (!board.includes(null)) return 'no one';
    return null;
}

function gameEnd(win) {
    activeGame = false;
    turnDisplay.textContent = "Winner is: " + win + "! Thank you for playing.";
    for (var i = 0; i < cells.length; i++) cells[i].textContent = win;
}

function cellClaim(idx) {
    if (!activeGame || board[idx] !== null) return false;
    board[idx] = playerLetter;
    updateBoard(idx, playerLetter);
    var win = checkWin();
    if (win) { gameEnd(win); return true; }
    playerTurn = false;
    turnDisplay.textContent = "Your turn: O.";
    setTimeout(botClaimCell, 1000);
    return true;
}

function checkBetterMove(letter, cellsAvailable) {
    for (var i = 0; i < cellsAvailable.length; i++) {
        var idx = cellsAvailable[i];
        board[idx] = letter;
        var win = checkWin();
        board[idx] = null;
        if (win === letter) return idx;
    }
    return null;
}

function checkFork(letter, cellsAvailable) {
    var wc = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (var i = 0; i < cellsAvailable.length; i++) {
        var idx = cellsAvailable[i];
        board[idx] = letter;
        var n = 0;
        for (var j = 0; j < wc.length; j++) {
            if (isMatch(board[wc[j][0]], board[wc[j][1]], board[wc[j][2]])) n++;
        }
        board[idx] = null;
        if (n >= 2) return idx;
    }
    return null;
}

function botMakeMove(cellNumber) {
    board[cellNumber] = cpuLetter;
    updateBoard(cellNumber, cpuLetter);
    var win = checkWin();
    if (win) { gameEnd(win); return; }
    playerTurn = true;
    turnDisplay.textContent = "Your turn: X.";
}

function botClaimCell() {
    if (!activeGame) return;
    var cellsAvailable = [];
    for (var i = 0; i < board.length; i++) {
        if (board[i] === null) cellsAvailable.push(i);
    }
    if (cellsAvailable.length === 0) return;

    var cpuWin = checkBetterMove(cpuLetter, cellsAvailable);
    if (cpuWin !== null) { botMakeMove(cpuWin); return; }

    var playerWin = checkBetterMove(playerLetter, cellsAvailable);
    if (playerWin !== null) { botMakeMove(playerWin); return; }

    if (difficulty) {
        var cpuFork = checkFork(cpuLetter, cellsAvailable);
        if (cpuFork !== null) { botMakeMove(cpuFork); return; }
        if (cellsAvailable.indexOf(4) !== -1) { botMakeMove(4); return; }
        var corners = [];
        for (var i = 0; i < cellsAvailable.length; i++) {
            var c = cellsAvailable[i];
            if (c === 0 || c === 2 || c === 6 || c === 8) corners.push(c);
        }
        if (corners.length > 0) {
            botMakeMove(corners[Math.floor(Math.random() * corners.length)]);
            return;
        }
    }
    botMakeMove(cellsAvailable[Math.floor(Math.random() * cellsAvailable.length)]);
}

function newGame(newDifficulty) {
    board = [null, null, null, null, null, null, null, null, null];
    playerTurn = true;
    activeGame = true;
    turnDisplay.textContent = "Your turn: X.";
    difficulty = newDifficulty;
    difficultyDisplay.textContent = "Current difficulty: " + (difficulty ? "HARD" : "EASY");
    for (var i = 0; i < cells.length; i++) {
        cells[i].textContent = '';
        cells[i].classList.remove('x', 'o');
    }
}

for (var i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function(e) {
        if (playerTurn && activeGame) cellClaim(parseInt(e.target.dataset.index));
    });
}

newGameEasyButton.addEventListener('click', function() { newGame(false); });
newGameHardButton.addEventListener('click', function() { newGame(true); });
newGame(false);

window.__offlineCleanup = function() {
    var cells2 = document.querySelectorAll(".cell");
    for (var i = 0; i < cells2.length; i++) cells2[i].style.cursor = "";
};