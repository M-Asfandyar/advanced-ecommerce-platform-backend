const express = require('express'); 
const Product = require('../models/Product'); 
const client = require('../utils/cache'); // Redis client
const router = express.Router(); 

// Get all products (Filterable with Caching)
router.get('/', async (req, res) => { 
    const { page = 1, limit = 10, category, sort } = req.query; 
    const cacheKey = `products:page=${page}:limit=${limit}:category=${category || 'all'}:sort=${sort || 'none'}`; 

    try { 
        // Check if data is in the cache
        const cachedData = await client.get(cacheKey); 
        if (cachedData) { 
            return res.status(200).json(JSON.parse(cachedData)); 
        }

        // If not cached, fetch from the database
        const query = category ? { category } : {}; 
        const products = await Product.find(query) 
            .sort(sort ? { [sort]: 1 } : {}) 
            .skip((page - 1) * limit) 
            .limit(parseInt(limit)); 

        const total = await Product.countDocuments(query); 

        const response = { total, products }; 

        // Cache the response for 1 hour
        await client.setEx(cacheKey, 3600, JSON.stringify(response)); 

        res.status(200).json(response); 
    } catch (error) { 
        res.status(500).send(error.message); 
    } 
});

// Create a new product (Admin only) 
router.post('/', async (req, res) => { 
    const { name, description, price, stock, category, images } = req.body; 
    try { 
        const newProduct = new Product({ name, description, price, stock, category, images }); 
        await newProduct.save(); 

        // Emit inventory update for real-time functionality 
        req.io.emit('inventoryUpdate', { productId: newProduct._id, stock: newProduct.stock }); 

        res.status(201).json(newProduct); 
    } catch (error) { 
        res.status(500).send(error.message); 
    } 
}); 

// Update a product (Admin only) 
router.put('/:id', async (req, res) => { 
    try { 
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); 
        if (!updatedProduct) return res.status(404).send('Product not found'); 

        // Emit inventory update for real-time functionality 
        req.io.emit('inventoryUpdate', { productId: updatedProduct._id, stock: updatedProduct.stock }); 

        res.status(200).json(updatedProduct); 
    } catch (error) { 
        res.status(500).send(error.message); 
    } 
}); 

// Delete a product (Admin only) 
router.delete('/:id', async (req, res) => { 
    try { 
        await Product.findByIdAndDelete(req.params.id); 
        res.status(200).send('Product deleted successfully'); 
    } catch (error) { 
        res.status(500).send(error.message); 
    } 
}); 

module.exports = router;