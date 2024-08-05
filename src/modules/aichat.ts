import Module from '../module.js';
import * as Misskey from 'misskey-js';
import AIService from '../ai.js';
import BotConfig from '../config.js';
import path from 'path';
import ContextDatabase from '../database.js';
import {InstallHookResult} from '../types.js';
import autoBind from 'auto-bind';
import {Note} from 'misskey-js/entities.js';

export default class AichatModule extends Module {
  aiService: AIService;
  contextDB: ContextDatabase;
  instanceHostname: string;
  botID: string;
  bot: Misskey.api.APIClient;

  public constructor(bot: Misskey.api.APIClient) {
    super(bot);
    this.bot = bot;
    this.botID = BotConfig.botID;

    const dbPath = path.join(
      process.cwd(),
      BotConfig.dbPath || 'context-database.json'
    );
    this.contextDB = new ContextDatabase(dbPath);
    this.aiService = new AIService(this.contextDB);
    this.instanceHostname = new URL(BotConfig.instanceUrl).hostname;
    autoBind(this);
  }

  public installHook(): InstallHookResult {
    return {
      mentionHook: this.handleMention,
    };
  }

  private sanitizeStatus(content: string): string {
    return content
      .replace(/^@\w+/, '')
      .replace(new RegExp(`^@\\w+@${this.instanceHostname}`), '')
      .trim();
  }

  private async handleMention(status: Note) {
    // Ignore updates from itself
    if (status.userId === this.botID && !status.localOnly) {
      return;
    }
    // Check if the bot is mentioned in the status update
    if (status.mentions!.includes(this.botID)) {
      if (
        // Check if the status update starts with the bot's username and only mentions the bot
        // status.plain_content?.startsWith('@' + this.botAccount.username) &&
        status.text &&
        status.mentions!.length === 1
        // this.contextDB.isPermittedUser(status.userId)
      ) {
        if (status.replyId) {
          if (!this.contextDB.existsChatContext(status.replyId)) {
            // If there is no context for this chat, then we can't reply to it
            return;
          } else {
            try {
              const imageUrls: string[] = (status.files || [])
                .filter(
                  media =>
                    media.type in
                    ['image/webp', 'image/png', 'image/jpeg', 'image/gif']
                )
                .map(media => media.url);
              const aiResponse = await this.aiService.genAIResponseFromChatId(
                status.replyId,
                this.sanitizeStatus(status.text),
                imageUrls
              );
              // const respPost = await this.bot.postStatus(aiResponse, {
              //   in_reply_to_id: status.id,
              //   visibility: status.visibility,
              // });
              const respPost = await this.botClient.request('notes/create', {
                text: aiResponse,
                visibility: status.visibility,
                replyId: status.id,
              });
              this.contextDB.extendChatContent(
                status.replyId,
                respPost.createdNote.id,
                this.sanitizeStatus(status.text),
                aiResponse,
                imageUrls
              );
            } catch (e: unknown) {
              console.log('Error' + e);
            }
          }
        } else {
          try {
            const imageUrls: string[] = (status.files || [])
              .filter(media => media.type === 'image/webp')
              .map(media => media.url);
            const aiResponse = await this.aiService.genAIResponse(
              this.sanitizeStatus(status.text),
              imageUrls
            );
            this.log('response: ' + aiResponse);
            // Post the AI response as a status update on the bot's account
            const respPost = await this.botClient.request('notes/create', {
              text: aiResponse,
              visibility: status.visibility,
              replyId: status.id,
            });
            this.contextDB.newChatContext(
              respPost.createdNote.id,
              status.userId,
              this.sanitizeStatus(status.text),
              aiResponse,
              imageUrls
            );
          } catch (e: unknown) {
            // Log any errors that occur while posting the status update
            this.log('Error' + e);
          }
        }
      }
    }
  }

  public readonly name = 'aichat';
}
