async function getAllClients() {
  let all = [];
  let offset = 0;
  const limit = 200;
  
  while (true) {
    const url = `https://tap-client-hub.vercel.app/api/clients?type=all&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    
    if (!data.clients || data.clients.length === 0) break;
    
    all = all.concat(data.clients);
    console.error(`Fetched ${data.clients.length} clients at offset ${offset}`);
    if (data.clients.length < limit) break;
    offset += limit;
  }
  
  return all;
}

const clients = await getAllClients();
console.error(`\nTotal clients: ${clients.length}`);

// Split into matched and unmatched
const matched = clients.filter(c => c.cid && !c.cid.startsWith('CID-'));
const unmatched = clients.filter(c => !c.cid || c.cid.startsWith('CID-'));

console.error(`Matched (has numeric CID): ${matched.length}`);
console.error(`Unmatched (no CID): ${unmatched.length}`);

// Output unmatched names for analysis
console.log("\n=== UNMATCHED NAMES ===");
unmatched.forEach((c, i) => console.log(`${i+1}. "${c.name}" | type=${c.type} | group=${c.group || ''} | ${c.city || ''}, ${c.state || ''}`));

// Also output matched for reference
console.log("\n=== MATCHED CID MAPPING (first 50) ===");
matched.slice(0, 50).forEach(c => console.log(`CID ${c.cid} → "${c.name}"`));
