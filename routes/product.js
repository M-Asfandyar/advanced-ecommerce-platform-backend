const express = require('express'); 
const Product = require('../models/Product'); 
const router = express.Router(); 


// Get all products (Filterable) 
router.get('/', async (req, res) => { 
  const { page = 1, limit = 10, category, sort } = req.query; 
  try { 
    const query = category ? { category } : {}; 
    const products = await Product.find(query) 
      .sort(sort ? { [sort]: 1 } : {}) 
      .skip((page - 1) * limit) 
      .limit(parseInt(limit)); 
      
    const total = await Product.countDocuments(query); 
    res.status(200).json({ total, products }); 
  } catch (error) { res.status(500).send(error.message); } 
});

// Create a new product (Admin can only) 
router.post('/', async (req, res) => { 
  const { name, description, price, stock, category, images } = req.body; 
  try {
    const newProduct = new Product({ name, description, price, stock, category, images }); await newProduct.save(); res.status(201).json(newProduct); 
  } catch (error) { 
    res.status(500).send(error.message); 
  } 
}); 

// Update a product (Admin can only)

router.put('/:id', async (req, res) => { 
  try { 
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!updatedProduct) return res.status(404).send('Product not found'); res.status(200).json(updatedProduct); 
  }
    catch (error) { 
      res.status(500).send(error.message); 
    } 
  });



// Delete a product (Admin only) 
router.delete('/:id', async (req, res) => { 
  try { await Product.findByIdAndDelete(req.params.id); res.status(200).send('Product deleted successfully'); 

  } catch (error) { 
    res.status(500).send(error.message); 
  } 
}); 

module.exports = router;

