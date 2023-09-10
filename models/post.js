const mongoose = require("mongoose");
const {Schema} = mongoose;

const postSchema = new Schema({
    date: {type: String, required: true},
    text: {type:String, required:true},
    image_url: {type:String},
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true}],
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: "Comments", required: true}],
    public: {type: Boolean},
    author: {type:mongoose.Schema.Types.ObjectId, ref: "Users", required: true},
    edited: {type:Boolean}
})

module.exports = mongoose.model("Posts", postSchema);