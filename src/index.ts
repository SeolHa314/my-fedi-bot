import generator from 'megalodon';
import FediHelperBot from './bot';
import path from 'path';

import BotConfig from './config';
import AichatModule from './modules/aichat';
import ContextDatabase from './database';
import AIService from './ai';

const BASE_URL = BotConfig.instanceUrl;
const access_token = BotConfig.instanceToken;

const client = generator('pleroma', BASE_URL, access_token);

const dbPath = path.join(
  process.cwd(),
  BotConfig.dbPath || 'context-database.json',
);
const contextDB = new ContextDatabase(dbPath);
const aiService = new AIService(contextDB);

const bot = new FediHelperBot(client);
bot.installModules([new AichatModule(client, contextDB, aiService)]);
void (async function () {
  await bot.run();
})();
