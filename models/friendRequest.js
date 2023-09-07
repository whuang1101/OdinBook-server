const mongoose = require("mongoose");
const {Schema} = mongoose;

const friendRequestSchema = new Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true},
    status: {type: Number, required: true},
    date: {type: String, required: true}
})

module.exports = mongoose.model("Friend-requests", friendRequestSchema);