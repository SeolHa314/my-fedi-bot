//import generator, {Entity} from 'megalodon';
import {Entity, MegalodonInterface} from 'megalodon';
import AIService from './ai.js';
import BotConfig from './config.js';
import path from 'path';
import ContextDatabase from './database.js';
import {Account} from 'megalodon/lib/src/entities/account.js';

export default class FediHelperBot {
  private client: MegalodonInterface;
  private contextDB: ContextDatabase;
  private aiService: AIService;

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

    this.run();
  }

  private async handleUpdate(status: Entity.Status) {
    // Check if the bot is mentioned in the status update
    if (status.mentions.map(val => val.id).includes(this.botID)) {
      if (
        // Check if the status update starts with the bot's username and only mentions the bot
        status.plain_content?.startsWith('@' + this.botAccount.username) &&
        status.mentions.length === 1
      ) {
        // Create a regular expression to match the bot's username at the beginning of the status update
        const firstMentionRegex = /^@\w+/;
        // Extract the prompt from the status update by removing the bot's username
        const prompt = status.plain_content.replace(firstMentionRegex, '');
        // Generate an AI response to the prompt
        const response = await this.aiService.genAIResponse(prompt);
        try {
          // Post the AI response as a status update on the bot's account
          this.client.postStatus(response, {
            // Set the in_reply_to_id to the ID of the original status update
            in_reply_to_id: status.id,
            // Set the visibility of the status update to the same as the original status update
            visibility: status.visibility,
          });
        } catch (e: unknown) {
          // Log any errors that occur while posting the status update
          console.log('Error' + e);
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

      stream.on('update', async (status: Entity.Status) =>
        this.handleUpdate(status)
      );

      // stream.on('notification', (noti: Entity.Notification) => {
      //   console.log(noti);
      // });

      stream.on('heartbeat', () => {
        console.log('heartbeat');
      });

      stream.on('close', () => {
        console.log('close');
      });
    });
  }
}
