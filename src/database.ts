import loki from 'lokijs';
// import botConfig from './config.js';
// import path from 'path';
import {exit} from 'process';

export type PermittedUser = {
  userId: string;
};

export type ChatContext = {
  lastChatId: string;
  chattingUsers: string[];
  chats: {
    role: string;
    // postId: string;
    chatContent: string;
  }[];
};

export default class ContextDatabase {
  db: loki;

  private permittedUsers: loki.Collection<PermittedUser>;

  private chatContexts: loki.Collection<ChatContext>;

  constructor(dbPath: string) {
    // const dbPath = path.join(
    //   process.cwd(),
    //   botConfig.dbPath || 'context-database.json'
    // );
    this.db = new loki(dbPath, {
      autoload: true,
      autosave: true,
      autosaveInterval: 1000,
      autoloadCallback: err => {
        if (err) {
          console.error('Error loading database ', err);
          exit(1);
        }
      },
    });

    this.permittedUsers = this.getCollection('permittedUsers', {
      indices: ['userId'],
    });

    this.chatContexts = this.getCollection('chatContexts', {
      indices: ['lastChatId'],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getCollection(collectionName: string, opts?: any): loki.Collection {
    const collection = this.db.getCollection(collectionName);

    if (!collection) {
      return this.db.addCollection(collectionName, opts);
    } else {
      return collection;
    }
  }

  public addPermittedUser(userId: string) {
    if (!this.permittedUsers.findOne({userId: userId})) {
      this.permittedUsers.insert({
        userId: userId,
      });
    }
  }

  public newChatContext(
    lastChatId: string,
    chatUserId: string,
    userPrompt: string,
    aiResponse: string
  ) {
    this.chatContexts.insert({
      lastChatId: lastChatId,
      chattingUsers: [chatUserId],
      chats: [
        {
          role: 'user',
          chatContent: userPrompt,
        },
        {
          role: 'model',
          chatContent: aiResponse,
        },
      ],
    });
    return lastChatId;
  }

  public extendChatContent(
    lastChatId: string,
    userPrompt: string,
    aiResponse: string
  ) {
    const context = this.chatContexts.findOne({
      lastChatId: lastChatId,
    });

    if (!context) {
      throw new Error('No chat context found');
    } else {
      context.lastChatId = lastChatId;
      context.chats.push(
        {
          role: 'user',
          chatContent: userPrompt,
        },
        {
          role: 'model',
          chatContent: aiResponse,
        }
      );
      this.chatContexts.update(context);
      return lastChatId;
    }
  }

  public getAllChatContext(lastChatId: string) {
    const context = this.chatContexts.findOne({
      lastChatId: lastChatId,
    });
    const resp: {role: string; parts: {text: string}[]}[] = [];

    if (!context) {
      throw new Error('No chat context found');
    } else {
      //   return context.chats.forEach(chat => {
      //     return {role: chat.role, parts: [{text: chat.chatContent}]};
      //   });
      context.chats.forEach(chat => {
        resp.push({
          role: chat.role,
          parts: [
            {
              text: chat.chatContent,
            },
          ],
        });
      });
      return resp;
    }
  }
}
