import BotConfig from './config.js';
import Module from './module.js';
import {InstallHookResult} from './types.js';
import * as Misskey from 'misskey-js';
import {Connection} from 'misskey-js/streaming.js';
import ws from 'ws';

export default class FediHelperBot {
  private client: Misskey.api.APIClient;
  private modules: Module[];

  // We are certain that these two properties are set in function run()
  // and that they are not null
  private botAccount!: Misskey.Endpoints['i']['res'];
  private botID!: string;
  private streamChannel!: Connection<Misskey.Channels['main']>;

  private hooks: InstallHookResult[];

  constructor(client: Misskey.api.APIClient) {
    this.client = client;
    this.modules = [];
    this.hooks = [];
  }

  public async installModules(modules: Module[]) {
    this.modules = modules;
    for (const module of this.modules) {
      const hooks = module.installHook();
      if (hooks) {
        this.hooks.push(hooks);
      }
    }
  }

  public async run() {
    this.botAccount = await this.client.request('i', {});
    this.botID = this.botAccount.id;
    this.streamChannel = new Misskey.Stream(
      BotConfig.instanceUrl,
      {
        token: this.client.credential!,
      },
      {
        WebSocket: ws,
      }
    ).useChannel('main');

    this.streamChannel.on('signin', payload => {
      console.log('signin');
      console.log(`bot id: ${payload.id}`);
    });

    this.streamChannel.on('mention', payload => {
      if (payload.text) {
        for (const hook of this.hooks) {
          if (hook.mentionHook) {
            hook.mentionHook(payload);
          }
        }
      }
    });

    // this.client.userStreaming().then(stream => {
    //   // Listen for the 'connect' event and log a message when the stream is connected
    //   stream.on('connect', () => {
    //     console.log('connect');
    //     console.log(`bot id: ${this.botID}`);
    //   });

    //   // stream.on('update', async (status: Entity.Status) =>
    //   //   this.handleUpdate(status)
    //   // );

    //   stream.on('notification', (noti: Entity.Notification) => {
    //     if (noti.type === NotificationType.Mention && noti.status) {
    //       for (const hook of this.hooks) {
    //         if (hook.mentionHook) {
    //           hook.mentionHook(noti.status);
    //         }
    //       }
    //     }
    //   });

    //   stream.on('heartbeat', () => {
    //     console.log('heartbeat');
    //   });

    //   stream.on('close', () => {
    //     console.log('close');
    //   });
    // });
  }
}
