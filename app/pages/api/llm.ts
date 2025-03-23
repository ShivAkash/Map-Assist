// pages/api/llm.ts
import type { NextApiRequest, NextApiResponse } from 'next';

interface LLMResponse {
  answer: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LLMResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/your-model-name',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: query }),
      }
    );

    const data = await response.json();
    
    // Adjust parsing based on your model's response structure.
    const answer =
      data && Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : 'No answer generated.';
    
    res.status(200).json({ answer });
  } catch (error) {
    console.error('LLM API error:', error);
    res.status(500).json({ answer: 'Error processing your request.' });
  }
}
