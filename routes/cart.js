const express = require('express'); 
const mongoose = require('mongoose');
const Cart = require('../models/Cart'); 
const Product = require('../models/Product'); 
const router = express.Router(); 

// ✅ Get user's cart with proper error handling and i18n
router.get('/:userId', async (req, res) => { 
    try { 
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ message: req.t('error_invalid_user_id') });
        }

        const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product'); 
        if (!cart) {
            return res.status(404).json({ message: req.t('error_cart_not_found') });
        }
        res.status(200).json(cart); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') });
    } 
}); 

// ✅ Add item to cart with improved validation and multilingual support
router.post('/:userId', async (req, res) => { 
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: req.t('error_invalid_user_id') });
    }

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: req.t('error_invalid_quantity') });
    }

    try { 
        let cart = await Cart.findOne({ user: req.params.userId }); 
        const product = await Product.findById(productId); 
        if (!product) {
            return res.status(404).json({ message: req.t('error_product_not_found') });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: req.t('error_insufficient_stock') });
        }

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
        res.status(200).json({ message: req.t('cart_updated_successfully'), cart });
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') });
    } 
}); 

// ✅ Remove item from cart with validation and translations
router.delete('/:userId/:productId', async (req, res) => { 
    const { userId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: req.t('error_invalid_user_id') });
    }

    try { 
        const cart = await Cart.findOne({ user: userId }); 
        if (!cart) {
            return res.status(404).json({ message: req.t('error_cart_not_found') });
        }
        
        // Remove the product from the cart
        cart.items = cart.items.filter((item) => item.product.toString() !== productId); 
        await cart.save(); 
        res.status(200).json({ message: req.t('cart_item_removed_successfully'), cart }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') });
    } 
}); 

module.exports = router;