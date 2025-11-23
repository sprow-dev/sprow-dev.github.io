let board = Array(9).fill(null); // board
let playerTurn = true; // true = player. bools because condition checks are easier
let activeGame = true;
let difficulty = false; // false is easy and true is hard

const playerLetter = "X";
const cpuLetter = "O";

const cells = document.querySelectorAll(".cell");
const turnDisplay = document.getElementById("player_turn");
const newGameEasyButton = document.getElementById("new_game_easy");
const newGameHardButton = document.getElementById("new_game_hard");

function updateBoard(idx,letter) {
    const cell = cells[idx];
    cell.textContent = letter;
    cell.classList.add(letter.toLowerCase());
}

function isMatch(a,b,c) {
    if (a && a === b && a === c) {
        return a;
    }
    return null;
}

function checkWin() {
    const winConditions = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ]

    for (const [a,b,c] of winConditions) {
        const match = isMatch(board[a],board[b],board[c]);

        if (match) {
            return match;
        }
    }

    if (!board.includes(null)) {
        return 'no one';
    }

    return null;
}

function gameEnd(win) {
    activeGame = false;
    turnDisplay.textContent = `Winner is: ${win}! Thank you for playing.`

    cells.forEach(cell => {
        cell.textContent = win;
    });
}

function cellClaim(idx) {
    if (!activeGame || board[idx] !== null) return false;

    board[idx] = playerLetter;
    updateBoard(idx,playerLetter);

    const win = checkWin();
    if(win) {
        gameEnd(win)
        return true;
    }

    playerTurn = false;
    turnDisplay.textContent = "Your turn: O."
    setTimeout(botClaimCell, 1000);

    return true;
}

function checkBetterMove(letter,cellsAvailable) {
    for (const idx of cellsAvailable) {
        board[idx] = letter;

        const win = checkWin();

        board[idx] = null;

        if (win == letter) {
            return idx;
        }
    }

    return null; // no good moves were found
}

function checkFork(letter,cellsAvailable) {
    for (const idx of cellsAvailable) {
        board[idx] = letter;
        let winsPossible = 0;

        const winConditions = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];

        for (const [a,b,c] of winConditions) {
            if (isMatch(a,b,c)) {
                winsPossible++;
            }
        }

        board[idx] = null;

        if (winsPossible >= 2) {
            return idx;
        }
    }

    return null; // no forks
}

function botMakeMove(cellNumber) {
    board[cellNumber] = cpuLetter;
    updateBoard(cellNumber,cpuLetter);

    const win = checkWin();
    if (win) {
        gameEnd(win);
        return;
    }

    playerTurn = true;
    turnDisplay.textContent = "Your turn: X.";
}

function botClaimCell() {
    if (!activeGame) return;

    const cellsAvailable = [];
    board.forEach((cell,idx) => {
        if (cell == null) {
            cellsAvailable.push(idx);
        }
    });

    // check if there are any available cells
    if (cellsAvailable.length == 0) {
        return;
    }


    // if o can win here
    const cpuWin = checkBetterMove(cpuLetter,cellsAvailable);
    if (cpuWin) {
        botMakeMove(cpuWin);
        return;
    }

    // if o can block x from win here
    const playerWin = checkBetterMove(playerLetter,cellsAvailable);
    if (playerWin) {
        botMakeMove(playerWin);
        return;
    }

    if (difficulty) {
        console.log("HARD");
        // if bot can fork in this turn
        const cpuFork = checkFork(cpuLetter,cellsAvailable);
        if (cpuFork) {
            botMakeMove(cpuFork);
            return;
        }

        // there is no player forking check because this bot needs to be beatable

        // try to take the center square
        if (cellsAvailable.includes(4)) {
            botMakeMove(4)
            return;
        }

        // otherwise pick a random corner
        const cornersAvailable = [0,2,6,8].filter(idx => cellsAvailable.includes(idx));
        if (cornersAvailable.length > 0) {
            botMakeMove(cornersAvailable[Math.floor(Math.random() * cornersAvailable.length)])
            return;
        }
    }


    // else just pick something available
    const cellNumber = cellsAvailable[Math.floor(Math.random()*cellsAvailable.length)];

    botMakeMove(cellNumber);
    return;
}

function newGame(newDifficulty) {
    board = Array(9).fill(null);
    playerTurn = true;
    activeGame = true;
    turnDisplay.textContent = "Your turn: X.";
    difficulty = newDifficulty

    if (difficulty == false) {
        difficultyDisplay.textContent = "Current difficulty: EASY"
    } else {
        difficultyDisplay.textContent = "Current difficulty: HARD"
    }

    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x','o');
    });
}

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (playerTurn && activeGame) {
            const idx = parseInt(event.target.dataset.index)
            cellClaim(idx);
        }
    });
});

difficultyDisplay = document.getElementById("difficulty");
newGameEasyButton.addEventListener('click', () => newGame(false));
newGameHardButton.addEventListener('click', () => newGame(true));

window.onload = () => newGame(false);
