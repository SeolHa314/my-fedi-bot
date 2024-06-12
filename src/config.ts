import path from 'path';
import {BotConfig} from 'types';

// eslint-disable-next-line node/no-unpublished-import
import botConfig from '../config.json' assert {type: 'json'};
botConfig.vertexAI.authFile = path.join(
  process.cwd(),
  botConfig.vertexAI.authFile
);

export default botConfig as BotConfig;
