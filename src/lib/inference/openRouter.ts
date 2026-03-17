import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { PredictionResult, DailyPredictionOutput } from '../types';

export async function runInference(prompt: string, targetDateFmt: string): Promise<PredictionResult> {
  const apiKey = process.env.OPENROUTER_KEY;
  // Use the one specified in .env, fallback to gemini-2.5-flash
  const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";

  if (!apiKey) {
    throw new Error('OPENROUTER_KEY is not defined in .env');
  }

  const payload = {
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ],
    response_format: { type: "json_object" }
  };

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout to prevent infinite hangs
    });

    const completion = response.data.choices?.[0]?.message?.content;

    if (!completion) {
      throw new Error(`OpenRouter returned empty response for ${targetDateFmt}`);
    }

    // Attempt to parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(completion);
    } catch (e) {
      // In case the model wrapped it in markdown codeblocks
      const cleaned = completion.replace(/^```json/m, '').replace(/^```/m, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const prediction: PredictionResult = {
      date: new Date(targetDateFmt).toISOString(),
      model: model,
      predict_target_price: parsed.predict_target_price || 0,
      portfolio_allocation: typeof parsed.portfolio_allocation === 'number' ? parsed.portfolio_allocation : 50,
      reasoning: parsed.reasoning || "Failed to parse reasoning."
    };

    const output: DailyPredictionOutput = {
      targetDate: targetDateFmt,
      prediction: prediction
    };

    // Save Prediction
    // Using a sanitized model string for the directory
    const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dirPath = path.join(process.cwd(), 'data', 'prediction', dirModelName);
    await fs.mkdir(dirPath, { recursive: true });

    // We append to a consolidated predictions.json file as an array
    const predictionsFilePath = path.join(dirPath, 'predictions.json');
    let existingPredictions: DailyPredictionOutput[] = [];

    try {
      const existingData = await fs.readFile(predictionsFilePath, 'utf-8');
      existingPredictions = JSON.parse(existingData);
      if (!Array.isArray(existingPredictions)) existingPredictions = [];
    } catch (e) {
      // File doesn't exist yet, we will create it
    }

    // Check if this date already exists and replace it, otherwise push
    const existingIndex = existingPredictions.findIndex(p => p.targetDate === targetDateFmt);
    if (existingIndex > -1) {
      existingPredictions[existingIndex] = output;
    } else {
      existingPredictions.push(output);
    }

    // Sort by date ascending to keep it clean
    existingPredictions.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    await fs.writeFile(predictionsFilePath, JSON.stringify(existingPredictions, null, 2));

    return prediction;

  } catch (error: any) {
    console.error(`Error generating prediction for ${targetDateFmt}:`, error.response?.data || error.message);
    throw error;
  }
}
