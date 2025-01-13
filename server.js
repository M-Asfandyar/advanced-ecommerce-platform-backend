const express = require('express'); 
const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
const cors = require('cors'); 
const http = require('http'); 
const { Server } = require('socket.io'); 
const logger = require('./utils/logger');
const { register, httpRequestDuration } = require('./utils/metrics');
const i18n = require('./i18n'); 
const middleware = require('i18next-http-middleware'); // ✅ Import the middleware correctly

// Import routes
const recommendationRoutes = require('./routes/recommendation');
const vendorRoutes = require('./routes/vendor');
const userRoutes = require('./routes/user'); 
const productRoutes = require('./routes/product'); 
const cartRoutes = require('./routes/cart'); 
const orderRoutes = require('./routes/order');

dotenv.config(); 

const app = express(); 
app.use(cors()); 
app.use(express.json()); 

const PORT = process.env.PORT || 4000; 

// ✅ Apply the i18n middleware correctly
app.use(middleware.handle(i18n));

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

// ✅ Prometheus Metrics Endpoint 
app.get('/metrics', async (req, res) => { 
    res.setHeader('Content-Type', register.contentType); 
    res.end(await register.metrics()); 
}); 

// ✅ MongoDB Connection 
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }) 
    .then(() => logger.info('Connected to MongoDB')) 
    .catch((err) => logger.error(`MongoDB connection error: ${err.message}`)); 

// ✅ Create HTTP server and integrate Socket.IO 
const server = http.createServer(app); 
const io = new Server(server, { 
    cors: { origin: '*' }
}); 

// ✅ Set up Socket.IO connections 
io.on('connection', (socket) => { 
    logger.info(`A user connected: ${socket.id}`); 
    socket.on('disconnect', () => { 
        logger.info(`User disconnected: ${socket.id}`); 
    }); 
}); 

// ✅ Make io available to routes via middleware 
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ✅ Corrected Route Imports with io Integration
app.use('/api/users', userRoutes); 
app.use('/api/products', productRoutes); 
app.use('/api/carts', cartRoutes); 
app.use('/api/orders', orderRoutes); 
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/vendors', vendorRoutes);

// ✅ Health Check Endpoint
app.get('/', (req, res) => res.send('Backend is running!'));

// ✅ Global Error Handling Middleware with Translation Support
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(500).json({ message: req.t('error_generic') }); 
});

// ✅ Start the server
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
