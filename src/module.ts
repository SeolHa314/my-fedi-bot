import FediHelperBot, {InstallHookResult} from './bot.js';

export default abstract class Module {
  public abstract readonly name: string;

  protected botClient: FediHelperBot;

  constructor(bot: FediHelperBot) {
    this.botClient = bot;
  }

  public abstract installHook(): InstallHookResult;

  protected log(msg: string) {
    console.log(`[${this.name}] ${msg}`);
  }
}
