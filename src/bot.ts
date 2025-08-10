import {Entity, MegalodonInterface, NotificationType} from 'megalodon';
import BotConfig from './config';
import {Account} from 'megalodon/lib/src/entities/account';
import Module from './module';
import {InstallHookResult} from './types';

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

  public installModules(modules: Module[]) {
    this.modules = modules;
    for (const module of this.modules) {
      const hooks = module.installHook();
      if (hooks) {
        this.hooks.push(hooks);
      }
    }
  }

  public async run() {
    this.botAccount = (await this.client.getAccount(BotConfig.botID)).data;
    this.botID = this.botAccount.id;

    void this.client.userStreaming().then(stream => {
      stream.on('connect', () => this.handleConnect());
      stream.on('notification', noti => this.handleNotification(noti));
      stream.on('heartbeat', () => this.handleHeartbeat());
      stream.on('close', () => this.handleClose());
    });
  }

  private handleConnect() {
    console.log('connect');
    console.log(`bot id: ${this.botID}`);
  }

  private handleNotification(noti: Entity.Notification) {
    if (noti.type === NotificationType.Mention && noti.status) {
      for (const hook of this.hooks) {
        if (hook.mentionHook) {
          void hook.mentionHook(noti.status);
        }
      }
    }
  }

  private handleHeartbeat() {
    console.log('heartbeat');
  }

  private handleClose() {
    console.log('close');
  }
}
