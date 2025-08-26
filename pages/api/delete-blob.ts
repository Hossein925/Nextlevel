import { del } from '@vercel/blob';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
 
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url parameter is required and must be a string' });
  }
 
  try {
    await del(url);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting blob:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
