import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  reciever:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }],
  content: { type: String, required: true },
  isgroup:{type:Boolean,default:false},
  timestamp: { type: Date, default: Date.now }
});



export default mongoose.model('Message', messageSchema);
