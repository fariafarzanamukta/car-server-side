const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ycmdl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("carZone");
        const carCollection = database.collection("car");
        const orderCollection = database.collection("order");
        const reviewsCollection = database.collection("reviews");
        const usersCollection = database.collection("users")


        // GET API
        app.get('/car', async (req, res) => {
            const cursor = carCollection.find({});
            const car = await cursor.toArray();
            res.send(car);
        })

        //GET Single 
        app.get('/car/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await carCollection.findOne(query);
            res.json(service);
        })

        //POST
        app.post('/car', async (req, res) => {
            const service = req.body;
            const result = await carCollection.insertOne(service);
            console.log(result);
            res.json(result)
        })

        app.get('/Order', async (req, res) => {
            const cursor = orderCollection.find({});
            const order = await cursor.toArray();
            res.send(order);
        })
        app.post('/Order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            console.log(result);
            res.json(result)
        })
        //get my order
        app.get('/Order/:email', async (req, res) => {
            const result = await orderCollection.find({ email: req.params.email }).toArray();
            res.json(result);
        })





        //review
        //get
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const review = await cursor.toArray();
            res.send(review);
        })
        //post
        app.post('/Reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            console.log(result);
            res.json(result)
        })



        //delete
        app.delete('/car/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await carCollection.deleteOne(query);
            res.json(result);
        })
        app.delete('/Order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })






        //user
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })
    }
    finally {
        
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Car Zone')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})