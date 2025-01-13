const express = require('express');
const Product = require('../models/Product');
const client = require('../utils/cache'); 
const logger = require('../utils/logger');
const { httpRequestDuration } = require('../utils/metrics');
const jwt = require('jsonwebtoken'); 
const router = express.Router();

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
        return res.status(403).json({ message: req.t('error_invalid_token') });
    }
};

// ✅ Get All Products (Filtered by Vendor with Caching)
router.get('/', authenticateVendor, async (req, res) => { 
    const { page = 1, limit = 10, category, sort } = req.query; 
    const cacheKey = `products:vendor=${req.vendorId}:page=${page}:limit=${limit}:category=${category || 'all'}:sort=${sort || 'none'}`; 
    const end = httpRequestDuration.startTimer(); 

    try { 
        // Check Cache
        const cachedData = await client.get(cacheKey); 
        if (cachedData) { 
            logger.info('Cache hit for product listings');
            end({ method: req.method, route: req.path, status: 200 });
            return res.status(200).json(JSON.parse(cachedData)); 
        } 

        // Fetch products for the authenticated vendor
        const query = category ? { category, vendorId: req.vendorId } : { vendorId: req.vendorId };
        const products = await Product.find(query)
            .sort(sort ? { [sort]: 1 } : {})
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        const response = { total, products };

        // Cache the response for 1 hour
        await client.setEx(cacheKey, 3600, JSON.stringify(response)); 
        logger.info('Cache miss. Fetched product listings from database.');

        end({ method: req.method, route: req.path, status: 200 });
        res.status(200).json(response); 
    } catch (error) { 
        logger.error(`Error fetching products: ${error.message}`);
        end({ method: req.method, route: req.path, status: 500 });
        res.status(500).json({ message: req.t('error_generic') });
    } 
});

// ✅ Create a New Product (Vendor Only)
router.post('/', authenticateVendor, async (req, res) => {
    const { name, description, price, stock, category, images } = req.body;
    const end = httpRequestDuration.startTimer(); 

    try {
        const newProduct = new Product({ 
            name, description, price, stock, category, images, vendorId: req.vendorId 
        });
        await newProduct.save();

        req.io.emit('inventoryUpdate', { productId: newProduct._id, stock: newProduct.stock });
        logger.info(`Product created: ${newProduct.name} (${newProduct._id})`);

        end({ method: req.method, route: req.path, status: 201 });
        res.status(201).json({ message: req.t('product_created_successfully'), product: newProduct });
    } catch (error) {
        logger.error(`Error creating product: ${error.message}`);
        end({ method: req.method, route: req.path, status: 500 });
        res.status(500).json({ message: req.t('error_generic') });
    }
});

// ✅ Update a Product (Vendor Only)
router.put('/:id', authenticateVendor, async (req, res) => {
    const end = httpRequestDuration.startTimer(); 

    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { _id: req.params.id, vendorId: req.vendorId }, 
            req.body, 
            { new: true }
        );

        if (!updatedProduct) {
            logger.warn(`Product not found or unauthorized access: ${req.params.id}`);
            end({ method: req.method, route: req.path, status: 404 });
            return res.status(404).json({ message: req.t('error_product_not_found') });
        }

        req.io.emit('inventoryUpdate', { productId: updatedProduct._id, stock: updatedProduct.stock });
        logger.info(`Product updated: ${updatedProduct.name} (${updatedProduct._id})`);

        end({ method: req.method, route: req.path, status: 200 });
        res.status(200).json({ message: req.t('product_updated_successfully'), product: updatedProduct });
    } catch (error) {
        logger.error(`Error updating product: ${error.message}`);
        end({ method: req.method, route: req.path, status: 500 });
        res.status(500).json({ message: req.t('error_generic') });
    }
});

// ✅ Delete a Product (Vendor Only)
router.delete('/:id', authenticateVendor, async (req, res) => {
    const end = httpRequestDuration.startTimer(); 

    try {
        const deletedProduct = await Product.findOneAndDelete({ _id: req.params.id, vendorId: req.vendorId });
        if (!deletedProduct) {
            logger.warn(`Unauthorized attempt to delete: ${req.params.id}`);
            end({ method: req.method, route: req.path, status: 404 });
            return res.status(404).json({ message: req.t('error_product_not_found') });
        }

        logger.info(`Product deleted: ${req.params.id}`);
        end({ method: req.method, route: req.path, status: 200 });
        res.status(200).json({ message: req.t('product_deleted_successfully') });
    } catch (error) {
        logger.error(`Error deleting product: ${error.message}`);
        end({ method: req.method, route: req.path, status: 500 });
        res.status(500).json({ message: req.t('error_generic') });
    }
});

module.exports = router;
