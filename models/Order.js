const mongoose = require('mongoose'); 

const OrderSchema = new mongoose.Schema({ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    items: [ 
        { 
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
            quantity: { type: Number, required: true } 
        } 
    ], 
    totalAmount: { type: Number, required: true },  // Changed from 'total' to 'totalAmount'
    orderStatus: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],  
    },  
    createdAt: { type: Date, default: Date.now }, 
    address: { type: String, required: true },
    vendorId: {  // Fixed from 'vendorid' to 'vendorId'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    }
}); 

module.exports = mongoose.model('Order', OrderSchema);
