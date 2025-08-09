import {Entity, MegalodonInterface} from 'megalodon';
import {Content, Part} from '@google/generative-ai';

// src/bot.ts
type MentionHook = (
  msg: Entity.Status
) => Promise<void | ReturnType<MegalodonInterface['postStatus']>>;
type EmojiReactionHook = (
  emojiContext: Entity.Notification
) => Promise<void | ReturnType<MegalodonInterface['createEmojiReaction']>>;

export type InstallHookResult = {
  mentionHook?: MentionHook;
  emojiReactionHook?: EmojiReactionHook;
};

// src/database.ts
export type PermittedUser = {
  userId: string;
};

export type ChatContext = {
  lastChatId: string;
  chattingUsers: string[];
  chats: Content[];
  mediaUrls: string[];
};

// src/ai.ts
export type Chat = Content;
export type PromptType = Part[];
export type MediaInlineDataType = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

// src/config.ts
export type BotConfig = {
  instanceUrl: string;
  instanceToken: string;
  botID: string;
  vertexAI: {
    projectName: string;
    projectLocation: string;
    authFile: string;
    apiKey: string;
  };
  dbPath: string;
};
