import { NextResponse } from 'next/server';
import { buildPromptForDate } from '@/lib/inference/promptBuilder';
import { runInference } from '@/lib/inference/openRouter';

export async function POST(request: Request) {
  try {
    const { targetDate } = await request.json();
    
    if (!targetDate) {
      return NextResponse.json({ success: false, error: 'targetDate is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const targetDateFmt = new Date(targetDate).toISOString().split('T')[0];
    const prompt = await buildPromptForDate(targetDateFmt);
    const prediction = await runInference(prompt, targetDateFmt);

    return NextResponse.json({
      success: true,
      data: {
        targetDate: targetDateFmt,
        prediction
      }
    });

  } catch (error: any) {
    console.error('Inference execution error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
