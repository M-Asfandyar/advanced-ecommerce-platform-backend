const { io } = require('socket.io-client');
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');

let socket, vendorToken, userToken, testProductId;

beforeAll(async () => {
    jest.setTimeout(30000);
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany();
    await User.deleteMany();
    await Cart.deleteMany();

    // ✅ Register and login a test vendor
    const vendorRes = await request(server)
        .post('/api/vendors/register')
        .send({ name: "Test Vendor", email: "vendor@example.com", password: "vendorpassword" });

    const vendorLoginRes = await request(server)
        .post('/api/vendors/login')
        .send({ email: "vendor@example.com", password: "vendorpassword" });
    vendorToken = vendorLoginRes.body.token;

    // ✅ Register and login a test user
    const userRes = await request(server)
        .post('/api/users/register')
        .send({ name: "Test User", email: "testuser@example.com", password: "password123" });

    const userLoginRes = await request(server)
        .post('/api/users/login')
        .send({ email: "testuser@example.com", password: "password123" });
    userToken = userLoginRes.body.token;

    // ✅ Create a test product
    const productRes = await request(server)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
            name: "Test Product",
            description: "Product for WebSocket testing",
            price: 100,
            stock: 10,
            category: "Electronics",
        });
    testProductId = productRes.body._id;

    // ✅ Initialize WebSocket Client
    socket = io(`http://localhost:${process.env.PORT || 4000}`, {
        transports: ['websocket'],
    });
});

afterAll(async () => {
    socket.disconnect();
    await mongoose.connection.close();
    server.close();
});

describe('WebSocket Real-Time Event Tests', () => {
    // ✅ Test: Inventory Update Event
    it('should receive an inventory update event', (done) => {
        socket.on('inventoryUpdate', (data) => {
            expect(data.productId).toBe(testProductId);
            expect(data.stock).toBe(8); // Stock reduced by 2
            done();
        });

        // Simulate adding a product to the user's cart and placing an order
        request(server)
            .post(`/api/carts/${userToken}`)
            .send({ productId: testProductId, quantity: 2 })
            .then(() =>
                request(server).post(`/api/orders/${userToken}`).send({ address: "123 Test Street" })
            );
    });

    // ✅ Test: Order Status Update Event
    it('should receive an order status update event', (done) => {
        // Simulate vendor updating order status
        request(server)
            .put(`/api/orders/${testProductId}`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({ orderStatus: "Shipped" })
            .then(() => {
                socket.on('orderStatusUpdate', (data) => {
                    expect(data.orderId).toBeDefined();
                    expect(data.orderStatus).toBe("Shipped");
                    done();
                });
            });
    });
});