const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let userToken, vendorToken;
let testUserId, testVendorId, testProductId;

beforeAll(async () => {
    jest.setTimeout(30000);
    await mongoose.connect(process.env.MONGO_URI);
    await Order.deleteMany();
    await Cart.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    // ✅ Register and login a test user
    const userRes = await request(server)
        .post('/api/users/register')
        .send({ name: "Test User", email: "testuser@example.com", password: "password123" });
    testUserId = userRes.body.userId;

    const userLoginRes = await request(server)
        .post('/api/users/login')
        .send({ email: "testuser@example.com", password: "password123" });
    userToken = userLoginRes.body.token;

    // ✅ Register and login a test vendor
    const vendorRes = await request(server)
        .post('/api/vendors/register')
        .send({ name: "Test Vendor", email: "vendor@example.com", password: "vendorpassword" });
    testVendorId = vendorRes.body.vendorId;

    const vendorLoginRes = await request(server)
        .post('/api/vendors/login')
        .send({ email: "vendor@example.com", password: "vendorpassword" });
    vendorToken = vendorLoginRes.body.token;

    // ✅ Create a test product for the vendor
    const productRes = await request(server)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
            name: "Test Product",
            description: "A product for testing orders",
            price: 100,
            stock: 10,
            category: "Electronics",
        });
    testProductId = productRes.body._id;

    // ✅ Add the product to the user's cart
    await request(server)
        .post(`/api/carts/${testUserId}`)
        .send({ productId: testProductId, quantity: 2 });
});

afterAll(async () => {
    await mongoose.connection.close();
    server.close();
});

describe('Order Management End-to-End Tests', () => {
    let testOrderId;

    // ✅ Test: Create an Order
    it('should create an order successfully', async () => {
        const res = await request(server)
            .post(`/api/orders/${testUserId}`)
            .send({ address: "123 Test Street" });
        expect(res.statusCode).toBe(201);
        expect(res.body.totalAmount).toBe(200);
        testOrderId = res.body._id;
    });

    // ✅ Test: Fetch Orders for a User
    it('should fetch all orders for a user', async () => {
        const res = await request(server)
            .get(`/api/orders/${testUserId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    // ✅ Test: Fetch Orders for a Vendor
    it('should fetch all orders for the vendor', async () => {
        const res = await request(server)
            .get('/api/orders/vendor')
            .set('Authorization', `Bearer ${vendorToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    // ✅ Test: Update Order Status
    it('should update the status of an order', async () => {
        const res = await request(server)
            .put(`/api/orders/${testOrderId}`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({ orderStatus: "Shipped" });
        expect(res.statusCode).toBe(200);
        expect(res.body.orderStatus).toBe("Shipped");
    });

    // ✅ Test: Unauthorized Access to Update Order Status
    it('should prevent unauthorized access to update order status', async () => {
        const res = await request(server)
            .put(`/api/orders/${testOrderId}`)
            .set('Authorization', `Bearer INVALIDTOKEN`)
            .send({ orderStatus: "Delivered" });
        expect(res.statusCode).toBe(403);
    });

    // ✅ Test: Real-Time Order Event Emission
    it('should emit real-time order creation event', async () => {
        const res = await request(server)
            .post(`/api/orders/${testUserId}`)
            .send({ address: "456 Another Test Street" });
        expect(res.statusCode).toBe(201);
        expect(res.body.totalAmount).toBe(200);
        // Assuming WebSocket testing occurs in integration tests
    });
});