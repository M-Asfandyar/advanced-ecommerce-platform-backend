const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user')
const productRoutes = require('./routes/product')
const cartRouter = require ('./routes/cart')
const orderRouter = require ('./routes/order')
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/carts' , cartRouter);
app.use('/api/orders', orderRouter);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('MongoDB connection error:', err));

app.get('/', (req, res) => res.send('Backend is running!'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
