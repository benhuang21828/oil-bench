import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
async function run() {
  const data = await yahooFinance.chart('CL=F', { period1: '2026-01-05', period2: '2026-01-06' });
  console.log(data.quotes.length, data.quotes[0]);
}
run().catch(console.error);
