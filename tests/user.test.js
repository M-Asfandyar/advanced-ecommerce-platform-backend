const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../server'); 
const User = require('../models/User');

beforeAll(async () => {
    jest.setTimeout(30000);
    await mongoose.connect(process.env.MONGO_URI);
    await User.deleteMany();
});

afterAll(async () => {
    await mongoose.connection.close();
    server.close(); // ✅ Properly closing the server
});

describe('User Authentication End-to-End Tests', () => {
    let token;

    it('should register a new user successfully', async () => {
        const res = await request(server) // ✅ Changed to request(server)
            .post('/api/users/register')
            .send({
                name: 'Test User',
                email: 'testuser@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('User created successfully.');
    });

    it('should log in the registered user', async () => {
        const res = await request(server) 
            .post('/api/users/login')
            .send({
                email: 'testuser@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        token = res.body.token;
    });

    it('should fail with wrong credentials', async () => {
        const res = await request(server)
            .post('/api/users/login')
            .send({
                email: 'wronguser@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(404);
    });
});