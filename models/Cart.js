const mongoose = required('mongoose');

const CartSchema = new mongoose.Schema ({
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
});