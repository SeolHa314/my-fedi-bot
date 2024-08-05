import * as Misskey from 'misskey-js';
import FediHelperBot from './bot.js';

import BotConfig from './config.js';
import AichatModule from './modules/aichat.js';

const BASE_URL = BotConfig.instanceUrl;
const access_token = BotConfig.instanceToken;

const client = new Misskey.api.APIClient({
  origin: BASE_URL,
  credential: access_token,
});

const bot = new FediHelperBot(client);
bot.installModules([new AichatModule(client)]);
(async function () {
  bot.run();
})();
