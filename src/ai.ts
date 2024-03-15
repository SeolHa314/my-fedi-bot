import {
  VertexAI,
  //  HarmCategory,
  //  HarmBlockThreshold,
} from '@google-cloud/vertexai';

import BotConfig from './config.js';
const geminiAI = new VertexAI({
  project: BotConfig.vertexAI.projectName,
  location: BotConfig.vertexAI.projectLocation,
  googleAuthOptions: {
    keyFile: BotConfig.vertexAI.authFile,
  },
});

export async function genAIResponse(input: string) {
  const geminiModel = geminiAI.getGenerativeModel({
    model: 'gemini-1.0-pro',
  });

  const prompt = {
    contents: [{role: 'user', parts: [{text: input}]}],
  };

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  return response.candidates[0].content.parts[0].text!;
}
