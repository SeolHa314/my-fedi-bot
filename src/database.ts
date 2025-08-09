import loki from 'lokijs';
import {PermittedUser, ChatContext, Chat} from './types';

export default class ContextDatabase {
  db: loki;

  private permittedUsers!: loki.Collection<PermittedUser>;

  private chatContexts!: loki.Collection<ChatContext>;

  constructor(dbPath: string) {
    this.db = new loki(dbPath, {
      autoload: true,
      autosave: true,
      autosaveInterval: 1000,
      autoloadCallback: err => {
        this.permittedUsers = this.getCollection('permittedUsers', {
          indices: ['userId'],
        });

        this.chatContexts = this.getCollection('chatContexts', {
          indices: ['lastChatId'],
        });

        if (err) {
          throw new Error(err);
        }
      },
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

  public isPermittedUser(userId: string) {
    return !!this.permittedUsers.findOne({userId: userId});
  }

  public newChatContext(
    lastChatId: string,
    chatUserId: string,
    userPrompt: string,
    aiResponse: string,
    chatImageUrls?: string[]
  ) {
    this.chatContexts.insert({
      lastChatId: lastChatId,
      chattingUsers: [chatUserId],
      chats: [
        {
          role: 'user',
          parts: [{text: userPrompt}],
        },
        {
          role: 'model',
          parts: [{text: aiResponse}],
        },
      ],
      mediaUrls: chatImageUrls || [],
    });

    return lastChatId;
  }

  public extendChatContent(
    lastChatId: string,
    newLastChatId: string,
    userPrompt: string,
    aiResponse: string,
    chatImageUrls?: string[]
  ) {
    const context = this.chatContexts.findOne({
      lastChatId: lastChatId,
    });

    if (!context) {
      throw new Error('No chat context found');
    } else {
      context.lastChatId = newLastChatId;
      const userChat: Chat = {
        role: 'user',
        parts: [{text: userPrompt}],
      };
      if (chatImageUrls && chatImageUrls.length > 0) {
        context.mediaUrls.push(...chatImageUrls);
      }
      context.chats.push(userChat, {
        role: 'model',
        parts: [{text: aiResponse}],
      });
      this.chatContexts.update(context);
      return newLastChatId;
    }
  }

  public existsChatContext(lastChatId: string) {
    return !!this.chatContexts.findOne({
      lastChatId: lastChatId,
    });
  }

  public getAllChatContext(lastChatId: string) {
    const context = this.chatContexts.findOne({
      lastChatId: lastChatId,
    });

    if (!context) {
      throw new Error('No chat context found');
    } else {
      return context.chats;
    }
  }

  public getMediaUrlsFromContext(lastChatId: string) {
    const context = this.chatContexts.findOne({
      lastChatId: lastChatId,
    });

    if (!context) {
      throw new Error('No chat context found');
    } else {
      return context.mediaUrls || [];
    }
  }
}
