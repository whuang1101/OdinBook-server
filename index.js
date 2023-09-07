const express=  require("express");
const app = express();
require("dotenv").config()
const port = process.env.PORT;
require("./auth/facebookAuth")
require("./auth/localAuth")
const passport = require('passport');
const mongoose = require("mongoose");
const cors = require("cors")
const session = require("express-session")
//defining routers


//defining routers
const authRouter = require("./routes/authRouter");
const postRouter = require("./routes/postRouter");
const friendRequestRouter = require("./routes/friendRequestRouter");
app.use(express.json());

//connect mongoose
const mongoDb = process.env.SECRET_KEY;

mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error"));

//Add models 
const User = require("./models/user");
//enables cookies for 24 hours
app.use(session({
  secret: process.env.KEY,
  resave: false,
  saveUninitialized: false,
}));


app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user by their ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({_id:id});
    done(null, user);
  } catch (err) {
    done(err, null);
  }

});
//allows for connecting with cross origin
app.use(cors({
    origin:"http://localhost:5173",
    methods: "GET, POST, PUT, DELETE",
    credentials: true,
}))

app.use("/auth",authRouter)
app.use("/friends", friendRequestRouter)
app.use("/posts",postRouter)
app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
})