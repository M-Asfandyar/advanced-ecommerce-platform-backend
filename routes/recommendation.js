const express = require('express'); 
const User = require('../models/User'); 
const Product = require('../models/Product'); 
const router = express.Router(); 

// Collaborative Filtering Based Product Recommendation 
router.get('/:userId', async (req, res) => { 
    const { userId } = req.params; 
    try { 
        console.log('Fetching recommendations for:', userId); // Debug log

        // Find the user's purchase history 
        const user = await User.findById(userId).populate('purchaseHistory'); 
        if (!user) { 
            return res.status(404).json({ message: 'User not found' }); 
        } 
        
        // Extract categories from purchase history 
        const purchasedCategories = user.purchaseHistory.map(p => p.category); 
        
        // Fetch products from those categories excluding already purchased items 
        const recommendedProducts = await Product.find({ 
            category: { $in: purchasedCategories }, 
            _id: { $nin: user.purchaseHistory } 
        }).limit(5); // Limit recommendations to 5 products 
        
        res.json(recommendedProducts); 
    } catch (error) { 
        console.error('Error generating recommendations:', error); // Debug error log
        res.status(500).json({ message: 'Error generating recommendations' }); 
    } 
}); 

module.exports = router;