
// @ts-ignore
import type { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import formidable from 'formidable';
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';
// @ts-ignore
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || 'YOUR_API_KEY_HERE';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const kSupportedList: Record<string, [string, string]> = {
  png: ['image/png', 'image_url'],
  jpg: ['image/jpeg', 'image_url'],
  jpeg: ['image/jpeg', 'image_url'],
  webp: ['image/webp', 'image_url'],
  bmp: ['image/bmp', 'image_url'],
  gif: ['image/gif', 'image_url'],
  tiff: ['image/tiff', 'image_url'],
  tif: ['image/tiff', 'image_url'],
  avif: ['image/avif', 'image_url'],
  heic: ['image/heic', 'image_url']
};

function getExtension(filename: string) {
  return path.extname(filename).slice(1).toLowerCase();
}

function mimeType(ext: string) {
  return kSupportedList[ext][0];
}

function mediaType(ext: string) {
  return kSupportedList[ext][1];
}

function encodeMediaBase64(filePath: string) {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });
    const file = files.image as formidable.File;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });
    const ext = getExtension(file.originalFilename || file.filepath);
    if (!(ext in kSupportedList)) return res.status(400).json({ error: 'Unsupported file type' });
    const base64 = encodeMediaBase64(file.filepath);
    const prompt =
      'Analyze the provided crop image and provide the following:\n' +
      '1. Name of the crop.\n' +
      '2. Grading (choose one: Premium, Excellent, Good, Fair, Poor).\n' +
      '3. A 2-3 line summary describing the crop quality and any notable features.';
    const content = [
      { type: 'text', text: prompt },
      {
        type: mediaType(ext),
        [mediaType(ext)]: {
          url: `data:${mimeType(ext)};base64,${base64}`,
        },
      },
    ];
    const messages = [
      { role: 'system', content: '/think' },
      { role: 'user', content },
    ];
    const payload = {
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages,
      stream: false,
      model: 'nvidia/nemotron-nano-12b-v2-vl',
    };
    const response = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error });
    }
    const data: any = await response.json();
    // Try to extract structured info from the response
    let text = '';
    if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      text = data.choices[0].message.content;
    } else if (typeof data === 'object' && data !== null) {
      text = JSON.stringify(data);
    }
    // Simple parsing (improve as needed)
    const cropName = /Name of the crop\.?[:\-]?\s*(.*)/i.exec(text)?.[1]?.split('\n')[0] || '';
    const grade = /Grading.*[:\-]?\s*(Premium|Excellent|Good|Fair|Poor)/i.exec(text)?.[1] || '';
    const summary = /summary.*[:\-]?\s*([\s\S]*)/i.exec(text)?.[1]?.split('\n')[0] || text;
    res.json({ cropName, grade, summary });
  });
}

export default handler;
