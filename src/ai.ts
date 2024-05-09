import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
  //  HarmCategory,
  //  HarmBlockThreshold,
} from '@google-cloud/vertexai';
import BotConfig from './config';
import ContextDatabase from './database';

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
      // model: 'gemini-1.0-pro',
      model: 'gemini-1.5-pro-preview-0409',
      generationConfig: {
        temperature: 1.25,
      },
      safetySettings: Object.values(HarmCategory).map(category => ({
        category: category,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      })),
    });
  }

  public async genAIResponse(input: string) {
    const prompt = {
      contents: [{role: 'user', parts: [{text: input}]}],
    };

    const result = await this.geminiModel.generateContent(prompt);
    const response = result.response;
    if (response.candidates !== undefined) {
      return response.candidates[0].content.parts[0].text!;
    }
    return '';
  }

  public async genAIResponseFromChatId(input: string, lastChatId: string) {
    const prompts = this.contextDB.getAllChatContext(lastChatId);
    const result = await this.geminiModel.generateContent({
      contents: [...prompts, {role: 'user', parts: [{text: input}]}],
    });
    const response = result.response;
    if (response.candidates !== undefined) {
      return response.candidates[0].content.parts[0].text!;
    }
    return '';
  }
}
