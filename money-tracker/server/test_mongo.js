import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/money-tracker';

console.log('Testing connection to:', mongoURI);

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  reason: { type: String, required: true },
  createdAt: { type: String, required: true }
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

async function runTest() {
  await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB successfully!');

  const testId = 'test_' + uuidv4();
  const testTransaction = new Transaction({
    id: testId,
    userId: 'user-1',
    amount: -100,
    date: '2026-07-18',
    day: 'Saturday',
    reason: 'Test MongoDB Migration',
    createdAt: new Date().toISOString()
  });

  await testTransaction.save();
  console.log('Saved test transaction.');

  const found = await Transaction.findOne({ id: testId });
  console.log('Found transaction in db:', found);

  if (found && found.id === testId) {
    console.log('Verification Success: retrieved ID matches saved ID.');
  } else {
    throw new Error('Verification Failed: transaction mismatch.');
  }

  await Transaction.deleteOne({ id: testId });
  console.log('Cleaned up test transaction.');

  await mongoose.disconnect();
  console.log('Disconnected. Test finished successfully!');
}

runTest().catch(err => {
  console.error('Test encountered an error:', err);
  process.exit(1);
});
