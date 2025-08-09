const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const fileUpload = require("express-fileupload");
const { query } = require("express");
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
    console.log("\n------- Hit /petfood route -------");
    const cursor = petFoodCollection.find({});
    const products = await cursor.toArray();
    console.log("Fetched pet food products");
    res.send(products);
  });

  app.post("/petfood", async (req, res) => {
    console.log("\n------- Hit /petfood POST route -------");
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
    console.log("Pet food added");
    res.send(result);
  });

  app.get("/petfood/:id", async (req, res) => {
    console.log("\n------- Hit /petfood/:id route -------");
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petFoodCollection.findOne(query);
    console.log("Fetched pet food product with ID:", id);
    res.json(product);
  });

  app.delete("/petfood/:id", async (req, res) => {
    console.log(
      "\n------- Hit /petfood/:id DELETE route admin protected -------"
    );

    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const requesterAccount = req.query.email;

    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    // Authorization logic
    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" ||
      checkRequesterAccount.role === "temp_admin" ||
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to delete this product" });
    }

    const product = await petFoodCollection.deleteOne(query);
    console.log("Deleted pet food product with ID:", id);
    res.json(product);
  });

  app.put("/petfood/:id", async (req, res) => {
    console.log("\n------- Hit /petfood/:id PUT route admin protected -------");
    const id = req.params.id;
    const requesterAccount = req.query.email;
    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" ||
      checkRequesterAccount.role === "temp_admin" ||
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to update this product" });
    }

    let img;
    // Check if there's a new image uploaded
    if (req.files && req.files.img) {
      console.log("Processing new image for pet food");
      const encodedPic = req.files.img.data.toString("base64");
      const imageBuffer = Buffer.from(encodedPic, "base64");
      img = imageBuffer;
    } else {
      // Use the existing base64 image if no new image is uploaded
      console.log("No new image provided, using existing");
      img = req.body.img;
      // Check if img is already in base64 format
      if (img && img.includes("data:image/")) {
        // If it's base64 already, no need to process it further
        img = img.split(",")[1]; // Remove the prefix 'data:image/*;base64,' from the string
      }
    }

    const filter = { _id: ObjectId(id) };
    const options = { upsert: false };

    const data = {
      animal: req.body.animal,
      title: req.body.title,
      brand: req.body.brand,
      price: req.body.price,
      stock: req.body.stock,
      img: img,
    };

    const updateDoc = { $set: data };

    const result = await petFoodCollection.updateOne(
      filter,
      updateDoc,
      options
    );
    console.log("Updated pet food product with ID:", id);
    res.send(result);
  });

  app.patch("/petfood/:id", async (req, res) => {
    console.log("\n------- Hit /petfood/:id PATCH route -------");
    const id = req.params.id;
    const requesterAccount = req.query.email;
    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" ||
      checkRequesterAccount.role === "temp_admin" ||
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to update this product" });
    }

    let img;
    if (req.files) {
      console.log("Processing new image for pet food");
      const encodedPic = req.files.img.data.toString("base64");
      img = Buffer.from(encodedPic, "base64");
    } else if (req.body.img) {
      console.log("No new image provided, using existing");
      img = req.body.img;
    }

    const filter = { _id: ObjectId(id) };
    const options = { upsert: false };

    const updatedFields = {
      animal: req.body.animal,
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock,
      img: img || undefined, // Only update image if new image is provided
      brand: req.body.brand || undefined, // For pet food, brand is optional
    };

    // Remove undefined properties (i.e., fields not updated)
    const updateDoc = {
      $set: Object.fromEntries(
        Object.entries(updatedFields).filter(([_, v]) => v !== undefined)
      ),
    };

    const result = await petFoodCollection.updateOne(
      filter,
      updateDoc,
      options
    );
    console.log("Updated pet food product with ID:", id);
    res.send(result);
  });

  app.post("/petaccAndToy", async (req, res) => {
    console.log("\n------- Hit /petaccAndToy POST route -------");
    const encodedPic = req.files.img.data.toString("base64");
    console.log("Image encoded to base64");
    const imageBuffer = Buffer.from(encodedPic, "base64");
    console.log("Image converted to buffer");

    const data = {
      animal: req.body.animal,
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock,
      img: imageBuffer,
    };

    console.log("Data prepared for pet accessory or toy insertion:", data);

    const result = await petAccAndToyCollection.insertOne(data);
    console.log("Pet accessory or toy added");
    res.send(result);
  });

  app.get("/petaccAndToy", async (req, res) => {
    console.log("\n------- Hit /petaccAndToy route -------");
    const cursor = petAccAndToyCollection.find({});
    const products = await cursor.toArray();
    console.log("Fetched pet accessories and toys");
    res.send(products);
  });

  app.get("/petaccAndToy/:id", async (req, res) => {
    console.log("\n------- Hit /petaccAndToy/:id route -------");
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await petAccAndToyCollection.findOne(query);
    console.log("Fetched pet accessory or toy with ID:", id);
    res.json(product);
  });

  app.put("/petaccAndToy/:id", async (req, res) => {
    console.log(
      "\n------- Hit /petaccAndToy/:id PUT route admin protected -------"
    );
    const id = req.params.id;
    const requesterAccount = req.query.email;
    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" ||
      checkRequesterAccount.role === "temp_admin" ||
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to update this product" });
    }

    let img;
    if (req.files) {
      console.log("Processing new image for pet accessory or toy");
      const encodedPic = req.files.img.data.toString("base64");
      const imageBuffer = Buffer.from(encodedPic, "base64");
      img = imageBuffer;
    } else {
      console.log("No new image provided, using existing");
      img = req.body.img;
    }

    const filter = { _id: ObjectId(id) };
    const options = { upsert: false };

    const data = {
      animal: req.body.animal,
      title: req.body.title,
      price: req.body.price,
      stock: req.body.stock,
      img: img,
    };

    const updateDoc = { $set: data };

    const result = await petAccAndToyCollection.updateOne(
      filter,
      updateDoc,
      options
    );
    console.log("Updated pet accessory or toy with ID:", id);
    res.send(result);
  });

  app.patch("/petaccAndToy/:id", async (req, res) => {
    console.log(
      "\n------- Hit /petaccAndToy/:id PATCH route admin protected -------"
    );

    const id = req.params.id;
    const requesterAccount = req.query.email;

    // Check if user has permission to update the product
    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" || // Ensure the user is an admin
      checkRequesterAccount.role === "temp_admin" || // Ensure the user is not a temporary admin
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL) // Ensure super admin has access
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to update this product" });
    }

    let img;
    // Process the image if provided
    if (req.files && req.files.img) {
      console.log("Processing new image for pet accessory or toy");
      const encodedPic = req.files.img.data.toString("base64");
      img = Buffer.from(encodedPic, "base64");
    } else if (req.body.img) {
      // If no new image is provided, use the existing image
      console.log("No new image provided, using existing");
      img = req.body.img; // Keep the existing image if not updated
    }

    const filter = { _id: ObjectId(id) };
    const options = { upsert: false };

    // Create the data object, only including fields that were provided
    const updateFields = {};
    if (req.body.animal) updateFields.animal = req.body.animal;
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.price) updateFields.price = req.body.price;
    if (req.body.stock) updateFields.stock = req.body.stock;
    if (img) updateFields.img = img;

    // Construct the update document
    const updateDoc = { $set: updateFields };

    try {
      const result = await petAccAndToyCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      console.log("Updated pet accessory or toy with ID:", id);
      res.send(result);
    } catch (error) {
      console.error("Error updating product:", error);
      res
        .status(500)
        .send({ message: "An error occurred while updating the product" });
    }
  });

  app.delete("/petaccAndToy/:id", async (req, res) => {
    console.log(
      "\n------- Hit /petaccAndToy/:id DELETE route admin protected -------"
    );
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const requesterAccount = req.query.email; // Get email from query params

    const checkRequesterAccount = await usersCollection.findOne({
      email: requesterAccount,
    });

    if (
      !checkRequesterAccount ||
      checkRequesterAccount.role !== "admin" ||
      checkRequesterAccount.role === "temp_admin" ||
      (checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email !== process.env.SUPERADMIN_EMAIL)
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to delete this product" });
    }

    const product = await petAccAndToyCollection.deleteOne(query);
    console.log("Deleted pet accessory or toy with ID:", id);
    res.json(product);
  });

  app.get("/blogs", async (req, res) => {
    console.log("\n------- Hit /blogs route -------");
    const cursor = blogsCollection.find({});
    const blogs = await cursor.toArray();
    console.log("Fetched blogs");
    res.send(blogs);
  });

  app.get("/blogs/:blogTitle", async (req, res) => {
    console.log("\n------- Hit /blogs/:blogTitle route -------");
    const query = req.params.blogTitle;
    const cursor = blogsCollection.find({});
    const blogs = await cursor.toArray();
    const filterData = blogs.find((blog) => blog.blogTitle === query);
    console.log("Fetched specific blog with title:", query);
    res.json(filterData);
  });

  app.get("/users", async (req, res) => {
    console.log("\n------- Hit /users route -------");
    const cursor = usersCollection.find({});
    const users = await cursor.toArray();
    console.log("Fetched users");
    res.send(users);
  });

  app.post("/users", async (req, res) => {
    console.log("\n------- Hit /users POST route -------");
    const user = req.body;
    console.log("Data for user insertion:", user);
    const result = await usersCollection.insertOne(user);
    console.log("User added");
    res.json(result);
  });

  app.put("/users", async (req, res) => {
    console.log("\n------- Hit /users PUT route -------");
    const user = req.body;
    console.log("Data for user update:", user);
    const filter = { email: user.email };
    const options = { upsert: true };
    const updateDoc = { $set: user };
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    console.log("User updated with email:", user.email);
    res.json(result);
  });

  app.put("/users/tempadmin", async (req, res) => {
    console.log("\n------- Hit /users/tempadmin PUT route -------");
    const user = req.body;
    const requesterAccount = user.requester;
    const email = user.email;

    // Improved error handling with more descriptive error messages
    if (!user || !email || !requesterAccount) {
      console.log("Access denied: Missing or incomplete request payload");
      return res.status(400).json({
        message:
          "Request is incomplete. Please ensure the 'email' and 'requester' are provided.",
      });
    }

    console.log(
      "Checking requester account for tempadmin role:",
      requesterAccount
    );

    // Check if the requester account exists in the database
    const checkRequesterAccount = await usersCollection.findOne({
      email: email,
    });

    // If the user doesn't exist, return a more descriptive error message
    if (!checkRequesterAccount) {
      console.log(`User with email ${email} does not exist`);
      return res.status(404).json({
        message: `User with email '${email}' was not found in the system. Please check the email and try again.`,
      });
    }

    console.log("Checkpoint-2: User found, processing role update");

    const filter = { email: email };
    const updateDoc = { $set: { role: "temp_admin" } };

    // Attempt to update the role in the database
    const result = await usersCollection.updateOne(filter, updateDoc);

    // If the role update is successful
    if (result.modifiedCount > 0) {
      console.log(`Temp_Admin role successfully assigned to: ${email}`);
      return res.json({
        message: `Temporary admin role successfully assigned to ${email}.`,
      });
    } else {
      console.log("Error assigning temp_admin role");
      return res.status(500).json({
        message:
          "There was an issue assigning the 'temp_admin' role. Please try again later.",
      });
    }
  });

  app.put("/users/admin", async (req, res) => {
    console.log("\n------- Hit /users/admin PUT route -------");
    const user = req.body;
    const requesterAccount = user.requester;
    const email = user.email;

    if (user) {
      console.log(
        "Checking requester account for admin role:",
        requesterAccount
      );
      const checkRequesterAccount = await usersCollection.findOne({
        email: requesterAccount,
      });

      if (
        checkRequesterAccount.role === "admin" &&
        checkRequesterAccount.email === process.env.SUPERADMIN_EMAIL
      ) {
        const filter = { email: email };
        const updateDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        console.log("Admin role assigned to:", email);
        res.json(result);
      }
    } else {
      console.log("Access denied to make admin");
      res.status(403).json({ message: "You do not have access to make admin" });
    }
  });

  app.get("/users/:email/roles", async (req, res) => {
    console.log("\n------- Hit /users/:email/roles route -------");
    const email = req.params.email;
    console.log("Checking admin status for email:", email);

    const query = { email: email };
    const user = await usersCollection.findOne(query);

    let isSuperAdmin = false;
    let isTempAdmin = false;
    const superAdminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase(); // Ensure the super admin email is lowercase

    // console.log(
    //   "almohaiminfarabi.work@gmail.com" === superAdminEmail,

    // );
    if (
      user?.role === "admin" &&
      user?.email.toLowerCase() === superAdminEmail
    ) {
      // Compare emails case-insensitively
      isSuperAdmin = true;
      console.log("Super Admin confirmed");
    } else if (user?.role === "temp_admin") {
      isTempAdmin = true;
      isSuperAdmin = false; // Ensure super admin is false if temp admin
      console.log("Temp Admin confirmed");
    }

    console.log("Admin status:", user?.role, isTempAdmin, isSuperAdmin);
    res.json({ superAdmin: isSuperAdmin, tempAdmin: isTempAdmin });
  });

  // // for temp admin role
  // app.get("/users/:email/roles", async (req, res) => {
  //   console.log("\n------- Hit /users/:email/roles route -------");
  //   const email = req.params.email;
  //   console.log("Fetching roles for email:", email);
  //   const query = { email: email };
  //   const user = await usersCollection.findOne(query);

  //   if (user) {
  //     console.log("Roles for user:", { roles: user.role });
  //     res.json({ roles: user.role });
  //   } else {
  //     console.log("User not found for email:", email);
  //     res.status(404).json({ message: "User not found" });
  //   }
  // });

  app.get("/orders", async (req, res) => {
    console.log("\n------- Hit /orders route -------");
    const cursor = ordersCollection.find({});
    const products = await cursor.toArray();
    console.log("Fetched orders");
    res.send(products);
  });

  app.get("/orders/:email", async (req, res) => {
    console.log("\n------- Hit /orders/:email route -------");
    const email = req.params.email;
    console.log("Fetching orders for email:", email);
    const query = { email: email };
    const cursor = ordersCollection.find(query);
    const orders = await cursor.toArray();
    console.log("Fetched orders for email:", email);
    res.send(orders);
  });

  app.post("/orders", async (req, res) => {
    console.log("\n------- Hit /orders POST route -------");
    const order = req.body;
    console.log("Data for order insertion:", order);
    const result = ordersCollection.insertOne(order);
    console.log("Order added");
    res.json(result);
  });

  app.delete("/orders/:id", async (req, res) => {
    console.log("\n------- Hit /orders/:id DELETE route -------");
    const id = req.params.id;
    console.log("Deleting order with ID:", id);
    const query = { _id: ObjectId(id) };
    const result = await ordersCollection.deleteOne(query);
    console.log("Deleted order with ID:", id);
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
