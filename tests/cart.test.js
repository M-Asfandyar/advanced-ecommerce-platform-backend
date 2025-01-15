const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let userToken;
let testUserId;
let testProductId;

// ✅ Setup and Teardown
beforeAll(async () => {
    jest.setTimeout(30000); 
    await mongoose.connect(process.env.MONGO_URI);
    await Cart.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    // ✅ Register a test user and obtain a token
    const userRes = await request(server)
        .post('/api/users/register')
        .send({
            name: "Test User",
            email: "testuser@example.com",
            password: "password123"
        });
    testUserId = userRes.body.userId;

    const loginRes = await request(server)
        .post('/api/users/login')
        .send({
            email: "testuser@example.com",
            password: "password123"
        });
    userToken = loginRes.body.token;

    // ✅ Create a test product
    const productRes = await request(server)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
            name: "Test Product",
            description: "Test Description",
            price: 50,
            stock: 100,
            category: "Electronics"
        });
    testProductId = productRes.body._id;
});

afterAll(async () => {
    await mongoose.connection.close();
    server.close();
});

// ✅ Test: Add Item to Cart
describe('Cart Management End-to-End Tests', () => {
    it('should add an item to the cart', async () => {
        const res = await request(server)
            .post(`/api/carts/${testUserId}`)
            .send({
                productId: testProductId,
                quantity: 2
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.cart.items.length).toBe(1);
    });

    // ✅ Test: Fetch Cart for a User
    it('should fetch the user cart', async () => {
        const res = await request(server)
            .get(`/api/carts/${testUserId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
    });

    // ✅ Test: Remove Item from Cart
    it('should remove an item from the cart', async () => {
        const res = await request(server)
            .delete(`/api/carts/${testUserId}/${testProductId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.cart.items.length).toBe(0);
    });

    // ✅ Test: Attempt to Remove Non-Existent Product
    it('should return an error when removing a non-existent product', async () => {
        const res = await request(server)
            .delete(`/api/carts/${testUserId}/INVALID_PRODUCT_ID`);
        expect(res.statusCode).toBe(400);
    });

    // ✅ Test: Adding an Item with Invalid Quantity
    it('should return an error for invalid quantity', async () => {
        const res = await request(server)
            .post(`/api/carts/${testUserId}`)
            .send({
                productId: testProductId,
                quantity: 0
            });
        expect(res.statusCode).toBe(400);
    });
});
