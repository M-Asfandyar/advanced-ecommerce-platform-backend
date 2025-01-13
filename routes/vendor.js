const express = require('express'); 
const Vendor = require('../models/Vendor'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const router = express.Router(); 

// ✅ Register a New Vendor with Translations
router.post('/register', async (req, res) => { 
    const { name, email, password } = req.body; 
    try { 
        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ email }); 
        if (existingVendor) { 
            return res.status(400).json({ message: req.t('error_vendor_exists') }); 
        } 
        
        // Hash password and create a new vendor
        const hashedPassword = await bcrypt.hash(password, 10); 
        const newVendor = new Vendor({ name, email, password: hashedPassword }); 
        await newVendor.save(); 
        
        res.status(201).json({ message: req.t('vendor_registered_successfully') }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') }); 
    } 
}); 

// ✅ Vendor Login with Translations
router.post('/login', async (req, res) => { 
    const { email, password } = req.body; 
    try { 
        // Check if vendor exists
        const vendor = await Vendor.findOne({ email }); 
        if (!vendor) { 
            return res.status(404).json({ message: req.t('error_vendor_not_found') }); 
        }
        
        // Validate password
        const isPasswordValid = await bcrypt.compare(password, vendor.password); 
        if (!isPasswordValid) { 
            return res.status(401).json({ message: req.t('error_invalid_credentials') }); 
        }
        
        // Generate JWT Token
        const token = jwt.sign({ id: vendor._id }, process.env.JWT_SECRET, { expiresIn: '1d' }); 
        res.status(200).json({ token, vendorId: vendor._id, message: req.t('vendor_login_successful') }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') }); 
    } 
}); 

module.exports = router;