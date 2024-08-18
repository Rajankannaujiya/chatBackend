import express from "express";
import ensureAuthenticated from "./ensureAuthentication.js";
import Users from "../Schema/Users.js";
import passport from 'passport';


const Router = express.Router();



Router.get("/fetchAllUsers", ensureAuthenticated, async (req, res) => {
    try {
        const keyword = req.query.search ? {
            $or: [
                { userName: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } }
            ]
        } : {};

        const users = await Users.find({ ...keyword, _id: { $ne: req.user._id } });
        res.send(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


Router.post("/register",async(req, res)=> {
    try {
        const { username, email, password, confirmPassword } = req.body;
        console.log(req.body);
    
            if (password !== confirmPassword) {
            return res.status(401).send('Passwords do not match');
        }
        const existingUser = await Users.findOne({ email });
        const existingUserName = await Users.findOne({ username });
    
        if(existingUser || existingUserName){
            return res.status(401).send('user with the given username or email already exists');
        }
        var user = {
            username: username,
            email:email,
        };
    
        Users.register(new Users(user), req.body.password, function(err, user) {
            if (err) {
                return res.status(401).send("register", {info: "Sorry. That username already exists. Try again."});
            }
            else{
                passport.authenticate("local")(req,res,function(){
                    return res.status(200).send({message:"successful registration",user:req.user})
                })
            }
          
        });
    } catch (error) {
        console.log(error.message)   
    }
});


Router.post("/login", (req, res) => {
    const {username, email, password } = req.body;

    if (!username||!email || !password) {
        return res.status(400).send({ message: "Email and password are required" });
    }

    const user = new Users({
        username:username,
        email: email,
        password: password
    });
    console.log(user)

    req.login(user, function (err,next) {
        if (err) {
            console.error(err);
            next(err);
            return res.status(500).send({ message: "Internal server error" });
        }

        
        passport.authenticate("local")(req, res, function () {
            res.status(200).send({ message: "Successful login" ,user:req.user});
        });
    });
});



export default Router;