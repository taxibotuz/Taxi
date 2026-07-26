import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taxigo';
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean);

async function seed() {
  if (ADMIN_IDS.length === 0) {
    console.log('No TELEGRAM_ADMIN_IDS configured. Skipping admin seed.');
    process.exit(0);
  }

  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const { User } = await import('../models/User');
  const { UserRole } = await import('../types');

  let assigned = 0;

  for (const telegramId of ADMIN_IDS) {
    const user = await User.findOneAndUpdate(
      { telegramId },
      { role: UserRole.ADMIN },
      { new: true },
    );

    if (user) {
      console.log(`Admin role assigned to ${user.firstName} (ID: ${telegramId})`);
      assigned++;
    } else {
      console.log(`No user found for Telegram ID ${telegramId}. Start the bot first.`);
    }
  }

  await mongoose.disconnect();
  console.log(`Seed complete. ${assigned} admin(s) assigned.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
