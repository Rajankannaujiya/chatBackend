import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose"

const Users=new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    confirmPassword:String,

})
Users.plugin(passportLocalMongoose);


export default mongoose.model("Users",Users);