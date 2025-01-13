const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');
const router = express.Router();
const jwt = require('jsonwebtoken');

// ✅ Middleware for Vendor Authentication with Translations
const authenticateVendor = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: req.t('error_token_missing') });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.vendorId = decoded.id;
        next();
    } catch (error) {
        res.status(403).json({ message: req.t('error_invalid_token') });
    }
};

// ✅ Create an order and link it with vendorId (with Translations)
router.post('/:userId', async (req, res) => {
    const { address } = req.body;
    try {
        // Validate ObjectId format
        if (!req.params.userId || !mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ message: req.t('error_invalid_user_id') });
        }

        // Fetch the user's cart and populate products
        const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: req.t('error_cart_empty') });
        }

        // Calculate total price
        const totalAmount = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const vendorId = cart.items[0].product.vendorId; 

        // Check and update product stock with translations
        for (const item of cart.items) {
            if (item.product.stock < item.quantity) {
                return res.status(400).json({ message: req.t('error_insufficient_stock', { product: item.product.name }) });
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

        // ✅ Update user's purchase history
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

        res.status(201).json({ message: req.t('order_successful'), order: newOrder });
    } catch (error) {
        res.status(500).json({ message: req.t('error_generic') });
    }
});

// ✅ Fetch Orders for a Specific Vendor (Vendor Protected Route)
router.get('/vendor', authenticateVendor, async (req, res) => {
    try {
        const orders = await Order.find({ vendorId: req.vendorId }).populate('items.product');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: req.t('error_generic') });
    }
});

// ✅ Fetch All Orders for a Specific User
router.get('/:userId/orders', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.params.userId }).populate('items.product');
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: req.t('error_no_orders_found') });
        }
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: req.t('error_generic') });
    }
});

// ✅ Update Order Status (Vendor Protected)
router.put('/:orderId', authenticateVendor, async (req, res) => {
    const { orderStatus } = req.body;
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: req.t('error_order_not_found') });
        }

        // Validate vendor ownership
        if (order.vendorId.toString() !== req.vendorId) {
            return res.status(403).json({ message: req.t('error_unauthorized_vendor') });
        }

        order.orderStatus = orderStatus;
        await order.save();
        req.io.emit('orderStatusUpdate', { orderId: req.params.orderId, orderStatus });
        res.status(200).json({ message: req.t('order_status_updated'), order });
    } catch (error) {
        res.status(500).json({ message: req.t('error_generic') });
    }
});

module.exports = router;