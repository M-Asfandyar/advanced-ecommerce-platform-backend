const mongoose = required('mongoose');

const OrderSchema = new mongoose.Schema ({
  user: { type: mongoose.Schema.Types.ObjectId,
   ref: 'User', 
   required: true},
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
      },
      quantiry: { type: Number, required: true},
    },
  ],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now  },
});

module.export = mongoose.model('Order', OrderSchema);