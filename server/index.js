const express = require("express");
const socket = require("socket.io");
const http = require("http");

const {
  addUser,
  removeUser,
  getUser,
  getUserAll,
  getUsersInRoom
} = require("./users");

const PORT = process.env.PORT || 5000;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.use(router);

io.on("connection", socket => {
  console.log("Have a new connection !!!");

  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error); // if user had throw notif

    socket.join(user.room); // accept user join room

    socket.emit("message", { user: "admin", text: `Welcome ${name}` }); // send message to only user send it
    socket.broadcast
      .to(user.room) // send message for all users in room but not send for user send it
      .emit("message", { user: "admin", text: `${name} has joined !!` });

    // send amount users have in room
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
  });

  socket.on("send-message", (message, callback) => {
    const user = getUser(socket.id);

    // When reload (f5) will set new socket.id, so maybe usename is the same but the socket.id is different
    if (user) {
      io.to(user.room).emit("message", { user: user.name, text: message }); // send everyone in room
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      socket.broadcast
        .to(user.room)
        .emit("message", { user: "admin", text: `${user.name} had left !!` });
      console.log("User had left !!!");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Connecting on port ${PORT}`);
});
