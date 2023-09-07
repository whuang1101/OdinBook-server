const mongoose = require("mongoose");
const {Schema} = mongoose

const userSchema =  new Schema({
    email: {type:String},
    password: {type:String},
    name: {type:String,required: true},
    comments: [{type: mongoose.Schema.Types.ObjectId} ],
    friends_list: [{type: mongoose.Schema.Types.ObjectId, ref: "Users"}],
    image_url: {type:String},
    posts: [{type: mongoose.Schema.Types.ObjectId, ref: "Posts"} ],
    lives: {type:String},
    studies_at: {type:String},
    job: {type:String},
    facebookId: {type:String},
})

module.exports = mongoose.model("Users", userSchema)