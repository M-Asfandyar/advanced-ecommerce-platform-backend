const express = require('express'); 
const mongoose = require('mongoose');
const Cart = require('../models/Cart'); 
const Product = require('../models/Product'); 
const router = express.Router(); 

// ✅ Get user's cart with proper error handling
router.get('/:userId', async (req, res) => { 
    try { 
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).send('Invalid User ID format.');
        }

        const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product'); 
        if (!cart) return res.status(404).send('Cart not found'); 
        res.status(200).json(cart); 
    } catch (error) { 
        res.status(500).send(`Error fetching cart: ${error.message}`); 
    } 
}); 

// ✅ Add item to cart with improved validation and error handling
router.post('/:userId', async (req, res) => { 
    const { productId, quantity } = req.body;

    // Validate ObjectId and input data
    if (!mongoose.Types.ObjectId.isValid(req.params.userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).send('Invalid User ID or Product ID format.');
    }

    if (!quantity || quantity <= 0) {
        return res.status(400).send('Quantity must be greater than zero.');
    }

    try { 
        let cart = await Cart.findOne({ user: req.params.userId }); 
        const product = await Product.findById(productId); 
        if (!product) return res.status(404).send('Product not found'); 

        // If cart doesn't exist, create a new cart
        if (!cart) { 
            cart = new Cart({ user: req.params.userId, items: [] });
        } 
        
        // Check if the product already exists in the cart
        const existingItem = cart.items.find((item) => item.product.toString() === productId); 
        if (existingItem) { 
            existingItem.quantity += quantity; 
        } else { 
            cart.items.push({ product: productId, quantity }); 
        } 

        await cart.save(); 
        res.status(200).json({ message: 'Item added to cart successfully.', cart });
    } catch (error) { 
        res.status(500).send(`Error adding product to cart: ${error.message}`); 
    } 
}); 

// ✅ Remove item from cart with validation
router.delete('/:userId/:productId', async (req, res) => { 
    const { userId, productId } = req.params;

    // Validate IDs before processing
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).send('Invalid User ID or Product ID format.');
    }

    try { 
        const cart = await Cart.findOne({ user: userId }); 
        if (!cart) return res.status(404).send('Cart not found'); 
        
        // Remove the product from the cart
        cart.items = cart.items.filter((item) => item.product.toString() !== productId); 
        await cart.save(); 
        res.status(200).json({ message: 'Item removed from cart successfully.', cart }); 
    } catch (error) { 
        res.status(500).send(`Error removing product from cart: ${error.message}`); 
    } 
}); 

module.exports = router;