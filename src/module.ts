import {MegalodonInterface} from 'megalodon';
import {InstallHookResult} from './types';
import autoBind from 'auto-bind';

export default abstract class Module {
  public abstract readonly name: string;

  protected botClient: MegalodonInterface;

  constructor(bot: MegalodonInterface) {
    this.botClient = bot;
    autoBind(this);
  }

  public abstract installHook(): InstallHookResult;

  protected log(msg: string) {
    console.log(`[${this.name}] ${msg}`);
  }
}
