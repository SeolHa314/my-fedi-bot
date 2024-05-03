//import generator, {Entity} from 'megalodon';
import {Entity, MegalodonInterface, NotificationType} from 'megalodon';
import BotConfig from './config';
import {Account} from 'megalodon/lib/src/entities/account';
import Module from './module';

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
  private modules: Module[];

  // We are certain that these two properties are set in function run()
  // and that they are not null
  private botAccount!: Account;
  private botID!: string;

  private hooks: InstallHookResult[];

  constructor(client: MegalodonInterface) {
    this.client = client;
    this.modules = [];
    this.hooks = [];
  }

  public async installModules(modules: Module[]) {
    for (const module of modules) {
      const hooks = module.installHook();
      if (hooks) {
        this.hooks.push(hooks);
      }
    }
  }

  public async run() {
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
          for (const hook of this.hooks) {
            if (hook.mentionHook) {
              hook.mentionHook(noti.status);
            }
          }
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
