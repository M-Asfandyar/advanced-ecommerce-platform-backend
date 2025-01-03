const express = require('express'); 
const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
const cors = require('cors'); 
const http = require('http'); 
const { Server } = require('socket.io'); 
const logger = require('./utils/logger');
const { register, httpRequestDuration } = require('./utils/metrics');
const recommendationRoutes = require('./routes/recommendation');

dotenv.config(); 

const app = express(); 
app.use(cors()); 
app.use(express.json()); 

const PORT = process.env.PORT || 4000; 

// Middleware to track HTTP request metrics 
app.use((req, res, next) => { 
  const end = httpRequestDuration.startTimer(); 
  res.on('finish', () => { 
    end({ 
      method: req.method, 
      route: req.route?.path || req.path, 
      status: res.statusCode 
    }); 
  }); 
  next(); 
}); 

// Prometheus Metrics Endpoint 
app.get('/metrics', async (req, res) => { 
  res.setHeader('Content-Type', register.contentType); 
  res.end(await register.metrics()); 
}); 

// MongoDB Connection 
mongoose 
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }) 
  .then(() => logger.info('Connected to MongoDB')) 
  .catch((err) => logger.error(`MongoDB connection error: ${err.message}`)); 
  
// Create HTTP server and integrate Socket.IO 
const server = http.createServer(app); 
const io = new Server(server, { 
  cors: { 
    origin: '*', // Allow all origins (adjust for production) 
  }, 
}); 
    
// Set up Socket.IO connections 
io.on('connection', (socket) => { 
  logger.info(`A user connected: ${socket.id}`); 
  socket.on('disconnect', () => { 
    logger.info(`User disconnected: ${socket.id}`); 
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
app.use('/api/recommendations', recommendationRoutes);
app.get('/', (req, res) => res.send('Backend is running!')); 
  
// Start the server 
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
