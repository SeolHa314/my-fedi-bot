import generator from 'megalodon';
import FediHelperBot from './bot';

import BotConfig from './config';
import AichatModule from './modules/aichat';

const BASE_URL = BotConfig.instanceUrl;
const access_token = BotConfig.instanceToken;

const client = generator('pleroma', BASE_URL, access_token);

const bot = new FediHelperBot(client);
bot.installModules([new AichatModule(client)]);
(async function () {
  bot.run();
})();
