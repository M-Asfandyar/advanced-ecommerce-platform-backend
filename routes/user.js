const express = require('express'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const router = express.Router(); 

// ✅ User Registration with Translations
router.post('/register', async (req, res) => { 
    const { name, email, password } = req.body; 
    try { 
        // Check if user already exists
        const existingUser = await User.findOne({ email }); 
        if (existingUser) { 
            return res.status(400).json({ message: req.t('error_user_exists') });
        } 

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); 

        // Create a new user
        const newUser = new User({ name, email, password: hashedPassword }); 
        await newUser.save(); 

        res.status(201).json({ message: req.t('user_created_successfully') }); 
    } catch (error) {
        res.status(500).json({ message: req.t('error_generic') }); 
    } 
}); 

// ✅ User Login with Translations
router.post('/login', async (req, res) => { 
    const { email, password } = req.body; 
    try { 
        // Find the user by email
        const user = await User.findOne({ email }); 
        if (!user) { 
            return res.status(404).json({ message: req.t('error_user_not_found') });
        } 

        // Validate the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) { 
            return res.status(401).json({ message: req.t('error_invalid_credentials') });
        } 
        
        // Generate a JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ 
            token, 
            userId: user._id, 
            name: user.name, 
            message: req.t('login_successful') 
        }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') }); 
    } 
}); 
  
// ✅ Get User Profile with Translations
router.get('/:id', async (req, res) => { 
    try { 
        const user = await User.findById(req.params.id); 
        if (!user) { 
            return res.status(404).json({ message: req.t('error_user_not_found') });
        } 
        
        res.status(200).json({ 
            name: user.name, 
            email: user.email, 
            role: user.role 
        }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') });
    }
}); 
    
// ✅ Update User Profile with Translations
router.put('/:id', async (req, res) => { 
    const { name, email } = req.body; 
    try { 
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { name, email }, 
            { new: true }
        ); 

        if (!updatedUser) { 
            return res.status(404).json({ message: req.t('error_user_not_found') });
        } 
        
        res.status(200).json({ 
            message: req.t('profile_updated_successfully'), 
            user: updatedUser 
        }); 
    } catch (error) { 
        res.status(500).json({ message: req.t('error_generic') });
    } 
});

module.exports = router;