const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

//User registratin

router.post('/register', async (req, res) => { const { name, email, password } = req.body; 
try { const hashedPassword = await bcrypt.hash(password, 10); 
  const newUser = new User({ name, email, password: hashedPassword }); 
  await newUser.save(); res.status(201).send('User created successfully'); } 
  catch (error) { res.status(500).send(error.message); } });


//User LOGIN  
router.post('/login', async (req, res) => { 
  const { email, password } = req.body; 
  try { const user = await User.findOne({ email }); 
  if (!user) 
    return res.status(404).send('User not found'); 
  const isPasswordValid = await bcrypt.compare(password, user.password); 
  
  if (!isPasswordValid) return res.status(401).send('Invalid credentials'); 
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' }); res.status(200).json({ token }); } catch (error) { res.status(500).send(error.message); } 
});


module.exports = router;