import path from 'path';
import {BotConfig} from './types';

import configData from '../config.json' assert {type: 'json'};

function loadConfig(): BotConfig {
  const config = configData as BotConfig;
  config.vertexAI.authFile = path.join(process.cwd(), config.vertexAI.authFile);
  return config;
}

export default loadConfig();
