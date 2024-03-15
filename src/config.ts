import path from 'path';
type BotConfig = {
  instanceUrl: string;
  instanceToken: string;
  botID: string;
  vertexAI: {
    projectName: string;
    projectLocation: string;
    authFile: string;
  };
};

import botConfig from '../config.json' assert {type: 'json'};
botConfig.vertexAI.authFile = path.join(
  process.cwd(),
  botConfig.vertexAI.authFile
);
console.log('authfile: ' + botConfig.vertexAI.authFile);
export default botConfig as BotConfig;
