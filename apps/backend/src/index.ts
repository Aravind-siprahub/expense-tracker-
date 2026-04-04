import express from "express";
import cors from "cors";
import prisma from "@repo/db";
import { CreateUserSchema, CreatePostSchema, UpdatePostSchema } from "@repo/validators";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ── Users ──────────────────────────────────────────────────────────────────

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
});

app.post("/users", async (req, res) => {
  try {
    const result = CreateUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.errors });
    }
    const newUser = await prisma.user.create({ data: result.data });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
});


app.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ include: { author: true } });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error });
  }
});

app.get("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error });
  }
});

app.post("/posts", async (req, res) => {
  try {
    const result = CreatePostSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.errors });
    }
    const newPost = await prisma.post.create({ data: result.data });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error });
  }
});

app.patch("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const result = UpdatePostSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.errors });
    }
    const updated = await prisma.post.update({ where: { id: postId }, data: result.data });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating post", error });
  }
});

app.delete("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await prisma.post.delete({ where: { id: postId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
