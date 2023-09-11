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
module.exports.editBio = asyncHandler(async(req,res,next) => {
    const findUser = await User.findByIdAndUpdate(req.body.id,
        {bio:req.body.bio},
        )
    if(findUser){
        res.status(200).json({message:"Bio updated"});
    }else {
        res.status(400).json({message: "User was not found"});
    }
})
module.exports.editDetails = asyncHandler(async(req,res,next) => {
    const findUser = await User.findByIdAndUpdate(req.body.id,
        {lives:req.body.lives,
        studies_at: req.body.studies_at,
        job: req.body.job},
        )
    if(findUser){
        res.status(200).json({message:"Bio updated"});
    }else {
        res.status(400).json({message: "User was not found"});
    }
})