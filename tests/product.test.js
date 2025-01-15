const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');

let vendorToken;
let testProductId;

// ✅ Setup and Teardown
beforeAll(async () => {
    jest.setTimeout(30000); // Ensure long enough timeout for DB operations
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany();
    await Vendor.deleteMany();

    // ✅ Register a test vendor and obtain a token
    const vendorRes = await request(server)
        .post('/api/vendors/register')
        .send({
            name: "Test Vendor",
            email: "vendor@example.com",
            password: "password123"
        });
    
    const loginRes = await request(server)
        .post('/api/vendors/login')
        .send({
            email: "vendor@example.com",
            password: "password123"
        });
    
    vendorToken = loginRes.body.token;
});

afterAll(async () => {
    await mongoose.connection.close();
    server.close();
});

// ✅ Test: Create a Product
describe('Product Management End-to-End Tests', () => {

    it('should create a new product successfully', async () => {
        const res = await request(server)
            .post('/api/products')
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({
                name: 'Test Product',
                description: 'A product for testing',
                price: 100,
                stock: 20,
                category: 'Electronics'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Test Product');
        testProductId = res.body._id;
    });

    // ✅ Test: Fetch Vendor's Products
    it('should fetch products for the authenticated vendor', async () => {
        const res = await request(server)
            .get('/api/products')
            .set('Authorization', `Bearer ${vendorToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.products.length).toBeGreaterThan(0);
    });

    // ✅ Test: Update Product (Positive Case)
    it('should update an existing product successfully', async () => {
        const res = await request(server)
            .put(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({ price: 150, stock: 10 });
        expect(res.statusCode).toBe(200);
        expect(res.body.price).toBe(150);
        expect(res.body.stock).toBe(10);
    });

    // ✅ Test: Unauthorized Update Attempt
    it('should prevent unauthorized product updates', async () => {
        const res = await request(server)
            .put(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer INVALIDTOKEN`)
            .send({ price: 150 });
        expect(res.statusCode).toBe(403);
    });

    // ✅ Test: Delete Product
    it('should delete the product successfully', async () => {
        const res = await request(server)
            .delete(`/api/products/${testProductId}`)
            .set('Authorization', `Bearer ${vendorToken}`);
        expect(res.statusCode).toBe(200);
    });
});