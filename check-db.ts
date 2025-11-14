
import { db, pool } from './server/db';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  console.log('🔍 Checking database health...\n');

  try {
    // 1. Test connection
    console.log('1. Testing database connection...');
    const connectionResult = await pool.query('SELECT NOW()');
    console.log('   ✓ Connection successful:', connectionResult.rows[0].now);

    // 2. Check database version
    console.log('\n2. Checking PostgreSQL version...');
    const versionResult = await pool.query('SELECT version()');
    console.log('   ✓', versionResult.rows[0].version.split('\n')[0]);

    // 3. List all tables
    console.log('\n3. Listing all tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('   ✓ Found', tablesResult.rows.length, 'tables:');
    tablesResult.rows.forEach(row => console.log('     -', row.table_name));

    // 4. Check for missing indexes
    console.log('\n4. Checking indexes...');
    const indexResult = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname
    `);
    console.log('   ✓ Found', indexResult.rows.length, 'indexes');

    // 5. Check for orphaned records (FK violations)
    console.log('\n5. Checking for data integrity issues...');
    
    // Check sessions without users
    const orphanedSessions = await db.execute(sql`
      SELECT COUNT(*) FROM sessions 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    console.log('   - Orphaned sessions:', orphanedSessions.rows[0].count);

    // Check notifications without users
    const orphanedNotifications = await db.execute(sql`
      SELECT COUNT(*) FROM notifications 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    console.log('   - Orphaned notifications:', orphanedNotifications.rows[0].count);

    // 6. Count records in key tables
    console.log('\n6. Record counts:');
    const users = await db.execute(sql`SELECT COUNT(*) FROM users`);
    console.log('   - Users:', users.rows[0].count);
    
    const sessions = await db.execute(sql`SELECT COUNT(*) FROM sessions`);
    console.log('   - Sessions:', sessions.rows[0].count);
    
    const notifications = await db.execute(sql`SELECT COUNT(*) FROM notifications`);
    console.log('   - Notifications:', notifications.rows[0].count);
    
    const campaigns = await db.execute(sql`SELECT COUNT(*) FROM campaigns`);
    console.log('   - Campaigns:', campaigns.rows[0].count);
    
    const subscribers = await db.execute(sql`SELECT COUNT(*) FROM subscribers`);
    console.log('   - Subscribers:', subscribers.rows[0].count);

    // 7. Check for expired sessions
    console.log('\n7. Checking session health...');
    const expiredSessions = await db.execute(sql`
      SELECT COUNT(*) FROM sessions 
      WHERE expires_at < NOW()
    `);
    console.log('   - Expired sessions:', expiredSessions.rows[0].count);

    console.log('\n✅ Database health check complete!');

  } catch (error) {
    console.error('\n❌ Database error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabase();
