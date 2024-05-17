const express = require('express');
const app = express();
const bodyParser = require('body-parser'); // For parsing JSON request body
const { faker } = require('@faker-js/faker');
//const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const rateLimit = require("express-rate-limit");
const xss = require('xss-clean');

const { MongoClient } = require('mongodb');

// MongoDB connection URI
const client = new MongoClient(process.env.uri, { useNewUrlParser: true, useUnifiedTopology: true });

const myDB = client.db("Profiles");
const myColl = myDB.collection("posts");

const jwt = require('jsonwebtoken');

let users = [{username:'user1', password:'pass1', profiles:[1,12]}]; 
const secretKey = 'secret_key';




// Middleware to sanitize user input to prevent XSS attacks + input validation
//app.use(xss());

// Rate limiting middleware against DDOS attacks
const limiter = rateLimit({
    windowMs: 35 * 60 * 1000, // 35 minutes max time connection
    max: 100 // limit each IP to 100 requests per windowMs
});
// Apply rate limiter to all requests
//app.use(limiter);




const port = process.env.Port || 4000; // Port number, you can change it to any available port you want

// Middleware to parse JSON request body
app.use(bodyParser.json());

//const profilesFilePath = path.join(__dirname, 'profiles.json');
//const postsFilePath = path.join(__dirname, 'posts.json');

// Connect to MongoDB
async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}


// Load data from MongoDB collection
async function loadFromMongoDB(collectionName) {
    try {
        await connect(); // Connect only once
        console.log('Connected to MongoDB');
        const db = client.db('Profiles');
        const collection = db.collection(collectionName);
        const data = await collection.find({}).toArray();
        //collection.query();
        console.log('Loaded data:', data);
        return data;
    } catch (error) {
        console.error(`Error loading data from MongoDB collection ${collectionName}:`, error);
        return [];
    }
}


// Save data to MongoDB collection
async function saveToMongoDB(collectionName, data) {
    try {
        await connect();
        console.log('Connected to MongoDB');
        const db = client.db('Profiles');
        const collection = db.collection(collectionName);
        await collection.deleteMany({});
        await collection.insertMany(data);
        console.log(`Data saved to MongoDB collection ${collectionName}`);
    } catch (error) {
        console.error(`Error saving data to MongoDB collection ${collectionName}:`, error);
        return [];
    } 
    
}

let data;
let nextId;

async function fetchData() {
    data = await loadFromMongoDB('profiles');
    nextId = data.length + 1;
    //console.log('Profiles:', data);
    //await generateNumberData(400);
}

async function saveData() {
    await saveToMongoDB('profiles', data);
}

fetchData();

// let data = loadFromJSONFile(profilesFilePath);
/*let data = [
    { name: 'Jane Smith', id: 1, age: 20 },
    { name: 'Tom Denem', id: 2, age: 22 },
    { name: 'Anne Greek', id: 3, age: 21 },
    { name: 'John Smith', id: 4, age: 21 }
];*/

let posts; //= loadFromJSONFile(postsFilePath);
async function fetchPosts() {
    posts = await loadFromMongoDB('posts');
    //console.log('Posts:', posts);
    /*for (const d of data) {
        const pid = d.id;
        const profilePosts = posts.find(post => post.profileId === pid);
        if (profilePosts) {
            for (let i = 0; i < 100; i++) {
                profilePosts.posts.push(generateRandomPost());
            }
        } else {
            const newProfilePosts = [];
            for (let i = 0; i < 100; i++) {
                newProfilePosts.push(generateRandomPost());
            }
            posts.push({ profileId: pid, posts: newProfilePosts });
        }
    }
    await savePosts(); // Ensure posts are saved after updating*/
}

async function savePosts() {
    await saveToMongoDB('posts', posts);
}

fetchPosts();


async function fetchUsers() {
    users = await loadFromMongoDB('users');
}

async function saveUsers() {
    await saveToMongoDB('users', users);
}

fetchUsers();
//saveUsers();



app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const token = jwt.sign({ username: user.username, profiles: user.profiles }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/verify', (req, res) => {
    const { token } = req.body;
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.json({ username: decoded.username, profiles: decoded.profiles });
    });
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    // Check if the username already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const newUser = { username: username, password: password, profiles: [] };
    users.push(newUser);
    saveUsers(users);

    const token = jwt.sign({ username: newUser.username, profiles: newUser.profiles }, secretKey, { expiresIn: '1h' });
    res.json({ token });
});

