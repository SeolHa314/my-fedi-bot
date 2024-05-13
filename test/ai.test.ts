import {unlink, exists} from 'node:fs/promises';
import AIService from '../src/ai';
import ContextDatabase from '../src/database';
import {describe, beforeEach, it, expect, afterEach} from 'bun:test';

describe('AIService', () => {
  let aiService: AIService;
  let contextDB: ContextDatabase;
  const dbPath = 'chat.testdb.json';

  beforeEach(async () => {
    contextDB = new ContextDatabase(dbPath);
    await new Promise(t => setTimeout(t, 50)); // Wait for the database to load
    aiService = new AIService(contextDB);
  });

  afterEach(async () => {
    contextDB.db.close();
    if (await exists(dbPath)) {
      await unlink(dbPath);
    }
  });

  it('should generate AI response', async () => {
    const input = 'Hello, how are you?';
    const response = await aiService.genAIResponse(input);
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
  });

  it('should generate AI response from chat ID', async () => {
    const input = 'Hello, how are you?';
    const lastChatId = '12345';
    const chatUserId = 'user1';
    const response = await aiService.genAIResponse(input);

    contextDB.newChatContext(lastChatId, chatUserId, input, response);
    const newUserPrompt = 'Who made you?';

    const newAiResponse = await aiService.genAIResponseFromChatId(
      newUserPrompt,
      lastChatId
    );
    expect(newAiResponse).toBeDefined();
    expect(typeof newAiResponse).toBe('string');
  });
});
