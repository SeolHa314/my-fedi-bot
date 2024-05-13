import {expect, test, describe, beforeEach, afterEach} from 'bun:test';
import ContextDatabase from 'database';
import {unlink, exists} from 'node:fs/promises';

describe('ContextDatabase', () => {
  let db: ContextDatabase;
  const dbPath = 'chat.testdb.json';

  beforeEach(async () => {
    db = new ContextDatabase(dbPath);
    await new Promise(t => setTimeout(t, 50)); // Wait for the database to load
  });

  afterEach(async () => {
    db.db.close();
    if (await exists(dbPath)) {
      await unlink(dbPath);
    }
  });

  test('addPermittedUser', () => {
    const userId = 'testUser';
    db.addPermittedUser(userId);
    expect(db.isPermittedUser(userId)).toBe(true);
  });

  test('isPermittedUser', () => {
    const userId = 'testUser';
    db.addPermittedUser(userId);
    const isPermitted = db.isPermittedUser(userId);
    expect(isPermitted).toBe(true);
  });

  test('newChatContext', () => {
    const lastChatId = 'chatNewChatContext';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const newChatId = db.newChatContext(
      lastChatId,
      chatUserId,
      userPrompt,
      aiResponse
    );
    const context = db.getAllChatContext(newChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
    ]);
  });

  test('extendChatContent', () => {
    const lastChatId = 'chatExtendChatContent';
    const newLastChatId = 'chatExtendChatContentExtended';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const newUserPrompt = 'How are you?';
    const newAiResponse = 'I am fine';
    db.newChatContext(lastChatId, chatUserId, userPrompt, aiResponse);
    const extendedChatId = db.extendChatContent(
      lastChatId,
      newLastChatId,
      newUserPrompt,
      newAiResponse
    );
    const context = db.getAllChatContext(extendedChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
      {role: 'user', parts: [{text: newUserPrompt}]},
      {role: 'model', parts: [{text: newAiResponse}]},
    ]);
  });

  test('existsChatContext', () => {
    const lastChatId = 'chatExistsChatContext';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    db.newChatContext(lastChatId, chatUserId, userPrompt, aiResponse);
    const exists = db.existsChatContext(lastChatId);
    expect(exists).toBe(true);
  });

  test('getAllChatContext', () => {
    const lastChatId = 'chatGetAllChatContext';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    db.newChatContext(lastChatId, chatUserId, userPrompt, aiResponse);
    const context = db.getAllChatContext(lastChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
    ]);
  });
});
