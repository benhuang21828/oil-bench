import yahooFinance from 'yahoo-finance2';
async function run() {
  const quote = await yahooFinance.quote('CL=F');
  console.log('Success:', quote.symbol);
}
run().catch(console.error);
