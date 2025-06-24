import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';
import BotConfig from './config';
import ContextDatabase from './database';
import {PromptType} from 'types';
import {MediaCache} from 'mediacache';

export default class AIService {
  private aiClient: VertexAI;
  private geminiModel: GenerativeModel;
  private contextDB: ContextDatabase;
  private mediaCache: MediaCache;

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
      model: 'gemini-2.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: 'You would help users with their queries. You can also respond to images. You should be polite and helpful.',
          },
        ],
      },
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 2048,
        candidateCount: 1,
      },
      safetySettings: Object.values(HarmCategory).map(category => ({
        category: category,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      })),
    });
    this.mediaCache = new MediaCache();
  }

  public async genAIResponse(input: string, imageUrls?: string[]) {
    const prompt: PromptType = {
      contents: [{role: 'user', parts: []}],
    };
    if (imageUrls) {
      const imagePrompt = await Promise.all(
        imageUrls.map(async url => {
          const imageCache = await this.mediaCache.getMediaFromCache(url);
          if (imageCache !== null) {
            return {inlineData: imageCache};
          } else {
            const image = await this.getBase64Image(url);
            await this.mediaCache.setMediaToCache(url, image);
            return {
              inlineData: image,
            };
          }
        })
      );
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
            chat.chatImageUrls.map(async url => {
              const imageCache = await this.mediaCache.getMediaFromCache(url);
              if (imageCache !== null) {
                return {inlineData: imageCache};
              } else {
                const image = await this.getBase64Image(url);
                await this.mediaCache.setMediaToCache(url, image);
                return {
                  inlineData: image,
                };
              }
            })
          );

          return {
            role: chat.role,
            parts: [...images, {text: chat.chatContent}],
          };
        } else {
          return {
            role: chat.role,
            parts: [{text: chat.chatContent}],
          };
        }
      })
    );

    const result = await this.geminiModel.generateContent({
      contents: prompts,
    });
    const response = result.response;
    if (response.candidates !== undefined) {
      return response.candidates[0].content.parts[0].text!;
    }
    return '';
  }

  private async getBase64Image(
    imageUrl: string
  ): Promise<{data: string; mimeType: string}> {
    try {
      const imageWeb = await fetch(imageUrl);
      const imageBlob = await imageWeb.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      return {
        data: imageBase64,
        mimeType: imageWeb.headers.get('Content-Type')!,
      };
    } catch (e) {
      throw new Error('Error fetching image');
    }
  }
}
