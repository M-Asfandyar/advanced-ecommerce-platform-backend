const express = require('express'); 
const Order = require('../models/Order'); 
const Product = require('../models/Product'); 
const Cart = require('../models/Cart'); 
const router = express.Router(); 

// Create an order 
router.post('/:userId', async (req, res) => { 
  const { address } = req.body; 
  try { 
    // Fetch users cart 
    const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product'); 
    if (!cart || cart.items.length === 0) { 
      return res.status(400).send('Cart is empty'); 
    } 
    
    // Calculate total price 
    const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0); 
    
    // Deduct stock and check availability 
    
    for (const item of cart.items) { 
      if (item.product.stock < item.quantity) { 
        return res.status(400).send(`Not enough stock for ${item.product.name}`); 
      } 
      await Product.findByIdAndUpdate(item.product._id, { 
        $inc: { stock: -item.quantity },
      }); 
    } 
    
    // Create the order 
    const newOrder = new Order({ 
      user: req.params.userId, items: cart.items.map((item) => ({
       product: item.product._id, 
       quantity: item.quantity, 
      })), 
      total, 
      status: 'Pending', 
      createdAt: new Date(), address, 
    }); 
    await newOrder.save(); 
    
    // Clear the user's cart 
    
    await Cart.findOneAndDelete({ user: req.params.userId }); 
    res.status(201).json(newOrder); 
  } catch (error) { 
    res.status(500).send(error.message);
  } 
}); 
    
    // Fetch orders for a user 
    router.get('/:userId', async (req, res) => { 
      try { 
        const orders = await Order.find({ user: req.params.userId }).populate('items.product'); 
        res.status(200).json(orders); 
      } catch (error) { 
        res.status(500).send(error.message); 
      } 
    }); 
    
    // Update order status (Admin only) 
    
    router.put('/:orderId', async (req, res) => { 
      const { status } = req.body; 
      try { 
        const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true }); 
        if (!updatedOrder) return res.status(404).send('Order not found'); res.status(200).json(updatedOrder); 
      } catch (error) { 
        res.status(500).send(error.message); 
      } 
    });
    
    module.exports = router;

