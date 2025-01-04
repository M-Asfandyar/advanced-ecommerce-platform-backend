const express = require('express'); 
const Vendor = require('../models/Vendor'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const router = express.Router(); 

// Register a new vendor 

router.post('/register', async (req, res) => { 
  const { name, email, password } = req.body; 
  try { 
    const existingVendor = await Vendor.findOne({ email }); 
    if (existingVendor) { 
      return res.status(400).json({ 
        message: 'Vendor already exists' 
      }); 
    } 
    
    const hashedPassword = await bcrypt.hash(password, 10); 
    const newVendor = new Vendor({ name, email, password: hashedPassword }); 
    
    await newVendor.save(); 
    
    res.status(201).json({ 
      message: 'Vendor registered successfully!' 
    }); 
  } catch (error) { 
    res.status(500).json({ message: 'Error registering vendor' }); 
  } 
}); 

// Vendor Login 

router.post('/login', async (req, res) => { 
  const { email, password } = req.body; 
  try { 
    const vendor = await Vendor.findOne({ email }); 
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' }); 
    
    const isPasswordValid = await bcrypt.compare(password, vendor.password); 
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' }); 
    
    const token = jwt.sign({ id: vendor._id }, process.env.JWT_SECRET, { expiresIn: '1d' }); 
    res.status(200).json({ token, vendorId: vendor._id }); 
  } catch (error) { 
    res.status(500).json({ message: 'Error logging in' }); 
  } 
}); 


module.exports = router;
