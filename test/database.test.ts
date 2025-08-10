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
      aiResponse,
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
      newAiResponse,
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

  test('getMediaUrlsFromContext', () => {
    const lastChatId = 'chatGetMediaUrlsFromContext';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const mediaUrls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ];
    db.newChatContext(
      lastChatId,
      chatUserId,
      userPrompt,
      aiResponse,
      mediaUrls,
    );
    const retrievedMediaUrls = db.getMediaUrlsFromContext(lastChatId);
    expect(retrievedMediaUrls).toEqual(mediaUrls);
  });

  test('getMediaUrlsFromContext empty array', () => {
    const lastChatId = 'chatGetMediaUrlsFromContextEmpty';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    db.newChatContext(lastChatId, chatUserId, userPrompt, aiResponse);
    const retrievedMediaUrls = db.getMediaUrlsFromContext(lastChatId);
    expect(retrievedMediaUrls).toEqual([]);
  });

  test('newChatContext with media URLs', () => {
    const lastChatId = 'chatNewChatContextWithMedia';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const mediaUrls = ['https://example.com/image1.jpg'];
    const newChatId = db.newChatContext(
      lastChatId,
      chatUserId,
      userPrompt,
      aiResponse,
      mediaUrls,
    );
    const context = db.getAllChatContext(newChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
    ]);
    const retrievedMediaUrls = db.getMediaUrlsFromContext(newChatId);
    expect(retrievedMediaUrls).toEqual(mediaUrls);
  });

  test('extendChatContent with media URLs', () => {
    const lastChatId = 'testExtendWithMedia';
    const newLastChatId = 'testExtendWithMediaExtended';
    const chatUserId = 'userUnique';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const newUserPrompt = 'How are you?';
    const newAiResponse = 'I am fine';
    const initialMediaUrls = ['https://test.com/image1.jpg'];
    const newMediaUrls = [
      'https://test.com/image2.jpg',
      'https://test.com/image3.jpg',
    ];

    db.newChatContext(
      lastChatId,
      chatUserId,
      userPrompt,
      aiResponse,
      initialMediaUrls,
    );

    const extendedChatId = db.extendChatContent(
      lastChatId,
      newLastChatId,
      newUserPrompt,
      newAiResponse,
      newMediaUrls,
    );

    const context = db.getAllChatContext(extendedChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
      {role: 'user', parts: [{text: newUserPrompt}]},
      {role: 'model', parts: [{text: newAiResponse}]},
    ]);

    const retrievedMediaUrls = db.getMediaUrlsFromContext(extendedChatId);
    const expectedMediaUrls = [
      'https://test.com/image1.jpg',
      'https://test.com/image2.jpg',
      'https://test.com/image3.jpg',
    ];
    expect(retrievedMediaUrls).toEqual(expectedMediaUrls);
  });

  test('extendChatContent without media URLs', () => {
    const lastChatId = 'chatExtendChatContentNoMedia';
    const newLastChatId = 'chatExtendChatContentNoMediaExtended';
    const chatUserId = 'user1';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';
    const newUserPrompt = 'How are you?';
    const newAiResponse = 'I am fine';
    const initialMediaUrls = ['https://example.com/image1.jpg'];

    db.newChatContext(
      lastChatId,
      chatUserId,
      userPrompt,
      aiResponse,
      initialMediaUrls,
    );
    const extendedChatId = db.extendChatContent(
      lastChatId,
      newLastChatId,
      newUserPrompt,
      newAiResponse,
    );

    const context = db.getAllChatContext(extendedChatId);
    expect(context).toEqual([
      {role: 'user', parts: [{text: userPrompt}]},
      {role: 'model', parts: [{text: aiResponse}]},
      {role: 'user', parts: [{text: newUserPrompt}]},
      {role: 'model', parts: [{text: newAiResponse}]},
    ]);

    const retrievedMediaUrls = db.getMediaUrlsFromContext(extendedChatId);
    expect(retrievedMediaUrls).toEqual(initialMediaUrls);
  });

  test('extendChatContent should throw error when context not found', () => {
    const lastChatId = 'nonExistentChat';
    const newLastChatId = 'extendedChat';
    const userPrompt = 'Hello';
    const aiResponse = 'Hi there';

    expect(() => {
      db.extendChatContent(lastChatId, newLastChatId, userPrompt, aiResponse);
    }).toThrow('No chat context found');
  });

  test('getAllChatContext should throw error when context not found', () => {
    const lastChatId = 'nonExistentChat';

    expect(() => {
      db.getAllChatContext(lastChatId);
    }).toThrow('No chat context found');
  });

  test('getMediaUrlsFromContext should throw error when context not found', () => {
    const lastChatId = 'nonExistentChat';

    expect(() => {
      db.getMediaUrlsFromContext(lastChatId);
    }).toThrow('No chat context found');
  });

  test('addPermittedUser should not duplicate existing user', () => {
    const userId = 'existingUser';
    db.addPermittedUser(userId);
    db.addPermittedUser(userId); // Add same user again
    const isPermitted = db.isPermittedUser(userId);
    expect(isPermitted).toBe(true);

    // Verify user is still permitted (no duplicate insertion error)
    expect(db.isPermittedUser(userId)).toBe(true);
  });

  test('isPermittedUser should return false for non-existent user', () => {
    const userId = 'nonExistentUser';
    const isPermitted = db.isPermittedUser(userId);
    expect(isPermitted).toBe(false);
  });
});
