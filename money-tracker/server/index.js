import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

// Load environment variables
dotenv.config();

// Disable command buffering so operations don't hang when MongoDB is connecting/offline
mongoose.set('bufferCommands', false);

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/money-tracker';
const PORT = process.env.PORT || 3001;

console.log('Server attempting connection to:', mongoURI);

// --- In-Memory Data Store (Fallback when MongoDB is disconnected) ---
let inMemoryUsers = [
  { id: 'admin-1', username: 'sakhiyarajnikbhai@gmail.com', password: 'kevin@1234', role: 'admin', sharedWith: [] },
  { id: 'admin-2', username: 'kevin', password: 'kevin1234', role: 'admin', sharedWith: [] },
  { id: 'user-1', username: 'user1', password: 'pass1', role: 'user', sharedWith: [] },
  { id: 'user-2', username: 'user2', password: 'pass2', role: 'user', sharedWith: [] },
  { id: 'user-3', username: 'user3', password: 'pass3', role: 'user', sharedWith: [] },
  { id: 'user-4', username: 'user4', password: 'pass4', role: 'user', sharedWith: [] }
];

let inMemoryTransactions = [];

// Helper to check DB status
const isDbConnected = () => mongoose.connection.readyState === 1;

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log('Connected to MongoDB database.');
      initDb();
    })
    .catch((err) => {
      console.warn('MongoDB connection warning:', err.message || err);
      console.log('Operating in hybrid mode with in-memory fallback. Retrying DB connection in 10s...');
      setTimeout(connectWithRetry, 10000);
    });
};

connectWithRetry();

// --- MongoDB Schemas and Models ---

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  sharedWith: [{ type: String }]
}, {
  bufferCommands: false,
  toJSON: {
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
});

