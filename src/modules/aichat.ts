import Module from '../module';
import {Entity, MegalodonInterface} from 'megalodon';
import AIService from '../ai';
import BotConfig from '../config';
import ContextDatabase from '../database';
import {InstallHookResult} from '../types';
import autoBind from 'auto-bind';

export default class AichatModule extends Module {
  aiService: AIService;
  contextDB: ContextDatabase;
  instanceHostname: string;
  botID: string;
  bot: MegalodonInterface;

  public constructor(
    bot: MegalodonInterface,
    contextDB: ContextDatabase,
    aiService: AIService,
  ) {
    super(bot);
    this.bot = bot;
    this.botID = BotConfig.botID;
    this.contextDB = contextDB;
    this.aiService = aiService;
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
    if (this.shouldIgnore(status)) {
      return;
    }

    const imageUrls = this.extractImageUrls(status);
    const sanitizedContent = this.sanitizeStatus(status.plain_content!);

    // Check for slash commands
    const commandMatch = sanitizedContent.match(/^\/(\w+)\s*(.+)?/);
    if (commandMatch) {
      const [, command] = commandMatch;
      if (command === 'add_user') {
        await this.handleAddUserCommand(status);
        return;
      }
    }

    const isReply =
      status.in_reply_to_id &&
      this.contextDB.existsChatContext(status.in_reply_to_id);

    const interaction = isReply
      ? () => this.processReply(status, sanitizedContent, imageUrls)
      : () => this.processNewConversation(status, sanitizedContent, imageUrls);

    await this.executeAIInteraction(interaction, status.id);
  }

  private shouldIgnore(status: Entity.Status): boolean {
    if (status.account.id === this.botID) {
      return true;
    }

    const isBotMentioned = status.mentions.some(m => m.id === this.botID);
    if (!isBotMentioned) {
      return true;
    }

    const sanitizedContent = this.sanitizeStatus(status.plain_content!);
    const isCommand = sanitizedContent.match(/^\/(\w+)\s*(.+)?/);

    // Allow commands from permitted users
    if (isCommand && this.contextDB.isPermittedUser(status.account.id)) {
      return false;
    }

    return !(
      status.plain_content &&
      status.mentions.length === 1 &&
      this.contextDB.isPermittedUser(status.account.id)
    );
  }

  private extractImageUrls(status: Entity.Status): string[] {
    return status.media_attachments
      .filter(media => media.type === 'image')
      .map(media => media.url);
  }

  private async executeAIInteraction(
    interaction: () => Promise<void>,
    statusId: string,
  ) {
    try {
      await interaction();
    } catch (e) {
      this.log(`Error processing interaction for status ${statusId}: ${e}`);
    }
  }

  private async processReply(
    status: Entity.Status,
    content: string,
    imageUrls: string[],
  ) {
    const aiResponse = await this.aiService.genAIResponseFromChatId(
      status.in_reply_to_id!,
      content,
      imageUrls,
    );
    this.log(`Reply to ${status.in_reply_to_id}: ${aiResponse}`);
    const respPost = await this.bot.postStatus(aiResponse, {
      in_reply_to_id: status.id,
      visibility: status.visibility,
    });
    this.contextDB.extendChatContent(
      status.in_reply_to_id!,
      respPost.data.id,
      content,
      aiResponse,
      imageUrls,
    );
  }

  private async processNewConversation(
    status: Entity.Status,
    content: string,
    imageUrls: string[],
  ) {
    const aiResponse = await this.aiService.genAIResponse(content, imageUrls);
    this.log(`New conversation response: ${aiResponse}`);
    const postResp = await this.bot.postStatus(aiResponse, {
      in_reply_to_id: status.id,
      visibility: status.visibility,
    });
    this.contextDB.newChatContext(
      postResp.data.id,
      status.account.id,
      content,
      aiResponse,
      imageUrls,
    );
  }

  private async handleAddUserCommand(status: Entity.Status) {
    const userToAdd = status.mentions.find(m => m.id !== this.botID);

    try {
      // Only allow command if visibility is 'direct'
      if (status.visibility !== 'direct') {
        const response =
          "The /add_user command can only be used with 'direct' visibility.";
        await this.bot.postStatus(response, {
          in_reply_to_id: status.id,
          visibility: status.visibility,
        });
        return;
      }

      if (!userToAdd) {
        const response = 'No user specified to add. Please mention a user.';
        await this.bot.postStatus(response, {
          in_reply_to_id: status.id,
          visibility: status.visibility,
        });
        return;
      }

      this.contextDB.addPermittedUser(userToAdd.id);

      const response = `User @${userToAdd.acct} has been added to the permitted users list.`;
      this.log(`Added permitted user: ${userToAdd.id} (@${userToAdd.acct})`);

      await this.bot.postStatus(response, {
        in_reply_to_id: status.id,
        visibility: status.visibility,
      });
    } catch (error) {
      const userIdentifier = userToAdd
        ? `@${userToAdd.acct}`
        : 'the specified user';
      const errorMessage = `Error adding user ${userIdentifier}: ${error}`;
      this.log(errorMessage);

      await this.bot.postStatus(errorMessage, {
        in_reply_to_id: status.id,
        visibility: status.visibility,
      });
    }
  }

  public readonly name = 'aichat';
}
