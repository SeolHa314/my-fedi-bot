import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';
import BotConfig from './config';
import ContextDatabase from './database';
import {PromptType} from 'types';

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
      model: 'gemini-1.5-flash-001',
      generationConfig: {
        temperature: 0.1,
      },
      safetySettings: Object.values(HarmCategory).map(category => ({
        category: category,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      })),
    });
  }

  public async genAIResponse(input: string, imageUrls?: string[]) {
    const prompt: PromptType = {
      contents: [{role: 'user', parts: []}],
    };
    if (imageUrls) {
      const images = await Promise.all(
        imageUrls.map(async url => this.getBase64Image(url))
      );
      const imagePrompt = images.map(image => {
        console.log('image MIME type:', image.mimeType);
        return {
          inlineData: {data: image.imageBase64, mimeType: image.mimeType},
        };
      });
      prompt.contents[0].parts.push(...imagePrompt);
    }
    prompt.contents[0].parts.push({text: input});

    const result = await this.geminiModel.generateContent(prompt);
    const response = result.response;
    if (response.candidates !== undefined) {
      return response.candidates[0].content.parts[0].text!;
    }
    return '';
  }

  public async genAIResponseFromChatId(
    lastChatId: string,
    input: string,
    imageUrls?: string[]
  ) {
    const promptsQueryResult = this.contextDB.getAllChatContext(lastChatId);
    const prompts: PromptType['contents'] = await Promise.all(
      [
        ...promptsQueryResult,
        {
          role: 'user' as 'user' | 'model',
          chatContent: input,
          chatImageUrls: imageUrls,
        },
      ].map(async chat => {
        if (chat.chatImageUrls) {
          const images = await Promise.all(
            chat.chatImageUrls.map(url => this.getBase64Image(url))
          );

          return {
            role: chat.role,
            parts: [
              ...images.map(image => ({
                inlineData: {data: image.imageBase64, mimeType: image.mimeType},
              })),
              {text: chat.chatContent},
            ],
          };
        } else {
          return {
            role: chat.role,
            parts: [{text: chat.chatContent}],
          };
        }
      })
    );
    // for (const chat of promptsQueryResult) {
    //   if (chat.chatImageUrls) {
    //     const images = await Promise.all(
    //       chat.chatImageUrls.map(url => this.getBase64Image(url))
    //     );

    //     prompts.push({
    //       role: chat.role,
    //       parts: [
    //         ...images.map(image => ({
    //           inlineData: {data: image.imageBase64, mimeType: image.mimeType},
    //         })),
    //         {text: chat.chatContent},
    //       ],
    //     });
    //   } else {
    //     prompts.push({
    //       role: chat.role,
    //       parts: [{text: chat.chatContent}],
    //     });
    //   }
    // }
    const result = await this.geminiModel.generateContent({
      contents: prompts,
    });
    const response = result.response;
    if (response.candidates !== undefined) {
      return response.candidates[0].content.parts[0].text!;
    }
    return '';
  }

  private async getBase64Image(imageUrl: string) {
    try {
      const imageWeb = await fetch(imageUrl);
      const imageBlob = await imageWeb.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      return {
        imageBase64: imageBase64,
        mimeType: imageWeb.headers.get('Content-Type')!,
      };
    } catch (e) {
      throw new Error('Error fetching image');
    }
  }
}
