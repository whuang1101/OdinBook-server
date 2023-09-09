const mongoose = require("mongoose");
const {Schema} = mongoose;

const commentSchema = new Schema({
    date: {type: String, required: true},
    text: {type:String, required:true},
    image_url: {type:String},
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: "Comments", required: true}],
    author: {type:mongoose.Schema.Types.ObjectId, ref: "Users", required: true},
    post: {type:mongoose.Schema.Types.ObjectId, ref: "Posts", required: true},
    edited: {type:Boolean}
})

module.exports = mongoose.model("Comments", commentSchema);