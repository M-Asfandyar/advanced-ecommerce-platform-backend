const express = require('express'); 
const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
const cors = require('cors'); 
const http = require('http'); 
const { Server } = require('socket.io'); 

dotenv.config(); 
const app = express(); 
app.use(cors()); 
app.use(express.json()); 
const PORT = process.env.PORT || 4000; 

// MongoDB Connection 
mongoose 
.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }) 
.then(() => console.log('Connected to MongoDB')) 
.catch((err) => console.log('MongoDB connection error:', err)); 

// Create HTTP server and integrate Socket.IO 
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: '*', // Allow all origins (adjust for production) 
  }, 
}); 

// Set up Socket.IO connections 
io.on('connection', (socket) => { 
  console.log('A user connected:', socket.id); 
  // Handle disconnection 
  socket.on('disconnect', () => { 
    console.log('User disconnected:', socket.id); 
  }); 
}); 

// Make io available to routes via app 
app.set('io', io); 

// Routes 
const userRoutes = require('./routes/user'); 
const productRoutes = require('./routes/product'); 
const cartRoutes = require('./routes/cart'); 
const orderRoutes = require('./routes/order'); 
app.use('/api/users', userRoutes); 
app.use('/api/products', (req, res, next) => { 
  req.io = io; // Pass io instance to routes 
  next(); 
}, productRoutes); 
app.use('/api/carts', cartRoutes); 
app.use('/api/orders', orderRoutes); 
app.get('/', (req, res) => res.send('Backend is running!')); 

// Start the server 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));