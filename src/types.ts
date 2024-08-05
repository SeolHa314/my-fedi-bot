import {Endpoints} from 'misskey-js/autogen/endpoint.js';
import {Note, Notification} from 'misskey-js/entities.js';

// src/bot.ts
type MentionHook = (
  msg: Note
) => Promise<void | Endpoints['notes/create']['res']>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmojiReactionHook = (emojiContext: Notification) => Promise<void | any>;

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
  chats: {
    role: 'user' | 'model';
    // postId: string;
    chatContent: string;
    chatImageUrls?: string[];
  }[];
};

// src/ai.ts
export type MediaInlineDataType = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

export type PromptType = {
  contents: {
    role: 'user' | 'model';
    parts: (
      | {
          text: string;
        }
      | MediaInlineDataType
    )[];
  }[];
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
  };
  dbPath: string;
};
