const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');


const app = require('../src/server.js'); 

describe('GET /api/data/:id', () => {
    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app).get('/api/data/999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
});

describe('GET /api/data', () => {
    it('should respond with paginated and filtered data', async () => {
        const response = await request(app).get('/api/data?pageNumber=1');
        expect(response.status).toBe(200);
        
    });
});

describe('DELETE /api/data/:id', () => {
    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app).delete('/api/data/9999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
});

describe('POST /api/data', () => {
    it('should add a new item', async () => {
        const newItem = { name: 'New profile', age: 20 };
        const response = await request(app)
            .post('/api/data')
            .send(newItem);
        newItem.id = response.body.newItem.id;
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Item added successfully', newItem });
    });
    it('should fail at validation', async () => {
        const newItem = { name: 'New profile', age: 2 };
        const response = await request(app)
            .post('/api/data')
            .send(newItem);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not valid'});
    });
});

describe('PUT /api/data/:id', () => {
    it('should update the item with the given ID', async () => {
        const updatedItem = { name: 'Updated Item' };
        const response = await request(app)
            .put('/api/data/2')
            .send(updatedItem);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Item updated successfully', updatedItem });
    });

    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app)
            .put('/api/data/999')
            .send({ name: 'Updated Item' });
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Item not found' });
    });
});

describe('GET /api/posts/:profileId', () => {
    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app).get('/api/posts/999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Posts not found for the specified profile ID' });
    });
});

describe('POST /api/posts/:profileId', () => {
    it('should fail adding a new post', async () => {
        const response = await request(app).post('/api/posts/999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Profile not found' });
    });
});

describe('DELETE /api/posts/delete/:profileId/:postId', () => {
    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app).delete('/api/posts/delete/999/999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Profile containing the post not found' });
    });
});

describe('PUT /api/posts/update/:profileId/:postId', () => {
    it('should respond with 404 if ID is not found', async () => {
        const response = await request(app).put('/api/posts/update/999/999');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Profile containing the post not found' });
    });
});

