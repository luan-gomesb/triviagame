const express = require("express");
const app = express();
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { getGameStatus, setGameStatus, setGame } = require('./services/game');

const port = process.env.PORT || 8080;
const pubfiles = path.join(__dirname, "../public");
app.use(express.static(pubfiles));
const server = http.createServer(app);
const io = socketio(server);

const formatMessage = require("./utils/formatMessage.js");
const { addPlayer, getAllPlayers, getPlayer, removePlayer } = require("./services/players.js");
const { SocketAddress } = require("net");

io.on('connection', (socket) => {
    console.log('new player connected');
    socket.on('join', (data, callback) => {
        const { playerName, room } = data;
        const { error, newPlayer } = addPlayer({ id: socket.id, playerName, room });
        if (error) {
            return callback(error.message);
        }
        socket.join(room);
        callback();
        socket.emit('message', formatMessage('admin', 'Welcome'));
        socket.broadcast
            .to(newPlayer.room)
            .emit(
                'message',
                formatMessage('Admin', `${newPlayer.playerName} has joined the game!`)
            );

        io.in(newPlayer.room).emit('room', {
            room: newPlayer.room,
            players: getAllPlayers(newPlayer.room),
        });

    })
    socket.on("sendMessage", (message, callback) => {
        const { error, player } = getPlayer(socket.id);
        if (error) return callback(error.message);

        if (player) {
            io.in(player.room).emit(
                "message",
                formatMessage(player.playerName, message)
            );
            callback();
        }
    });
    socket.on("disconnect", () => {
        console.log("A player disconnected.");

        const disconnectedPlayer = removePlayer(socket.id);

        if (disconnectedPlayer) {
            const { playerName, room } = disconnectedPlayer;
            io.in(room).emit(
                "message",
                formatMessage("Admin", `${playerName} has left!`)
            );

            io.in(room).emit("room", {
                room,
                players: getAllPlayers(room),
            });
        }
    });
    socket.on("getQuestion", (data, callback) => {
        const { error, player } = getPlayer(socket.id);

        if (error) return callback(error.message);

        if (player) {
            // Pass in a callback function to handle the promise that's returned from the API call
            setGame((game) => {
                // Emit the "question" event to all players in the room
                io.to(player.room).emit("question", {
                    playerName: player.playerName,
                    ...game.prompt,
                });
            });
        }
    });


    socket.on("sendAnswer", (answer, callback) => {
        const { error, player } = getPlayer(socket.id);

        if (error) return callback(error.message);

        if (player) {
            const { isRoundOver } = setGameStatus({
                event: "sendAnswer",
                playerId: player.id,
                room: player.room,
            });

            // Since we want to show the player's submission to the rest of the players,
            // we have to emit an event (`answer`) to all the players in the room along
            // with the player's answer and `isRoundOver`.
            io.to(player.room).emit("answer", {
                ...formatMessage(player.playerName, answer),
                isRoundOver,
            });

            callback();
        }
    });
    socket.on("getAnswer", (data, callback) => {
        const { error, player } = getPlayer(socket.id);

        if (error) return callback(error.message);

        if (player) {
            const { correctAnswer } = getGameStatus({
                event: "getAnswer",
            });
            io.to(player.room).emit(
                "correctAnswer",
                formatMessage(player.playerName, correctAnswer)
            );
        }
    });
});
// app.listen(port, () => {
server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});