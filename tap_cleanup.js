const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/home/max/projects/tap-client-hub/.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { db: { schema: 'tap_hub_project' } });

const sheetPins = new Set([
  '9072','2360','6810','4003','8921','6565','4741','1123','1028','4250',
  '9370','2233','1541','2129','0148','4315','2348','4827','5044',
  '8138','6248','1245','0003','3050','9694','0052','7410',
  '9283','8418','4337','0962','6012','1200','8228','3496','5963',
  '7369','0384','4742','1828','1256','4902','9150',
  '9692','5339','1901','7071','7076','8013'
]);

async function main() {
  // Fetch ALL client_services in pages
  let allSvcs = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('client_services')
      .select('client_id, payroll_password')
      .range(from, from + pageSize - 1);
    if (error) { console.log('Error fetching services:', error.message); break; }
    if (!data || data.length === 0) break;
    allSvcs = allSvcs.concat(data);
    console.log(`Fetched page at ${from}: ${data.length} rows`);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Total client_services: ${allSvcs.length}`);

  // Map PINs to client UUIDs
  const keepUuids = new Set();
  for (const s of allSvcs) {
    if (s.payroll_password && sheetPins.has(s.payroll_password)) {
      keepUuids.add(s.client_id);
    }
  }
  console.log(`Clients matching sheet PINs: ${keepUuids.size}`);

  // Get all client UUIDs
  let allClients = [];
  from = 0;
  while (true) {
    const { data, error } = await sb
      .from('clients')
      .select('id')
      .range(from, from + pageSize - 1);
    if (error) { console.log('Error fetching clients:', error.message); break; }
    if (!data || data.length === 0) break;
    allClients = allClients.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Total clients: ${allClients.length}`);

  const deleteIds = allClients.map(c => c.id).filter(id => !keepUuids.has(id));
  console.log(`Clients to DELETE: ${deleteIds.length}`);
  console.log(`Clients to KEEP: ${keepUuids.size}`);

  // Delete related records in batches
  const batchSize = 50;

  console.log('\n--- Deleting client_services ---');
  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize);
    const { error } = await sb.from('client_services').delete().in('client_id', batch);
    if (error) console.log(`  Error at ${i}:`, error.message);
    if (i % 500 === 0) console.log(`  Progress: ${i}/${deleteIds.length}`);
  }

  console.log('--- Deleting work_periods ---');
  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize);
    const { error } = await sb.from('work_periods').delete().in('client_id', batch);
    if (error) console.log(`  Error at ${i}:`, error.message);
    if (i % 500 === 0) console.log(`  Progress: ${i}/${deleteIds.length}`);
  }

  console.log('--- Deleting contacts ---');
  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize);
    const { error } = await sb.from('contacts').delete().in('client_id', batch);
    if (error) console.log(`  Error at ${i}:`, error.message);
    if (i % 500 === 0) console.log(`  Progress: ${i}/${deleteIds.length}`);
  }

  console.log('--- Deleting clients ---');
  let deleted = 0;
  for (let i = 0; i < deleteIds.length; i += batchSize) {
    const batch = deleteIds.slice(i, i + batchSize);
    const { error } = await sb.from('clients').delete().in('id', batch);
    if (error) console.log(`  Error at ${i}:`, error.message);
    else deleted += batch.length;
    if (i % 500 === 0) console.log(`  Progress: ${i}/${deleteIds.length}`);
  }
  console.log(`Deleted ${deleted} clients`);

  // Verify
  let finalCount = 0;
  from = 0;
  while (true) {
    const { data } = await sb.from('clients').select('id').range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    finalCount += data.length;
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`\nFinal client count: ${finalCount}`);
}

main().catch(console.error);
