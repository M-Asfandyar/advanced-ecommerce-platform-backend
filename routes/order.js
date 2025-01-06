const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');
const router = express.Router();
const jwt = require('jsonwebtoken');

// ✅ Middleware for Vendor Authentication
const authenticateVendor = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. Token missing.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.vendorId = decoded.id;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid token.' });
    }
};

// ✅ Create an order and link it with vendorId
router.post('/:userId', async (req, res) => {
    const { address } = req.body;
    try {
        // Fetch the user's cart and populate the products
        const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).send('Cart is empty');
        }

        // Calculate total price
        const totalAmount = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const vendorId = cart.items[0].product.vendorId;  // Assuming all products belong to the same vendor

        // Check and update product stock
        for (const item of cart.items) {
            if (item.product.stock < item.quantity) {
                return res.status(400).send(`Not enough stock for ${item.product.name}`);
            }
            await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
        }

        // ✅ Create and save the order
        const newOrder = new Order({
            user: req.params.userId,
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
            })),
            totalAmount,
            address,
            vendorId,
        });
        await newOrder.save();

        // ✅ Update the user's purchase history
        await User.findByIdAndUpdate(req.params.userId, {
            $addToSet: { purchaseHistory: { $each: cart.items.map(item => item.product._id) } }
        });

        // ✅ Clear the user's cart
        await Cart.findOneAndDelete({ user: req.params.userId });

        // ✅ Emit a real-time order creation event
        req.io.emit('orderCreated', {
            userId: req.params.userId,
            orderId: newOrder._id,
            totalAmount
        });

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Error Creating Order:', error.message);
        res.status(500).send(`Error Creating Order: ${error.message}`);
    }
});

// ✅ Fetch Orders for a Specific Vendor (Vendor Protected Route)
router.get('/vendor', authenticateVendor, async (req, res) => {
    try {
        const orders = await Order.find({ vendorId: req.vendorId }).populate('items.product');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ✅ Fetch All Orders for a Specific User
router.get('/:userId/orders', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.params.userId }).populate('items.product');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ✅ Update Order Status (Vendor Protected)
router.put('/:orderId', authenticateVendor, async (req, res) => {
    const { orderStatus } = req.body;
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).send('Order not found');

        if (order.vendorId.toString() !== req.vendorId) {
            return res.status(403).send('You are not authorized to update this order.');
        }

        order.orderStatus = orderStatus;
        await order.save();
        req.io.emit('orderStatusUpdate', { orderId: req.params.orderId, orderStatus });
        res.status(200).json(order);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = router;