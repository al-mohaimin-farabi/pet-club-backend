const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const fileUpload = require("express-fileupload");
require("dotenv").config();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const url = process.env.DATABASE_URL;

const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  await client.connect();
  const database = client.db("pet-club");
  const petFoodCollection = database.collection("petfood");
  const petAccAndToyCollection = database.collection("petAccAndToy");
  const blogsCollection = database.collection("blogs");
  const usersCollection = database.collection("users");
  const ordersCollection = database.collection("orders");

  app.get("/petfood", async (req, res) => {
    const cursor = petFoodCollection.find({});
    const products = await cursor.toArray();
    res.send(products);
  });

  app.post("/petfood", async (req, res) => {
    // console.log("body", req.body);
    // console.log("files", req.files);
    const encodedPic = req.files.img.data.toString("base64");
    const imageBuffer = Buffer.from(encodedPic, "base64");
    const data = {
      animal: req.body.animal,
      title: req.body.title,
      brand: req.body.brand,
      price: req.body.price,
      stock: req.body.stock,
      img: imageBuffer,
    };
    const result = await petFoodCollection.insertOne(data);
    res.send(result);
  });

  app.get("/petfood/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petFoodCollection.findOne(query);
    res.json(product);
  });
  app.delete("/petfood/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petFoodCollection.deleteOne(query);
    res.json(product);
  });

  // update product
  // app.put("/petfood/:id", async (req, res) => {
  //   const id = req.params.id;
  //   const filter = { _id: ObjectId(id) };
  //   const options = { upsert: true };
  //   const updateDoc = {$set:};
  //   const result = await petFoodCollection.updateOne(filter,options,);
  //   res.send(result);
  // });

  app.get("/petaccAndToy", async (req, res) => {
    const cursor = petAccAndToyCollection.find({});
    const products = await cursor.toArray();
    res.send(products);
  });

  app.get("/petaccAndToy/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petAccAndToyCollection.findOne(query);
    res.json(product);
  });
  app.post("/petaccAndToy", async (req, res) => {
    // console.log("body", req.body);
    // console.log("files", req.files);
    const encodedPic = req.files.img.data.toString("base64");
    const imageBuffer = Buffer.from(encodedPic, "base64");
    const data = {
      animal: req.body.animal,
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock,
      img: imageBuffer,
    };
    const result = await petAccAndToyCollection.insertOne(data);
    res.send(result);
  });
  app.delete("/petaccAndToy/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petAccAndToyCollection.deleteOne(query);
    res.json(product);
  });

  app.get("/blogs", async (req, res) => {
    const cursor = blogsCollection.find({});
    const blogs = await cursor.toArray();
    res.send(blogs);
  });

  app.get("/blogs/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const blog = await blogsCollection.findOne(query);
    res.json(blog);
  });

  app.get("/users", async (req, res) => {
    const cursor = usersCollection.find({});
    const users = await cursor.toArray();
    res.send(users);
  });

  app.post("/users", async (req, res) => {
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.json(result);
  });

  // if user exsists
  app.put("/users", async (req, res) => {
    const user = req.body;
    const filter = { email: user.email };
    const options = { upsert: true };
    const updateDoc = { $set: user };
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.json(result);
  });

  app.put("/users/admin", async (req, res) => {
    const user = req.body;
    const requesterAccount = user.requester;
    const email = user.email;

    if (user) {
      const checkRequesterAccount = await usersCollection.findOne({
        email: requesterAccount,
      });

      if (checkRequesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      }
    } else {
      res.status(403).json({ message: "You do not have access to make admin" });
    }
  });

  app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    let isAdmin = false;
    if (user?.role === "admin") {
      isAdmin = true;
    }

    res.json({ admin: isAdmin });
  });

  app.get("/orders", async (req, res) => {
    const cursor = ordersCollection.find({});
    const products = await cursor.toArray();
    res.send(products);
  });
  app.get("/orders/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const cursor = ordersCollection.find(query);
    const orders = await cursor.toArray();
    res.send(orders);
  });

  app.post("/orders", async (req, res) => {
    const order = req.body;
    // console.log(order);
    const result = ordersCollection.insertOne(order);
    res.json(result);
  });
  app.delete("/orders/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await ordersCollection.deleteOne(query);
    res.json(result);
  });
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet Club Server Is Online");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