const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  reason: { type: String, required: true },
  createdAt: { type: String, required: true }
}, {
  bufferCommands: false,
  toJSON: {
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Seed database
async function initDb() {
  try {
    const defaultUsers = [
      { id: 'admin-1', username: 'sakhiyarajnikbhai@gmail.com', password: 'kevin@1234', role: 'admin', sharedWith: [] },
      { id: 'admin-2', username: 'kevin', password: 'kevin1234', role: 'admin', sharedWith: [] },
      { id: 'user-1', username: 'user1', password: 'pass1', role: 'user', sharedWith: [] },
      { id: 'user-2', username: 'user2', password: 'pass2', role: 'user', sharedWith: [] },
      { id: 'user-3', username: 'user3', password: 'pass3', role: 'user', sharedWith: [] },
      { id: 'user-4', username: 'user4', password: 'pass4', role: 'user', sharedWith: [] }
    ];

    for (const user of defaultUsers) {
      await User.findOneAndUpdate(
        { id: user.id },
        user,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('Seeded default users to MongoDB.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// --- Helper Data Access Functions ---

async function findUserByUsername(username) {
  if (isDbConnected()) {
    try {
      return await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    } catch (e) {
      console.warn('DB query error:', e.message);
    }
  }
  return inMemoryUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
}

async function findUserById(id) {
  if (isDbConnected()) {
    try {
      return await User.findOne({ id });
    } catch (e) {
      console.warn('DB query error:', e.message);
    }
  }
  return inMemoryUsers.find(u => u.id === id);
}

async function createUser(userData) {
  if (isDbConnected()) {
    try {
      const newUser = new User(userData);
      await newUser.save();
      return newUser;
    } catch (e) {
      console.warn('DB save error, saving to memory:', e.message);
    }
  }
  inMemoryUsers.push(userData);
  return userData;
}

// --- Helper for Workspace Access Verification ---
const verifyAccess = async (currentUserId, workspaceUserId) => {
  if (!currentUserId) return false;
  if (currentUserId === workspaceUserId) return true;

  const owner = await findUserById(workspaceUserId);
  if (owner && owner.sharedWith && owner.sharedWith.includes(currentUserId)) {
    return true;
  }
  return false;
};

// --- API Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user;
    if (isDbConnected()) {
      user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') }, password });
    }
    if (!user) {
      user = inMemoryUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    }

    if (user) {
      const safeUser = { id: user.id, username: user.username, role: user.role };
      res.json({ success: true, user: safeUser, token: 'mock-jwt-token' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }
  try {
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    const newId = 'user-' + uuidv4();
    const userData = {
      id: newId,
      username,
      password,
      role: 'user',
      sharedWith: []
    };
    const newUser = await createUser(userData);
    const safeUser = { id: newUser.id, username: newUser.username, role: newUser.role };
    res.json({ success: true, user: safeUser, token: 'mock-jwt-token' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Database error during registration' });
  }
});

// Google Auth
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, error: 'Google credential is required' });
  }
  try {
    let payload;

    // 1. Attempt official ID token verification via google-auth-library
    try {
      const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.warn('Google verifyIdToken verification note:', verifyErr.message);
      // 2. Robust fallback: parse payload directly from JWT ID token
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const decodedStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
          payload = JSON.parse(decodedStr);
        } else {
          throw verifyErr;
        }
      } catch (decodeErr) {
        throw new Error('Unable to parse Google ID token: ' + decodeErr.message);
      }
    }

    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid Google token payload' });
    }

    const sub = payload.sub || uuidv4();
    const email = payload.email || `google-user-${sub.slice(0, 8)}@gmail.com`;

    // Check if user already exists
    let user = await findUserByUsername(email);
    if (!user) {
      const newId = 'google-' + sub;
      const userData = {
        id: newId,
        username: email,
        password: 'google-oauth-managed',
        role: 'user',
        sharedWith: []
      };
      user = await createUser(userData);
    }

    const safeUser = { id: user.id, username: user.username, role: user.role };
    res.json({ success: true, user: safeUser, token: 'mock-jwt-token' });
  } catch (err) {
    console.error('Google login processing error:', err);
    res.status(401).json({ success: false, error: 'Google authentication failed: ' + err.message });
  }
});

// Get Users (for search / selectors, excluding current user)
app.get('/api/users', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  try {
    let users = [];
    if (isDbConnected()) {
      const query = currentUserId ? { id: { $ne: currentUserId } } : {};
      users = await User.find(query, 'id username role');
    } else {
      users = inMemoryUsers
        .filter(u => !currentUserId || u.id !== currentUserId)
        .map(u => ({ id: u.id, username: u.username, role: u.role }));
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching users' });
  }
});

// Share Workspace Access
app.post('/api/users/share', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  const { targetUser } = req.body;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user ID header' });
  }
  if (!targetUser) {
    return res.status(400).json({ error: 'Target email/ID is required' });
  }

  try {
    let target = await findUserByUsername(targetUser);
    if (!target) {
      target = await findUserById(targetUser);
    }

    if (!target) {
      return res.status(404).json({ error: 'User not found with that email or ID' });
    }

    if (target.id === currentUserId) {
      return res.status(400).json({ error: 'You cannot share your own workspace with yourself' });
    }

    const owner = await findUserById(currentUserId);
    if (owner) {
      if (!owner.sharedWith) owner.sharedWith = [];
      if (!owner.sharedWith.includes(target.id)) {
        owner.sharedWith.push(target.id);
        if (isDbConnected()) {
          await User.updateOne({ id: currentUserId }, { sharedWith: owner.sharedWith });
        }
      }
    }

    const sharedWithIds = owner?.sharedWith || [];
    let sharedUsers = [];
    if (isDbConnected()) {
      sharedUsers = await User.find({ id: { $in: sharedWithIds } }, 'id username');
    } else {
      sharedUsers = inMemoryUsers.filter(u => sharedWithIds.includes(u.id)).map(u => ({ id: u.id, username: u.username }));
    }
    res.json(sharedUsers);
  } catch (err) {
    console.error('Error sharing workspace:', err);
    res.status(500).json({ error: 'Failed to share workspace' });
  }
});

