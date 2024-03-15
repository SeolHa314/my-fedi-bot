import generator from 'megalodon';
import FediHelperBot from './bot.js';

import BotConfig from './config.js';

const BASE_URL = BotConfig.instanceUrl;
const access_token = BotConfig.instanceToken;

const client = generator.default('pleroma', BASE_URL, access_token);

const bot = new FediHelperBot(client);

bot.run();
