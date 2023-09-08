const asyncHandler = require("express-async-handler");
const User = require("../models/user")

module.exports.getUser = asyncHandler(async(req,res, next) => {
    const findUser = await User.findById(req.params.id);
    if(findUser){
        res.status(200).json(findUser);
    }
    else{
        res.status(404).json({message:"User not found"})
    }
})