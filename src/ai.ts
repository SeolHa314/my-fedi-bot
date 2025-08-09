import {GoogleGenerativeAI, Content} from '@google/generative-ai';
import BotConfig from './config';
import ContextDatabase from './database';
import {Chat, PromptType, MediaInlineDataType} from './types';
import {MediaCache} from './mediacache';

export default class AIService {
  private aiClient: GoogleGenerativeAI;
  private contextDB: ContextDatabase;
  private mediaCache: MediaCache;

  constructor(contextDatabase: ContextDatabase) {
    this.contextDB = contextDatabase;
    this.aiClient = new GoogleGenerativeAI(BotConfig.vertexAI.apiKey);
    this.mediaCache = new MediaCache();
  }

  public async genAIResponse(input: string, imageUrls?: string[]) {
    const model = this.aiClient.getGenerativeModel({model: 'gemini-2.5-flash'});
    const prompt = await this.buildSinglePrompt(input, imageUrls);
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  public async genAIResponseFromChatId(
    lastChatId: string,
    input: string,
    imageUrls?: string[]
  ) {
    const promptsQueryResult = this.contextDB.getAllChatContext(lastChatId);
    const contextImageUrls = this.contextDB.getMediaUrlsFromContext(lastChatId);
    const newChat: Chat = {
      role: 'user',
      parts: [{text: input}],
    };

    if (imageUrls) {
      newChat.parts.push(...(await this.getImageParts(imageUrls)));
    } else if (contextImageUrls.length > 0) {
      newChat.parts.push(...(await this.getImageParts(contextImageUrls)));
    }

    const history = await this.buildPromptsFromChats(promptsQueryResult);
    const model = this.aiClient.getGenerativeModel({model: 'gemini-2.5-flash'});
    const chat = model.startChat({history});
    const result = await chat.sendMessage(newChat.parts);

    return result.response.text();
  }

  private async buildSinglePrompt(
    input: string,
    imageUrls?: string[]
  ): Promise<PromptType> {
    const prompt: PromptType = [{text: input}];
    if (imageUrls) {
      prompt.push(...(await this.getImageParts(imageUrls)));
    }
    return prompt;
  }

  private async buildPromptsFromChats(chats: Chat[]): Promise<Content[]> {
    return Promise.all(chats.map(chat => this.buildPartFromChat(chat)));
  }

  private async buildPartFromChat(chat: Chat): Promise<Content> {
    return {
      role: chat.role,
      parts: chat.parts,
    };
  }

  private async getImageParts(
    imageUrls: string[]
  ): Promise<MediaInlineDataType[]> {
    return Promise.all(
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
  }

  private async getBase64Image(
    imageUrl: string
  ): Promise<MediaInlineDataType['inlineData']> {
    try {
      const imageWeb = await fetch(imageUrl);
      if (!imageWeb.ok) {
        throw new Error(`Error fetching image: ${imageWeb.statusText}`);
      }
      const imageBlob = await imageWeb.blob();
      const imageBase64 = Buffer.from(await imageBlob.arrayBuffer()).toString(
        'base64'
      );
      return {
        data: imageBase64,
        mimeType:
          imageWeb.headers.get('Content-Type') || 'application/octet-stream',
      };
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`Error fetching image: ${e.message}`);
      } else {
        throw new Error('An unknown error occurred while fetching the image.');
      }
    }
  }
}
