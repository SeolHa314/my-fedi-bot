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

// eslint-disable-next-line node/no-unpublished-import
import botConfig from '../config.json' assert {type: 'json'};
botConfig.vertexAI.authFile = path.join(
  process.cwd(),
  botConfig.vertexAI.authFile
);

export default botConfig as BotConfig;
