import { createChatCompletion } from '../client';
import { fetchTimeout } from '@utils/fetch/fetch';

jest.mock('@utils/fetch/fetch', () => ({
  fetchTimeout: jest.fn(),
}));

const mockedFetchTimeout = fetchTimeout as jest.MockedFunction<
  typeof fetchTimeout
>;

const config = {
  baseUrl: 'https://api.example.com/v1/',
  apiKey: 'secret-key',
  model: 'test-model',
};

const response = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response);

describe('createChatCompletion', () => {
  it('posts to the chat completions endpoint and returns the content', async () => {
    mockedFetchTimeout.mockResolvedValue(
      response({ choices: [{ message: { content: '  Recap text  ' } }] }),
    );

    const result = await createChatCompletion(config, [
      { role: 'user', content: 'hi' },
    ]);

    expect(result).toBe('Recap text');
    expect(mockedFetchTimeout).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key',
        }),
      }),
      expect.any(Number),
    );
  });

  it('throws with the status code on non-OK responses', async () => {
    mockedFetchTimeout.mockResolvedValue(response('unauthorized', false, 401));

    await expect(createChatCompletion(config, [])).rejects.toThrow('401');
  });

  it('throws when the response body is not JSON', async () => {
    mockedFetchTimeout.mockResolvedValue(response('not json'));

    await expect(createChatCompletion(config, [])).rejects.toThrow(
      'non-JSON response',
    );
  });

  it('throws when the response has no content', async () => {
    mockedFetchTimeout.mockResolvedValue(
      response({ choices: [{ message: { content: '   ' } }] }),
    );

    await expect(createChatCompletion(config, [])).rejects.toThrow('empty');
  });

  it('rejects when the base URL is missing', async () => {
    await expect(
      createChatCompletion({ ...config, baseUrl: '  ' }, []),
    ).rejects.toThrow('base URL');
  });

  it('rejects when the model is missing', async () => {
    await expect(
      createChatCompletion({ ...config, model: '' }, []),
    ).rejects.toThrow('model');
  });
});