/*let posts = [
    {
        profileId: 1, posts: [
            { id: 1, title: 'First Post', content: 'This is the first post for Jane Smith' },
            { id: 2, title: 'Second Post', content: 'This is the second post for Jane Smith' }
        ]
    },
    {
        profileId: 2, posts: [
            { id: 3, title: 'First Post', content: 'This is the first post for Tom Denem' }
        ]
    },
    { profileId: 3, posts: [] },
    {
        profileId: 4, posts: [
            { id: 4, title: 'First Post', content: 'This is the first post for John Smith' }
        ]
    }
];
savePosts(posts);*/

function loadFromJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading data from ${filePath}:`, error);
        return [];
    }
}

function saveToJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving data to ${filePath}:`, error);
    }
}

// Route to get posts for a specific profile
app.get('/api/posts/:profileId', (req, res) => {
    const profileId = parseInt(req.params.profileId);
    const profilePosts = posts.find(post => post.profileId === profileId);
    if (profilePosts) {
        res.json(profilePosts.posts);
    } else {
        res.status(404).json({ message: 'Posts not found for the specified profile ID' });
    }
});

async function getPostQuery(profileId) {
    const query = { profileId: profileId };
    const profilePosts = await myColl.find(query).toArray();
        const profileCount = profilePosts[0].posts.length;
        console.log("Posts: ", profileCount);
        return profileCount;
    
}

// Route to get the count of posts for a specific profile
app.get('/api/posts/count/:profileId', async (req, res) => {
    const profileId = parseInt(req.params.profileId);

    //const query = { profileId: profileId };
    //const profilePosts = getPostQuery(profileId);
    //const query = { profileId: profileId };
    //const profilePosts = myColl.find(query);
    //console.log(profilePosts);

    const postCount = await getPostQuery(profileId);
    res.json({ count: postCount });

    //const profilePosts = posts.find(post => post.profileId === profileId);
    /*if (profilePosts) {
        const postCount = profilePosts.posts.length;
        res.json({ count: postCount });
    } else {
        res.status(404).json({ message: 'Posts not found for the specified profile ID' });
    }*/
});

app.get('/api/count', (req, res) => {
    res.json({ count: data.length });
});


// Route to add a new post to a specific profile
app.post('/api/posts/:profileId', (req, res) => {
    const profileId = parseInt(req.params.profileId);
    const { title, content } = req.body;

    // Find the profile with the given profileId
    const profile = posts.find(post => post.profileId === profileId);

    if (!profile) {
        prof = data.find(profile => profile.id == profileId)
        if (!prof) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        else {
            const newPostId = generateUniqueId();
            newdata = { profileId: profileId, posts: [{ id: newPostId, title: title, content: content }] }
            posts.push(newdata);
            res.status(201).json({ message: 'Post added successfully', post: newdata });

            //saveToJSONFile(postsFilePath, posts);
            savePosts();
        }
    } else {

        // Generate a unique id for the new post (you can use UUID or any other method)
        const newPostId = generateUniqueId();

        // Create the new post object
        const newPost = { id: newPostId, title, content };

        // Add the new post to the profile's posts array
        profile.posts.push(newPost);

        res.status(201).json({ message: 'Post added successfully', post: newPost });

        //saveToJSONFile(postsFilePath, posts);
        savePosts();
    }
});

// Function to generate a unique id for the new post 
function generateUniqueId() {
    // Generate a random number
    return Math.floor(Math.random() * 1000) + 1;
}

