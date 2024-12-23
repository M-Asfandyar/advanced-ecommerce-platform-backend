const express = require('express'); 
const Cart = require('../models/Cart'); 
const Product = require('../models/Product'); 
const router = express.Router(); 

// Get user's cart 

router.get('/:userId', async (req, res) => { 
  try { const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product'); if (!cart) return res.status(404).send('Cart not found'); 
  res.status(200).json(cart); 
} catch (error) { 
  res.status(500).send(error.message); 
} 
}); 

// Add item to cart 

router.post('/:userId', async (req, res) => { 
  const { productId, quantity } = req.body;
   try { 
    let cart = await Cart.findOne({ user: req.params.userId }); 
   const product = await Product.findById(productId); 
   if (!product) return res.status(404).send('Product not found'); 
   
   if (!cart) { 
    cart = new Cart({ user: req.params.userId, items: [] });
  } 
  
  const existingItem = cart.items.find((item) => item.product.toString() === productId); 
  if (existingItem) { 
    existingItem.quantity += quantity; 
  } else { 
    cart.items.push({ product: productId, quantity }); 
  } 
    await cart.save(); res.status(200).json(cart);
   } catch (error) { 
    res.status(500).send(error.message); 

  } 
}); 

// Remove item from cart

router.delete('/:userId/:productId', async (req, res) => { 
  try { 
    const cart = await Cart.findOne({ user: req.params.userId }); 
    if (!cart) return res.status(404).send('Cart not found'); 
    
    cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId); 
    await cart.save(); 
    res.status(200).json(cart); 
  } catch (error) { 
    res.status(500).send(error.message); 
  } 
}); 


module.exports = router;
