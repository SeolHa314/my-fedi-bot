import {Entity, MegalodonInterface} from 'megalodon';

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
  chats: {
    role: 'user' | 'model';
    // postId: string;
    chatContent: string;
    chatImageUrls?: string[];
  }[];
};

// src/ai.ts
export type PromptType = {
  contents: {
    role: 'user' | 'model';
    parts: (
      | {
          text: string;
        }
      | {
          inlineData: {
            data: string;
            mimeType: string;
          };
        }
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
