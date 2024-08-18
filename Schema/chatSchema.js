import mongoose from 'mongoose';
// import messageSchema from './Message.js';

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true }],
  group: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Group' // Reference to the Group model
  },
  isgroup:{
    type:Boolean ,default:false
  },
  isgroupAdmin:{
    type: mongoose.Schema.Types.ObjectId, ref: 'Users'
  }
});


export default mongoose.model('chatSchema', chatSchema);


