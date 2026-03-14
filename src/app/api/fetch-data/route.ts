import { NextResponse } from 'next/server';
import { fetchPrices } from '@/lib/fetchers/yahooFinance';
import { fetchNews } from '@/lib/fetchers/serper';
import { fetchFundamentals } from '@/lib/fetchers/eia';

export async function GET() {
  try {
    const [prices, news, fundamentals] = await Promise.all([
      fetchPrices(),
      fetchNews(),
      fetchFundamentals()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        prices,
        news,
        fundamentals
      }
    });
  } catch (error: any) {
    console.error('Data fetching error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
