import app from './app';

import { runAutoMigration } from './lib/autoMigration';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Run the SQLite to PostgreSQL automatic migration check
    await runAutoMigration();
  } catch (err) {
    console.error('Database auto-migration failed:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
