const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true
  },
  role: [{
    type: String,
  }],
});

// Add indexes to optimize query performance
ProductSchema.index({ name: 1, category: 1 });

module.exports = mongoose.model('Product', ProductSchema); 