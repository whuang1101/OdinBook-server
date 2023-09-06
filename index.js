const express=  require("express");
const app = express();
require("dotenv").config()
const port = process.env.PORT;
const cookieSession = require("cookie-session");
require("./auth/facebookAuth")
const passport = require('passport');
const mongoose = require("mongoose");
const cors = require("cors")

//defining routers
const authRouter = require("./routes/authRouter");
const postRouter = require("./routes/postRouter");
app.use(express.json());

//connect mongoose
const mongoDb = process.env.SECRET_KEY;

mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error"));

//Add models 
const User = require("./models/user");
//enables cookies for 24 hours
app.use(cookieSession({
  name: "session",
  keys: [process.env.KEY],
  maxAge: 24 * 60 * 60 * 1000,
}));


app.use(passport.initialize());
app.use(passport.session());

//allows for connecting with cross origin
app.use(cors({
    origin:"http://localhost:5173",
    methods: "GET, POST, PUT, DELETE",
    credentials: true,
}))

app.use("/auth",authRouter)
app.use("/posts",postRouter)
app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
})