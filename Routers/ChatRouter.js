import express, { Router } from 'express';
import Users from '../Schema/Users.js';
import passport from 'passport';
// import requireAuthentication from './RequireAuth.js';
import ensureAuthenticated from './ensureAuthentication.js'
import cons from 'consolidate';
import chatSchema from '../Schema/chatSchema.js';
import Message from '../Schema/Message.js'
import mongoose from 'mongoose';
import group from '../Schema/group.js';
const chatRouter=express.Router()

chatRouter.get("/userwithChat", ensureAuthenticated,async (req, res) => {
  try {
    // Assuming userId is passed as a query parameter
    const userId = req.query.userId;

    const senders = await chatSchema.distinct('participants');

    // Convert sender objects to user IDs
    const senderUserIds = senders.map(sender => sender._id);

    // Find users who have sent at least one message
    const usersWithMessages = await Users.find({ _id:{ $in: senderUserIds } });

    // Return users with messages as JSON response
    return res.json(usersWithMessages);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
});

chatRouter.get("/allUser",ensureAuthenticated,async (req, res) => {
  try {
    const users = await Users.find();

    // Check if users exist
    if (users && users.length > 0) {
      return res.json(users);
    } else {
      return res.status(404).json({ message: 'No users found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
});


chatRouter.get("/groupMessages/:groupId",ensureAuthenticated,async(req,res)=>{
  try{
    const {groupId}=req.params;
    const chat = await chatSchema.findOne({ group: groupId }).populate('messages');
    return res.json(chat.messages)

  }
  catch(err){
    console.log("an error have been occured",err);
    return res.status(500).json({ message: 'Server Error' });
  }
})


chatRouter.get("/allTheGroups",ensureAuthenticated,async(req,res)=>{
  try {
    const groups = await group.find();

    // Check if users exist
    if (groups && groups.length > 0) {
      return res.json(groups);
    } else {
      return res.status(404).json({ message: 'No group found' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error' });
  }
})

chatRouter.get('/messages/:chatId', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    // Check if chatId is a valid ObjectId
    if (!mongoose.isValidObjectId(chatId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid chatId' });
    }

    // Find the chat based on the provided chatId
    const chat = await chatSchema.findOne({ _id: chatId }).populate('messages');

    // Check if chat exists
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // If it's a group chat
    if (chat.isgroup) {
      // Check if the user is a participant in the group chat
      const isParticipant = chat.participants.some(participant => participant.equals(userId));
      if (!isParticipant) {
        return res.status(403).json({ error: 'You are not a participant in this group chat' });
      }

      // Return group chat messages
      return res.status(200).json({ messages: chat.messages });
    }

    // If it's a one-on-one chat
    // Check if the user is part of this chat
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }

   
    return res.status(200).json({ messages: chat.messages });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



chatRouter.post('/messages',ensureAuthenticated,  async (req, res) => {
  try {
      // Extract necessary data from request body
      const { reciever,content, chatId ,isgroup} = req.body;
      const userId = req.user._id;
      console.log(userId)

      console.log(req.body)
      // Create a new message
      const message = new Message({
          sender: userId,
          reciever:reciever,
          content:content,
          isgroup:isgroup
      });

      // Save the message to the database
      await message.save();

      // Update the chat schema to include the message
      const chat = await chatSchema.findById(chatId);
      console.log("chat in message is ",chat)
      if (!chat) {
          return res.status(404).json({ error: 'Chat not found' });
      }

      chat.messages.push(message._id);
      await chat.save();

      // Send the created message as response
      res.status(201).json({ message });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route handler for createOrRetrieveChat

// for the one on one chat
chatRouter.post('/createOrRetrieveChat/:recieverId', ensureAuthenticated, async (req, res) => {
  try {

    const {recieverId} = req.params;
    const userId=req.user._id;
    console.log(userId,recieverId)

    if (!mongoose.isValidObjectId(recieverId)) {
      return res.status(400).json({ error: 'Invalid chatId' });
  }
    // Check if req.user exists and contains the necessary properties
    if ( !userId || !recieverId) {
      console.log("User details not found in request or user not authenticated");
      return res.status(400).json({ error: 'User details not found in request or user not authenticated' });
    }

    // Find the chat based on participants
    const isChat = await chatSchema.findOne({
      isgroup: false,
      participants: { $all: [recieverId, userId] },
    })
    .populate('participants', '-password')
    .populate('messages', '-password');

    if (isChat) {
      // If the chat exists, return it
      return res.status(200).json(isChat);
    }

    // If the chat doesn't exist, create a new one
    const chatData = {
      participants: [recieverId, userId],
      isgroup: false,
    };

    const newChat = await chatSchema.create(chatData);
    const fullChat = await chatSchema.findById(newChat._id).populate('participants', '-password');

    res.status(201).json(fullChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// fetching all the chats
chatRouter.get("/fetchChats", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.query.userId;

    const chats = await chatSchema.find({
      participants: userId
    })
    .populate({
      path: 'participants',
      model: 'Users', // Model name should match the imported model name
      select: '-password'
    })
    .populate({
      path: 'isgroupAdmin',
      model: 'Users', // Model name should match the imported model name
      select: '-password'
    })
    .populate('messages')
    .populate('group') // populate the group
    .sort({ updatedAt: -1 });

    // Populate message sender details
    for (let chat of chats) {
      await chat.populate({
        path: 'messages.sender',
        model: 'Users', // Model name should match the imported model name
        select: 'name email'
      });
    }

    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



chatRouter.get("/getGroups", ensureAuthenticated, async (req, res) => {
  const { chatId, userId } = req.query; // Assuming name is sent as a query parameter
  console.log(chatId, userId);
  try {
    const existingGroup = await group.findOne({ chatId }); // Corrected to use findOne() with a query object
    if (existingGroup) {
      const chat = await chatSchema.findById(chatId)
        .populate('participants', '-password')
        .populate({
          path: 'group',
          model: 'Group',
          select: '-password'
        })
        .populate('messages', '-password')
        .populate("isgroupAdmin", "-password");

      console.log("Group already exists");

      return res.send(chat);
    } else {
      console.log("Group not found");
      return res.status(404).json({ message: "Group not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});


chatRouter.post('/createGroup', ensureAuthenticated, async (req, res) => {
  const { name, input } = req.body;
  console.log(name,input)
  const userId = req.user._id;

  try {
    if (!name || !userId || !input || (Array.isArray(input) && input.length < 2)) {
      return res.status(400).json({ message: "Please provide group name, content, and at least two users" });
    }

    // Check if a group with the same name already exists
    const existingGroup = await group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ message: 'Group with this name already exists' });
    }


    let userIds = input; // Assuming input is already an array of user IDs
    if (typeof input === 'string') {
      userIds = JSON.parse(input);
    }

    for (const id of userIds) {
      if(!mongoose.Types.ObjectId.isValid(id)){
        
          return res.status(400).json({ message: 'Invalid user ID' });
        
      }
     
    }

    // Create a new group
    const newgroup = new group({
      name,
      admin: userId,
      members: [userId,...userIds]
    });

    const savedGroup = await newgroup.save();

    // Create a new chat schema for the group
    const chat = await chatSchema.create({
      participants: userIds,
      group: savedGroup._id, // Assign the ObjectId of the saved group
      isgroup: true,
      isgroupAdmin: userId // Assuming isgroupAdmin should be the ObjectId of the group admin
    });
    // Populate participants and isgroupAdmin fields
    const fullChat = await chatSchema.findById(chat._id)
      .populate('participants', '-password')
      .populate({
        path: 'group',
        model: 'Group',
        select: '-password'
      })
      .populate('messages','-password')
      .populate("isgroupAdmin", "-password");

    res.status(201).json({ savedGroup, fullChat }); // Return an object with both savedGroup and fullChat
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// creating the group chat

chatRouter.post("/createGroupChat/:groupId", ensureAuthenticated, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    // Find the existing group by groupId
    const existingGroup = await group.findOne({ _id: groupId });

    if (existingGroup) {
      // Find the chat based on the groupId
      const chat = await chatSchema.findOne({ group: groupId });

      if (chat) {
        // If chat exists for the group, return it
        const fullChat = await chatSchema.findById(chat._id)
          .populate('participants', '-password')
          .populate('group', '-password')
          .populate('messages', '-password')
          .populate('isgroupAdmin', '-password');
        return res.status(200).json({ fullChat });
      } else {
        // If chat doesn't exist for the group, create a new one
        const newChat = await chatSchema.create({
          participants: existingGroup.members,
          isgroup: true,
          group: existingGroup._id
        });
        const fullChat = await chatSchema.findById(newChat._id)
          .populate('participants', '-password')
          .populate('group', '-password')
          .populate('messages', '-password')
          .populate('isgroupAdmin', '-password');
        return res.status(201).json({ fullChat });
      }
    } else {
      return res.status(404).json({ message: "Group not found" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});




chatRouter.patch("/changeGroupName",ensureAuthenticated,async(req,res)=>{
  const { groupId, userId, name } = req.body; // Destructure groupId, userId, and name from the request body

  try {
    // Find the existing group by groupId
    const existingGroup = await group.findById(groupId);

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if the userId matches the admin of the group
    if (userId.toString() === existingGroup.admin.toString()) {
      // Update the name of the group
      existingGroup.name = name;
      
      // Save the updated group
      const updatedGroup = await existingGroup.save();
      
      // Send the updated group as response
      return res.status(200).json(updatedGroup);
    } else {
      return res.status(403).json({ message: 'You are not authorized to change the group name' });
    }
  } catch(error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


chatRouter.patch("/addMember", async (req, res) => {
  const { groupId, userId, user } = req.body;

  try {
    if (!groupId || !userId || !user) {
      return res.status(400).send("All fields are required");
    }

    // Find the existing group by groupId
    const existingGroup = await group.findById(groupId);

    if (!existingGroup) {
      return res.status(404).send("Group not found");
    }

    // Check if the user making the request is authorized to add a member
    if (existingGroup.admin.toString() !== userId) {
      return res.status(403).send("You are not authorized to add a member to this group");
    }

    // Add the user to the group's members array
    existingGroup.members.push(user);

    // Save the updated group
    await existingGroup.save();

    return res.status(200).send("User has been added to the group");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});


chatRouter.patch("/removeMember", async (req, res) => {
  const { groupId, userId, user } = req.body;

  try {
    if (!groupId || !userId || !user) {
      return res.status(400).send("All fields are required");
    }

    // Find the existing group by groupId
    const existingGroup = await group.findById(groupId);

    if (!existingGroup) {
      return res.status(404).send("Group not found");
    }

    // Check if the user making the request is authorized to add a member
    if (existingGroup.admin.toString() !== userId) {
      return res.status(403).send("You are not authorized to remove a member to this group");
    }

    // Add the user to the group's members array
    existingGroup.members.pull(user)

    // Save the updated group
    await existingGroup.save();

    return res.status(200).send("User has been removed from the group");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});


chatRouter.delete("/deleteMessages/:chatId", ensureAuthenticated, async (req, res) => {
  const { chatId } = req.params;
  const userId=req.user._id;
  if (!mongoose.isValidObjectId(chatId)|| !mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid chatId or userId' });
  }

  let chat = await chatSchema.findById(chatId);

  if (!chat) {
    return res.status(404).send("Chat not found");
  }
  if(chat.isgroup){
    if(chat.isgroupAdmin.toString() === userId.toString()){
      chat.messages.splice(0, chat.messages.length);
      await chat.save();
      return res.status(200).json({ message: 'Messages deleted successfully', chat });
    }

    return res.status(400).send("you must be admin to delete the message");
  }

  chat.messages.splice(0, chat.messages.length);

  // Save the updated chat
  await chat.save();

  return res.status(200).json({ message: 'Messages deleted successfully', chat });
});

export default chatRouter;