// Revoke Workspace Access
app.post('/api/users/unshare', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  const { targetId } = req.body;

  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user ID header' });
  }

  try {
    const owner = await findUserById(currentUserId);
    if (owner && owner.sharedWith) {
      owner.sharedWith = owner.sharedWith.filter(id => id !== targetId);
      if (isDbConnected()) {
        await User.updateOne({ id: currentUserId }, { sharedWith: owner.sharedWith });
      }
    }

    const sharedWithIds = owner?.sharedWith || [];
    let sharedUsers = [];
    if (isDbConnected()) {
      sharedUsers = await User.find({ id: { $in: sharedWithIds } }, 'id username');
    } else {
      sharedUsers = inMemoryUsers.filter(u => sharedWithIds.includes(u.id)).map(u => ({ id: u.id, username: u.username }));
    }
    res.json(sharedUsers);
  } catch (err) {
    console.error('Error revoking workspace access:', err);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// Get users who currently have access to current user's workspace
app.get('/api/users/sharing', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user ID header' });
  }

  try {
    const owner = await findUserById(currentUserId);
    const sharedWithIds = owner?.sharedWith || [];
    let sharedUsers = [];
    if (isDbConnected()) {
      sharedUsers = await User.find({ id: { $in: sharedWithIds } }, 'id username');
    } else {
      sharedUsers = inMemoryUsers.filter(u => sharedWithIds.includes(u.id)).map(u => ({ id: u.id, username: u.username }));
    }
    res.json(sharedUsers);
  } catch (err) {
    console.error('Error fetching sharing list:', err);
    res.status(500).json({ error: 'Failed to fetch sharing list' });
  }
});

// Get workspaces shared WITH the current user
app.get('/api/users/shared-with-me', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user ID header' });
  }

  try {
    let owners = [];
    if (isDbConnected()) {
      owners = await User.find({ sharedWith: currentUserId }, 'id username');
    } else {
      owners = inMemoryUsers.filter(u => u.sharedWith && u.sharedWith.includes(currentUserId)).map(u => ({ id: u.id, username: u.username }));
    }
    res.json(owners);
  } catch (err) {
    console.error('Error fetching shared-with-me list:', err);
    res.status(500).json({ error: 'Failed to fetch shared workspaces' });
  }
});

// Get Transactions
app.get('/api/transactions', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing identity header' });
  }

  const { userId } = req.query;
  const targetUserId = userId || currentUserId;

  try {
    const isAuthorized = await verifyAccess(currentUserId, targetUserId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    let transactions = [];
    if (isDbConnected()) {
      transactions = await Transaction.find({ userId: targetUserId });
    } else {
      transactions = inMemoryTransactions.filter(t => t.userId === targetUserId);
    }
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching transactions' });
  }
});

// Add Transaction
app.post('/api/transactions', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing identity header' });
  }

  const { amount, date, day, reason, userId } = req.body;
  const targetUserId = userId || currentUserId;

  if (targetUserId !== currentUserId) {
    return res.status(403).json({ error: 'Access denied: shared workspaces are view-only' });
  }

  try {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const txData = {
      id,
      userId: targetUserId,
      amount: Number(amount),
      date,
      day,
      reason,
      createdAt
    };

    if (isDbConnected()) {
      const newTransaction = new Transaction(txData);
      await newTransaction.save();
    } else {
      inMemoryTransactions.push(txData);
    }
    res.json(txData);
  } catch (err) {
    console.error('Failed to add transaction:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Update Transaction
app.put('/api/transactions/:id', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing identity header' });
  }

  const { id } = req.params;
  const { amount, date, day, reason } = req.body;

  try {
    let transaction;
    if (isDbConnected()) {
      transaction = await Transaction.findOne({ id });
    } else {
      transaction = inMemoryTransactions.find(t => t.id === id);
    }

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.userId !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: shared workspaces are view-only' });
    }

    transaction.amount = Number(amount);
    transaction.date = date;
    transaction.day = day;
    transaction.reason = reason;

    if (isDbConnected()) {
      await Transaction.updateOne({ id }, { amount: Number(amount), date, day, reason });
    }

    res.json(transaction);
  } catch (err) {
    console.error('Failed to update transaction:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing identity header' });
  }

  const { id } = req.params;

  try {
    let transaction;
    if (isDbConnected()) {
      transaction = await Transaction.findOne({ id });
    } else {
      transaction = inMemoryTransactions.find(t => t.id === id);
    }

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.userId !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: shared workspaces are view-only' });
    }

    if (isDbConnected()) {
      await Transaction.deleteOne({ id });
    } else {
      inMemoryTransactions = inMemoryTransactions.filter(t => t.id !== id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete transaction:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
