//import generator, {Entity} from 'megalodon';
import {Entity, MegalodonInterface, NotificationType} from 'megalodon';
import AIService from './ai.js';
import BotConfig from './config.js';
import path from 'path';
import ContextDatabase from './database.js';
import {Account} from 'megalodon/lib/src/entities/account.js';

type MentionHook = (
  msg: Entity.Status
) => Promise<void | ReturnType<MegalodonInterface['postStatus']>>;
type EmojiReactionHook = (
  emojiContext: Entity.Notification
) => Promise<void | ReturnType<MegalodonInterface['createEmojiReaction']>>;

export type InstallHookResult = {
  mentionHook?: MentionHook;
  emojiReactionHook?: EmojiReactionHook;
};

export default class FediHelperBot {
  private client: MegalodonInterface;
  private contextDB: ContextDatabase;
  private aiService: AIService;
  private instanceHostname: string;

  // We are certain that these two properties are set in function run()
  // and that they are not null
  private botAccount!: Account;
  private botID!: string;

  constructor(client: MegalodonInterface) {
    this.client = client;

    const dbPath = path.join(
      process.cwd(),
      BotConfig.dbPath || 'context-database.json'
    );
    this.contextDB = new ContextDatabase(dbPath);
    this.aiService = new AIService(this.contextDB);

    this.instanceHostname = new URL(BotConfig.instanceUrl).hostname;
    this.run();
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
        if (status.in_reply_to_id) {
          if (!this.contextDB.existsChatContext(status.in_reply_to_id)) {
            // If there is no context for this chat, then we can't reply to it
            return;
          } else {
            try {
              const aiResponse = await this.aiService.genAIResponseFromChatId(
                this.sanitizeStatus(status.plain_content),
                status.in_reply_to_id
              );
              const respPost = await this.client.postStatus(aiResponse, {
                in_reply_to_id: status.id,
                visibility: status.visibility,
              });
              this.contextDB.extendChatContent(
                status.in_reply_to_id,
                respPost.data.id,
                this.sanitizeStatus(status.plain_content),
                aiResponse
              );
            } catch (e: unknown) {
              console.log('Error' + e);
            }
          }
        } else {
          try {
            const aiResponse = await this.aiService.genAIResponse(
              this.sanitizeStatus(status.plain_content)
            );
            // Post the AI response as a status update on the bot's account
            const postResp = await this.client.postStatus(aiResponse, {
              // Set the in_reply_to_id to the ID of the original status update
              in_reply_to_id: status.id,
              // Set the visibility of the status update to the same as the original status update
              visibility: status.visibility,
            });
            this.contextDB.newChatContext(
              postResp.data.id,
              status.account.id,
              this.sanitizeStatus(status.plain_content),
              aiResponse
            );
          } catch (e: unknown) {
            // Log any errors that occur while posting the status update
            console.log('Error' + e);
          }
        }
      }
    }
  }

  async run() {
    this.botAccount = (await this.client.getAccount(BotConfig.botID)).data;
    this.botID = this.botAccount.id;

    this.client.userStreaming().then(stream => {
      // Listen for the 'connect' event and log a message when the stream is connected
      stream.on('connect', () => {
        console.log('connect');
        console.log(`bot id: ${this.botID}`);
      });

      // stream.on('update', async (status: Entity.Status) =>
      //   this.handleUpdate(status)
      // );

      stream.on('notification', (noti: Entity.Notification) => {
        if (noti.type === NotificationType.Mention && noti.status) {
          this.handleMention(noti.status);
        }
      });

      stream.on('heartbeat', () => {
        console.log('heartbeat');
      });

      stream.on('close', () => {
        console.log('close');
      });
    });
  }
}
