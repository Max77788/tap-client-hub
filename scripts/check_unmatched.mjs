import pg from 'pg';

// Pass each parameter separately - avoids DNS/user parsing issue
const db = new pg.Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.rqxscydyvrvbdkqagemy',
  password: 'BIvtIZP9RHIrcZRg',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  keepAlive: false,
});

try {
  await db.connect();
  const res = await db.query(`SELECT id, name FROM tap_hub_project.clients WHERE cid IS NULL ORDER BY name`);
  console.log(JSON.stringify(res.rows, null, 2));
  console.error(`Total unmatched: ${res.rows.length}`);
  await db.end();
} catch (e) {
  console.error("Failed:", e.message, e.code);
}
