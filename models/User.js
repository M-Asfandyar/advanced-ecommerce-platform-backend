const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: 'user' 
  },
  purchaseHistory: [ {
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Product' 
    } 
  ],
});

module.exports = mongoose.model('User', UserSchema);