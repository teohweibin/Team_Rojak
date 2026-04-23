import OpenAI from 'openai';

export const ilmu = new OpenAI({
  apiKey: process.env.ILMU_API_KEY,
  baseURL: process.env.ILMU_BASE_URL,
});
