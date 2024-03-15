//import generator, {Entity} from 'megalodon';
import {Entity, MegalodonInterface} from 'megalodon';
import {genAIResponse} from './ai.js';
import BotConfig from './config.js';

export default class FediHelperBot {
  private client: MegalodonInterface;

  constructor(client: MegalodonInterface) {
    this.client = client;
  }

  async run() {
    const botAccount = (await this.client.getAccount(BotConfig.botID)).data;
    const botID = botAccount.id;

    this.client.userStreaming().then(stream => {
      stream.on('connect', () => {
        console.log('connect');
        console.log(`bot id: ${botID}`);
      });

      stream.on('update', async (status: Entity.Status) => {
        console.log('updated');
        if (status.mentions.map(val => val.id).includes(botID)) {
          if (
            status.plain_content?.startsWith('@' + botAccount.username) &&
            status.mentions.length === 1
          ) {
            const firstMentionRegex = /^@\w+/;
            const prompt = status.plain_content.replace(firstMentionRegex, '');
            try {
              this.client.postStatus(await genAIResponse(prompt), {
                in_reply_to_id: status.id,
                visibility: status.visibility,
              });
            } catch (e: unknown) {
              console.log('Error' + e);
            }
          }
        }
      });

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
