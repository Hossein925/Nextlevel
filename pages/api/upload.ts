import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { NextApiRequest, NextApiResponse } from 'next';
 
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const body = request.body as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeUpload: async (pathname) => {
        // This is where you can add your own logic,
        // for example, checking if the user is authenticated.
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'audio/mpeg',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is called after the blob is uploaded to the store.
        // You can use this to update your database.
        console.log('Blob upload completed!', blob, tokenPayload);
      },
    });
 
    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: (error as Error).message });
  }
}
