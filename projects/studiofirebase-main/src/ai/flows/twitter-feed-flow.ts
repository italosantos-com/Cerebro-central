// server-only utilities: no "use server" directive so we can export schemas/types

import { z } from 'zod';
import { ai } from '../genkit';
import { twitterFlow } from './twitter-flow';

// Schema for the Twitter media item
export const TweetMediaSchema = z.object({
    media_key: z.string(),
    type: z.enum(['photo', 'video', 'animated_gif']),
    url: z.string(),
    preview_image_url: z.string().optional(),
    variants: z.any().optional()
});

// Schema for a tweet with media
export const TweetWithMediaSchema = z.object({
    id: z.string(),
    text: z.string().nullable(),
    media: z.array(TweetMediaSchema),
    created_at: z.string(),
    username: z.string(),
    profile_image_url: z.string().optional(),
    isRetweet: z.boolean().optional(),
    widget_html: z.string().optional()
});

// Export the interfaces
export type TweetWithMedia = z.infer<typeof TweetWithMediaSchema>;
export type TweetMedia = z.infer<typeof TweetMediaSchema>;

export async function fetchTwitterFeed({ username = 'severepics', maxResults = 50 }: { username?: string; maxResults?: number } = {}) {
    try {

        const result = await twitterFlow.run({
            username,
            mediaType: 'photos',
            maxResults
        });

        return result;
    } catch (error: any) {
        console.error('Error fetching Twitter feed:', error);
        throw new Error(error.message || 'Failed to fetch Twitter feed');
    }
}