import 'dotenv/config';
import axios from 'axios';

async function run() {
  const key = process.env.EIA_API_KEY;
  if (!key) { console.log('No key'); return; }
  
  // Weekly U.S. Ending Stocks of Crude Oil (Thousand Barrels)
  const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${key}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&start=2025-12-01&end=2026-03-14`;
  try {
    const res = await axios.get(url);
    console.log(res.data.response.data.slice(0, 3));
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
