import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import chatSchema from "../Schema/chatSchema.js";
import Users from "../Schema/Users.js";

const accesschat= expressAsyncHandler(async(req,res)=>{
    const {userId}=req.body;
    if(!userId){
        console.log("Userid param not sent with request");
        return res.sendStatus(400)
    }

    var isChat=await chatSchema.find({
        group:false,
        $and:[
            {participants:{$elemMatch:{$eq:req.user._id}}},
            {participants:{$elemMatch:{$eq:userId}}}
        ]
}).populate("participants","-password").populate("Message","-password");

isChat=await Users.populate(isChat,{
    path:"Message.sender",
    select:"username email"
});
if(isChat.length>0){
    res.send(isChat[0]);
}

else{
    var chatData={
        participants:[req.user._id,userId],
        group:false,
    }
}

try{
    const createChat=await chatSchema.create(chatData);
    const fullChat=await chatSchema.findOne({_id:createChat._id}).populate("participants","-password");

    res.status(200).send(fullChat)
}
catch(error){
    res.send(error);
}

})