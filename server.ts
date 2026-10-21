/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '60mb' }));

// Server-side GoogleGenAI initialization with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instruction for the Traffic RL Copilot
const COPILOT_SYSTEM_INSTRUCTION = `You are Q-Traffic Copilot, an expert AI Traffic Systems Engineer and Reinforcement Learning Researcher specializing in urban signal optimization, Markov Decision Processes (MDP), Bellman temporal-difference learning, Deep Q-Networks (DQN), and smart city mobility.
Provide clear, mathematically grounded, and practical answers.
When Google Search is used, synthesize real-world municipal transportation studies, Department of Transportation (DOT) standards (such as FHWA and NEMA TS2), and current academic research.`;

// 1. Multi-turn Chat API with Google Search Grounding and model routing
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, model, useSearch } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    // Model selection based on user brief:
    // - gemini-4-argon: for particularly complex tasks
    // - gemini-3.8-flash: for general tasks and Google Search grounding
    // - gemini-3.1-flash-lite: for fast real-time tasks
    let selectedModel = 'gemini-3.8-flash';
    if (model === 'gemini-4-argon' || model === 'argon') {
      selectedModel = 'gemini-4-argon';
    } else if (model === 'gemini-3.1-flash-lite' || model === 'lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else {
      selectedModel = 'gemini-3.8-flash';
    }

    // Format conversation history for @google/genai SDK
    const formattedContents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'model') {
          formattedContents.push({
            role: msg.role,
            parts: [{ text: msg.text || '' }],
          });
        }
      }
    }

    // Append current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Configure tools: Google Search Grounding when requested or for gemini-3.8-flash search queries
    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
    };

    if (tools.length > 0) {
      config.tools = tools;
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config,
      });
    } catch (modelErr: any) {
      // If gemini-4-argon fails (e.g. due to paid key requirement), fall back gracefully to gemini-3.8-flash
      if (selectedModel === 'gemini-4-argon') {
        console.warn('gemini-4-argon unavailable, falling back to gemini-3.8-flash:', modelErr.message);
        selectedModel = 'gemini-3.8-flash';
        response = await ai.models.generateContent({
          model: selectedModel,
          contents: formattedContents,
          config,
        });
      } else {
        throw modelErr;
      }
    }

    const responseText = response.text || '';
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    // Extract search query details and search entry point if available
    let searchSources: any[] = [];
    if (groundingMetadata?.groundingChunks) {
      searchSources = groundingMetadata.groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({
          title: c.web.title || c.web.uri,
          url: c.web.uri,
        }));
    }

    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    res.json({
      text: responseText,
      model: selectedModel,
      grounding: {
        sources: searchSources,
        queries: webSearchQueries,
        searchEntryPoint: groundingMetadata?.searchEntryPoint?.renderedContent || null,
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API.',
    });
  }
});

// 2. Video Generation API (Animate photo into video using gemini-omni-1.1-flash via Interactions API)
app.post('/api/video/animate', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, prompt, aspectRatio } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    // Strip base64 data prefix if included (e.g. "data:image/png;base64,")
    const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
    const cleanMimeType = mimeType || 'image/png';
    const targetAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
    const motionPrompt =
      prompt ||
      'Cinematic aerial video of this urban traffic intersection as signal lights change and vehicles smoothly accelerate and turn along asphalt lanes.';

    // Video generation via gemini-omni-1.1-flash using Interactions API
    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: [
          {
            type: 'image',
            mime_type: cleanMimeType,
            data: cleanBase64,
          },
          {
            type: 'text',
            text: motionPrompt,
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: targetAspectRatio,
          duration: '5s',
          resolution: '720p',
        },
      },
      { timeout: 300000 } // 5-minute timeout for video rendering
    );

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const videoMime = videoPart.mime_type || 'video/mp4';
      const videoDataUrl = `data:${videoMime};base64,${videoPart.data}`;
      res.json({
        videoUrl: videoDataUrl,
        aspectRatio: targetAspectRatio,
        model: 'gemini-omni-1.1-flash',
      });
      return;
    }

    if (videoPart && (videoPart as any).uri) {
      res.json({
        videoUrl: (videoPart as any).uri,
        aspectRatio: targetAspectRatio,
        model: 'gemini-omni-1.1-flash',
      });
      return;
    }

    res.status(500).json({
      error: 'Video generation completed, but no video payload was returned.',
    });
  } catch (error: any) {
    console.error('Video Generation Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate video with gemini-omni-1.1-flash.',
    });
  }
});

// Server boot and Vite middleware mounting
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Q-Traffic full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
