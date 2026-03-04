'use server';

import { twitterFlow, type TwitterMediaInput } from '@/ai/flows/twitter-flow';

export async function getTwitterMedia(input: TwitterMediaInput) {
  try {
    const result = await twitterFlow.run(input);
    return result;
  } catch (error: any) {
    console.error('Error executing twitterFlow:', error);
    throw new Error(error.message || 'Failed to fetch Twitter media', { cause: error });
  }
}
