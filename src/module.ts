import * as Misskey from 'misskey-js';
import {InstallHookResult} from './types.js';
import autoBind from 'auto-bind';

export default abstract class Module {
  public abstract readonly name: string;

  protected botClient: Misskey.api.APIClient;

  constructor(bot: Misskey.api.APIClient) {
    this.botClient = bot;
    autoBind(this);
  }

  public abstract installHook(): InstallHookResult;

  protected log(msg: string) {
    console.log(`[${this.name}] ${msg}`);
  }
}
