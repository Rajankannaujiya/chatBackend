
import dotenv from 'dotenv/config'
import express from "express";
import cors from "cors";
import multer from "multer";
import Users from './Schema/Users.js';
// import dirname from "path";
import mongoose from 'mongoose';
import bodyParser from "body-parser";
import Router from "./Routers/Authentication.js";
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// import cons from "consolidate";
import { fileURLToPath} from "url";
import path from "path";
import chatRouter from './Routers/ChatRouter.js';
import http from 'http'
import { Server as SocketIOServer } from 'socket.io';
import createMemoryStore from "memorystore";
import { Db_name } from './constants.js';
import MongoStore from 'connect-mongo';
// dotenv.config()
// console.log(process.env)
var upload = multer();


const app = express();
const server = http.createServer(app); // Create an HTTP server

app.use(express.json());
app.use(cors());

// connecting to mongodb

async function connectToDB(){
  try {
    console.log(`${process.env.MONGO_URI}/${Db_name}`)
    await mongoose.connect(`${process.env.MONGO_URI}/${Db_name}`)
    console.log("connected to databases")
  } catch (error) {
    console.log("an error has been occured while connecting database", error)
    throw new Error("an error has been occured ")
  }
}

connectToDB();
// Middleware


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: `${process.env.MONGO_URI}/${Db_name}`,
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 60000,  // Adjust as necessary
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
  },
}));

app.use(passport.initialize());
app.use(passport.session());

var User = mongoose.model('Users');
passport.use(new LocalStrategy(Users.authenticate()));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    console.error('Error in deserializeUser:', err);
    done(err, null);
  }
});


app.get("/",(req,res)=>{
  res.send("hello there")
})

console.log('Initializing /users routes');
app.use("/users", Router);

console.log('Initializing /chats routes');
app.use("/chats", chatRouter);

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port :${port}`);
});

const io = new SocketIOServer(server, {
  pingTimeout: 6000,
  cors: {
    origin: "*"
  },
});


io.on("connect", (socket) => {

  socket.on("setup", (userData) => {
    socket.join(userData.user._id);
    socket.emit("connected");
  })

  socket.on("join chat", (room) => {
    socket.join(room);
  })

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });


  socket.on("connect_error", (err) => {
    console.log("error", err);
  });
  // Handle socket events here

  socket.off("setup", (userData) => {
   console.log("user is disconnected")
   socket.leave(userData.user._id);
  });
});
