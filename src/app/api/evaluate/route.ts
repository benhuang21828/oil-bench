import { NextResponse } from 'next/server';
import { evaluatePredictions } from '@/lib/evaluation/evaluator';

export async function GET() {
  try {
    const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";
    const metrics = await evaluatePredictions(model);

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error: any) {
    console.error('Evaluation execution error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
