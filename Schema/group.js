import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
//   description: {
//     type: String,
//     required: true
//   },
admin:{
  type: mongoose.Schema.Types.ObjectId,
  ref:'Users'
},
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users' // Assuming you have a User model
  }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true }],
  created_at: {
    type: Date,
    default: Date.now
  }
  // You can add more fields as needed
});

export default mongoose.model('Group', groupSchema);
