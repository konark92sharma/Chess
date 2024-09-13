const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const moveHistoryElement = document.getElementById("moveHistory");

let selectedPiece = null;
let playerRole = null;
let highlightedSquares = [];
let moveHistory = [];

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;
                pieceElement.dataset.piece = square.type;
                pieceElement.dataset.color = square.color;

                pieceElement.addEventListener("mousedown", handlePieceMouseDown);
                pieceElement.addEventListener("dragstart", handleDragStart);

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", handleDragOver);
            squareElement.addEventListener("drop", handleDrop);
            squareElement.addEventListener("click", handleSquareClick);

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handlePieceMouseDown = (e) => {
    if (e.button !== 0) return; // Only handle left mouse button
    const piece = e.target;
    if (piece.draggable) {
        selectedPiece = piece;
        const square = piece.parentNode;
        requestLegalMoves(square.dataset.row, square.dataset.col);
    }
};

const handleDragStart = (e) => {
    if (e.target.draggable) {
        selectedPiece = e.target;
        const square = e.target.parentNode;
        requestLegalMoves(square.dataset.row, square.dataset.col);
        e.dataTransfer.setData("text/plain", ""); // Required for Firefox
    }
};

const handleDragOver = (e) => {
    e.preventDefault();
};

const handleDrop = (e) => {
    e.preventDefault();
    const targetSquare = e.target.classList.contains("square") ? e.target : e.target.parentNode;
    makeMove(selectedPiece.parentNode, targetSquare);
    selectedPiece = null;
};

const handleSquareClick = (e) => {
    const clickedSquare = e.target.classList.contains("square") ? e.target : e.target.parentNode;
    
    if (selectedPiece) {
        if (clickedSquare !== selectedPiece.parentNode) {
            makeMove(selectedPiece.parentNode, clickedSquare);
        }
        selectedPiece = null;
        clearHighlightedSquares();
    } else if (clickedSquare.firstChild && clickedSquare.firstChild.draggable) {
        selectedPiece = clickedSquare.firstChild;
        requestLegalMoves(clickedSquare.dataset.row, clickedSquare.dataset.col);
    }
};

const requestLegalMoves = (row, col) => {
    const algebraicSquare = `${String.fromCharCode(97 + parseInt(col))}${8 - parseInt(row)}`;
    socket.emit("requestLegalMoves", algebraicSquare);
};

const makeMove = (sourceSquare, targetSquare) => {
    const move = {
        from: `${String.fromCharCode(97 + parseInt(sourceSquare.dataset.col))}${8 - parseInt(sourceSquare.dataset.row)}`,
        to: `${String.fromCharCode(97 + parseInt(targetSquare.dataset.col))}${8 - parseInt(targetSquare.dataset.row)}`,
        promotion: 'q', // Always promote to queen for simplicity
    };
    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙", r: "♜", n: "♘", b: "♗", q: "♕", k: "♔",
        P: "♙", R: "♜", N: "♘", B: "♗", Q: "♕", K: "♔",
    };
    return unicodePieces[piece.type] || "";
};

const highlightSquare = (row, col) => {
    const square = boardElement.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
    if (square) {
        square.classList.add("highlight");
        highlightedSquares.push(square);
    }
};

const clearHighlightedSquares = () => {
    highlightedSquares.forEach(square => square.classList.remove("highlight"));
    highlightedSquares = [];
};

const getPieceName = (piece) => {
    const pieceNames = {
        p: "Pawn",
        r: "Rook",
        n: "Knight",
        b: "Bishop",
        q: "Queen",
        k: "King"
    };
    return pieceNames[piece.toLowerCase()];
};

const updateMoveHistory = (move) => {
    moveHistory.push(move);
    renderMoveHistory();
};

const renderMoveHistory = () => {
    moveHistoryElement.innerHTML = "";
    moveHistory.forEach((move, index) => {
        const moveElement = document.createElement("div");
        const pieceColor = index % 2 === 0 ? "White" : "Black";
        const pieceName = getPieceName(move.piece);
        moveElement.textContent = `${Math.floor(index / 2) + 1}. ${pieceColor} ${pieceName} ${move.san}`;
        moveHistoryElement.appendChild(moveElement);
    });
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
};

socket.on("playerRole", function(role) {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", function() {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function(fen) {
    chess.load(fen);
    renderBoard();
});

socket.on("moveHistory", function(history) {
    moveHistory = history;
    renderMoveHistory();
});

socket.on("move", function(move) {
    const result = chess.move(move);
    if (result) {
        updateMoveHistory(result);
        renderBoard();
        clearHighlightedSquares();
    }
});

socket.on("legalMoves", function(moves) {
    clearHighlightedSquares();
    moves.forEach(move => {
        const targetRow = 8 - parseInt(move.to[1]);
        const targetCol = move.to.charCodeAt(0) - 97;
        highlightSquare(targetRow, targetCol);
    });
});

renderBoard();