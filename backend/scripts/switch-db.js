const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2];

if (target !== 'sqlite' && target !== 'postgres') {
  console.error('Error: Please specify a target database provider: "sqlite" or "postgres"');
  console.log('Usage: node scripts/switch-db.js [sqlite|postgres]');
  process.exit(1);
}

const ROOT_DIR = path.join(__dirname, '../..');
const BACKEND_DIR = path.join(__dirname, '..');
const PRISMA_SCHEMA_PATH = path.join(BACKEND_DIR, 'prisma/schema.prisma');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const BACKEND_ENV_PATH = path.join(BACKEND_DIR, '.env');

console.log(`[Switch-DB] Initiating database-agnostic migration engine to target: ${target.toUpperCase()}...`);

// 1. Modify schema.prisma provider
try {
  let schemaContent = fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf8');
  
  if (target === 'postgres') {
    schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  } else {
    schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  }
  
  fs.writeFileSync(PRISMA_SCHEMA_PATH, schemaContent, 'utf8');
  console.log('[Switch-DB] schema.prisma datasource provider successfully updated.');
} catch (err) {
  console.error('[Switch-DB] Failed to modify schema.prisma:', err.message);
  process.exit(1);
}

// 2. Update .env files
const updateEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  try {
    let envContent = fs.readFileSync(filePath, 'utf8');
    
    if (target === 'postgres') {
      // Switch from SQLite to PostgreSQL
      envContent = envContent.replace(
        /DATABASE_URL\s*=\s*["']?file:[\s\S]*?["']?(?=\r?\n|$)/g,
        'DATABASE_URL="postgresql://dms_user:dms_password@localhost:5432/dms_prod?schema=public"'
      );
    } else {
      // Switch from PostgreSQL to SQLite
      envContent = envContent.replace(
        /DATABASE_URL\s*=\s*["']?postgresql:[\s\S]*?["']?(?=\r?\n|$)/g,
        'DATABASE_URL="file:/app/data/prod.db"'
      );
    }
    
    fs.writeFileSync(filePath, envContent, 'utf8');
    console.log(`[Switch-DB] Environment config successfully updated at: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`[Switch-DB] Failed to update env file at ${filePath}:`, err.message);
  }
};

updateEnvFile(ENV_PATH);
updateEnvFile(BACKEND_ENV_PATH);

// 3. Regenerate Prisma Client
console.log('[Switch-DB] Regenerating Prisma Client layers...');
try {
  execSync('npx prisma generate', { cwd: BACKEND_DIR, stdio: 'inherit' });
  console.log(`[Switch-DB] SUCCESS: Database successfully transitioned to ${target.toUpperCase()}!`);
  console.log('\nNext Steps:');
  if (target === 'postgres') {
    console.log('1. Run "docker compose up -d postgres" to spin up the Postgres container.');
    console.log('2. Run "npx prisma migrate dev --name init_postgres" to push the database schema.');
  } else {
    console.log('1. Run "docker compose up -d --build" to restart using local SQLite files.');
  }
} catch (err) {
  console.error('[Switch-DB] Failed to regenerate Prisma client. Please run "npx prisma generate" manually.');
  process.exit(1);
}