// Route handler to delete a post by ID
app.delete('/api/posts/delete/:profileId/:postId', (req, res) => {
    const profileId = parseInt(req.params.profileId);
    const postId = parseInt(req.params.postId);

    // Find the index of the profile's posts data in the array
    const profileIndex = posts.findIndex(post => post.profileId === profileId);

    if (profileIndex !== -1) {
        // Find the index of the post within the profile's posts array
        const postIndex = posts[profileIndex].posts.findIndex(post => post.id === postId);
        if (postIndex !== -1) {
            // Remove the post from the profile's posts array
            posts[profileIndex].posts.splice(postIndex, 1);
            res.json({ message: 'Post deleted successfully' });

            //saveToJSONFile(postsFilePath, posts);
            savePosts();
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } else {
        res.status(404).json({ message: 'Profile containing the post not found' });
    }
});

// Route handler to update a post by ID
app.put('/api/posts/update/:profileId/:postId', (req, res) => {
    const profileId = parseInt(req.params.profileId);
    const postId = parseInt(req.params.postId);
    const { title, content } = req.body;

    // Find the profile that contains the post
    const profileIndex = posts.findIndex(post => post.profileId === profileId);

    if (profileIndex !== -1) {
        // Find the index of the post within the profile's posts array
        const postIndex = posts[profileIndex].posts.findIndex(post => post.id === postId);
        if (postIndex !== -1) {
            // Update the post with the new title and content
            posts[profileIndex].posts[postIndex].title = title;
            posts[profileIndex].posts[postIndex].content = content;
            res.json({ message: 'Post updated successfully' });

            //saveToJSONFile(postsFilePath, posts);
            savePosts();
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } else {
        res.status(404).json({ message: 'Profile containing the post not found' });
    }
});


//const server = http.createServer(app);
const wss = new WebSocket.Server({port:5000});

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send initial data to the client upon connection
    ws.send(JSON.stringify(data));

    // Add new data and broadcast to all connected clients every N seconds
    /*const interval = setInterval(() => {
        const newItem = generateRandomData();
        newItem.id = nextId++;
        data.push(newItem);
        const newItemJSON = JSON.stringify(newItem);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(newItemJSON);
            }
        });
    }, 25000); // Send updates every 25 seconds*/

    ws.on('close', () => {
        console.log('Client disconnected');
        //clearInterval(interval); // Stop sending updates when client disconnects
    });
});

// Generate random realistic data
function generateRandomData() {
    return {
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 100 })
    };
}

function generateRandomPost() {
    return {
        id: generateUniqueId(),
        title: faker.hacker.noun(),
        content: faker.hacker.noun()
    };
}

async function generateNumberData( number ) {
    for (let i = 0; i < number; i++) {
        const newItem = generateRandomData();
        newItem.id = nextId++;
        data.push(newItem);
    }
    await saveData(data);
}

// Function to add new random data to the array
/*function addRandomData() {
    const newItem = generateRandomData();
    newItem.id = nextId++;
    data.push(newItem);
}

//const newItem = generateRandomData();
//newItem.id = nextId++;
//data.push(newItem);

// Generate 10 random items at the beginning
/*for (let i = 0; i < 10; i++) {
    const newItem = generateRandomData();
    newItem.id = nextId++; 
    data.push(newItem);

    saveProfiles(data);
}*/

// Interval to add new data every 20 seconds 
/*const intervalSeconds = 20;
setInterval(addRandomData, intervalSeconds * 1000);*/

// Route handler to get data by ID
app.get('/api/data/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = data.find(item => item.id === id);
    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

// Route handler to get all data with pagination and filtering
app.get('/api/data', (req, res) => {
    const { searchText, age, pageNumber } = req.query;
    // Sample pagination and filtering logic (replace this with your actual logic)
    let filteredData = data;

    if (searchText) {
        filteredData = filteredData.filter(item => item.name.includes(searchText));
    }

    if (age) {
        filteredData = filteredData.filter(item => parseInt(item.age) === parseInt(age));
    }

    if (pageNumber) {
        const pageSize = 100; // Number of items per page
        const startIndex = (pageNumber - 1) * pageSize;
        filteredData = filteredData.slice(startIndex, startIndex + pageSize);
    }

    res.json(filteredData);
});


// Route handler to delete data by ID
app.delete('/api/data/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const foundIndex = data.findIndex(item => item.id === id);
    if (foundIndex !== -1) {
        data.splice(foundIndex, 1);

        // Find the index of the item in the posts array with the matching profileId
        const postsIndex = posts.findIndex(post => post.profileId === id);
        if (postsIndex !== -1) {
            // Delete the item from the posts array
            posts.splice(postsIndex, 1);
        }

        res.json({ message: 'Item deleted successfully' });

        //saveToJSONFile(profilesFilePath, data);
        saveData();
        savePosts();
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});


// Route handler to add a new resource
app.post('/api/data', (req, res) => {
    const newItem = req.body;
    if (parseInt(newItem.age) < 10) {
        res.status(404).json({ message: 'Item not valid' });
    }
    else {
        newItem.id = nextId++;
        data.push(newItem);
        res.json({ message: 'Item added successfully', newItem });
        //saveToJSONFile(profilesFilePath, data);
        saveData();
    }
});

// Route handler to update a resource
app.put('/api/data/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedItem = req.body;
    if (parseInt(updatedItem.age) < 10) {
        res.status(404).json({ message: 'Item not valid' });
    }
    else {
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedItem };
            res.status(200).json({ message: 'Item updated successfully', updatedItem });

            //saveToJSONFile(profilesFilePath, data);
            saveData();
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});

module.exports = app; // Export the Express app for test
