import {
  GenerativeModel,
  VertexAI,
  //  HarmCategory,
  //  HarmBlockThreshold,
} from '@google-cloud/vertexai';
import BotConfig from './config.js';
import ContextDatabase from './database.js';

export default class AIService {
  private aiClient: VertexAI;
  private geminiModel: GenerativeModel;
  private contextDB: ContextDatabase;

  constructor(contextDatabase: ContextDatabase) {
    this.contextDB = contextDatabase;
    this.aiClient = new VertexAI({
      project: BotConfig.vertexAI.projectName,
      location: BotConfig.vertexAI.projectLocation,
      googleAuthOptions: {
        keyFile: BotConfig.vertexAI.authFile,
      },
    });
    this.geminiModel = this.aiClient.getGenerativeModel({
      model: 'gemini-1.0-pro',
    });
  }

  public async genAIResponse(input: string) {
    const prompt = {
      contents: [{role: 'user', parts: [{text: input}]}],
    };

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.candidates[0].content.parts[0].text!;
  }

  public async genAIResponseFromChatId(input: string, lastChatId: string) {
    const prompts = this.contextDB.getAllChatContext(lastChatId);
    const result = await this.geminiModel.generateContent({
      contents: [...prompts, {role: 'user', parts: [{text: input}]}],
    });
    const response = await result.response;
    return response.candidates[0].content.parts[0].text!;
  }
}
