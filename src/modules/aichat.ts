import Module from '../module';
import {Entity, MegalodonInterface} from 'megalodon';
import AIService from '../ai';
import BotConfig from '../config';
import path from 'path';
import ContextDatabase from '../database';
import {InstallHookResult} from '../types';
import autoBind from 'auto-bind';

export default class AichatModule extends Module {
  aiService: AIService;
  contextDB: ContextDatabase;
  instanceHostname: string;
  botID: string;
  bot: MegalodonInterface;

  public constructor(bot: MegalodonInterface) {
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

  private async handleMention(status: Entity.Status) {
    // Ignore updates from itself
    if (status.account.id === this.botID) {
      return;
    }
    // Check if the bot is mentioned in the status update
    if (status.mentions.map(val => val.id).includes(this.botID)) {
      if (
        // Check if the status update starts with the bot's username and only mentions the bot
        // status.plain_content?.startsWith('@' + this.botAccount.username) &&
        status.plain_content &&
        status.mentions.length === 1 &&
        this.contextDB.isPermittedUser(status.account.id)
      ) {
        const imageUrls: string[] = status.media_attachments
          .filter(media => media.type === 'image')
          .map(media => media.url);
        if (status.in_reply_to_id) {
          if (this.contextDB.existsChatContext(status.in_reply_to_id)) {
            try {
              const aiResponse = await this.aiService.genAIResponseFromChatId(
                status.in_reply_to_id,
                this.sanitizeStatus(status.plain_content),
                imageUrls
              );
              this.log(
                'note id: ' +
                  status.in_reply_to_id +
                  '\nresponse: ' +
                  aiResponse
              );
              const respPost = await this.bot.postStatus(aiResponse, {
                in_reply_to_id: status.id,
                visibility: status.visibility,
              });
              this.contextDB.extendChatContent(
                status.in_reply_to_id,
                respPost.data.id,
                this.sanitizeStatus(status.plain_content),
                aiResponse,
                imageUrls
              );
            } catch (e: unknown) {
              console.log('Error' + e);
            }
          }
        } else {
          try {
            const aiResponse = await this.aiService.genAIResponse(
              this.sanitizeStatus(status.plain_content),
              imageUrls
            );
            this.log('response: ' + aiResponse);
            // Post the AI response as a status update on the bot's account
            const postResp = await this.bot.postStatus(aiResponse, {
              // Set the in_reply_to_id to the ID of the original status update
              in_reply_to_id: status.id,
              // Set the visibility of the status update to the same as the original status update
              visibility: status.visibility,
            });
            this.contextDB.newChatContext(
              postResp.data.id,
              status.account.id,
              this.sanitizeStatus(status.plain_content),
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
