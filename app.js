const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let moveHistory = [];

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    // Send current board state and move history to the new connection
    uniquesocket.emit("boardState", chess.fen());
    uniquesocket.emit("moveHistory", moveHistory);

    uniquesocket.on("disconnect", function () {
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                moveHistory.push(result);
                io.emit("move", result);
                io.emit("boardState", chess.fen());
                io.emit("moveHistory", moveHistory);
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            console.log("Error processing move:", move);
        }
    });

    uniquesocket.on("requestLegalMoves", (square) => {
        const moves = chess.moves({ square, verbose: true });
        uniquesocket.emit("legalMoves", moves);
    });
});

server.listen(3000, function () {
    console.log("Server is listening on port 3000");
});