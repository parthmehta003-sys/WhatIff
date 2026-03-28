import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from "groq-sdk";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const isValidKey = (key: string | undefined) => 
    key && key !== 'undefined' && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY' && key !== 'MY_GROQ_API_KEY';

  // AI Insight API Route
  app.post(['/api/ai/insight', '/api/ai/insight/'], async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'A valid prompt is required.' });
    }

    // Detect keys
    const groqKey = process.env.GROQ_API_KEY;

    if (!isValidKey(groqKey)) {
      return res.status(500).json({ 
        error: 'AI service is not configured.',
        message: 'Please ensure GROQ_API_KEY is set in your Secrets panel.'
      });
    }

    let lastError: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    const modelName = 'llama-3.3-70b-versatile';

    while (attempts < maxAttempts) {
      try {
        console.log(`Attempting insight generation with Groq ${modelName} (Attempt ${attempts + 1})...`);
        const groq = new Groq({ apiKey: groqKey! });
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are a financial analyst. Analyze the provided data and return exactly 3 distinct, concise insights. Format your response as a JSON object with an 'insights' array containing 3 strings. Each string should be 1-2 sentences. Example: {\"insights\": [\"Insight 1\", \"Insight 2\", \"Insight 3\"]}. Do not include any markdown or extra text."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: modelName,
          temperature: 0.4,
          max_tokens: 1024,
          response_format: { type: "json_object" }
        });

        const text = completion.choices[0]?.message?.content || '';
        
        if (!text || text.trim().length < 10) {
          throw new Error(`Empty or too short response from ${modelName}`);
        }

        let parsedInsights: string[] = [];
        try {
          let cleanedText = text.trim();
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedText = jsonMatch[0];
          }

          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '').trim();
          }
          
          try {
            const parsed = JSON.parse(cleanedText);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.insights)) {
              parsedInsights = parsed.insights.filter((i: any) => typeof i === 'string' && i.trim().length > 5);
            } else if (Array.isArray(parsed)) {
              parsedInsights = parsed.filter((i: any) => typeof i === 'string' && i.trim().length > 5);
            } else if (parsed && typeof parsed === 'object' && parsed.text) {
              parsedInsights = [parsed.text];
            }
          } catch (jsonErr) {
            console.warn(`JSON parse failed for ${modelName}. Raw text: "${text.substring(0, 200)}..."`);
            const stringMatches = cleanedText.match(/"((?:[^"\\]|\\.)*)"/g);
            if (stringMatches && stringMatches.length > 0) {
              parsedInsights = stringMatches
                .map(s => s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n'))
                .filter(s => s !== 'insights' && s.trim().length > 15);
            }
            
            if (parsedInsights.length < 3) {
              const lastQuoteIndex = cleanedText.lastIndexOf('"');
              if (lastQuoteIndex !== -1) {
                const textBefore = cleanedText.slice(0, lastQuoteIndex);
                const quoteCountBefore = (textBefore.match(/"/g) || []).length;
                if (quoteCountBefore % 2 === 0) {
                  const unclosedText = cleanedText.slice(lastQuoteIndex + 1).trim();
                  if (unclosedText.length > 15) {
                    parsedInsights.push(unclosedText);
                  }
                }
              }
            }

            if (parsedInsights.length === 0) {
              const lines = cleanedText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 20);
              if (lines.length >= 1) {
                parsedInsights = lines.map(l => l.replace(/^["'\[\s\d\.\-\*]+|["'\]\s,]+$/g, '').trim());
              }
            }
            
            if (parsedInsights.length === 0) throw jsonErr;
          }
        } catch (e) {
          console.error(`Failed to parse AI response from ${modelName}. Raw text:`, text);
          const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 10);
          if (paragraphs.length >= 1) {
            parsedInsights = paragraphs;
          } else {
            const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g);
            if (sentences && sentences.length >= 1) {
              parsedInsights = sentences;
            } else {
              throw new Error(`Invalid response format from ${modelName}`);
            }
          }
        }

        if (parsedInsights.length < 1) {
          throw new Error(`AI returned no valid insights. Please try again.`);
        }

        const finalInsights = parsedInsights.slice(0, 3);
        const joinedText = finalInsights.join('\n');

        return res.json({
          candidates: [{
            content: { parts: [{ text: joinedText }] },
            finishReason: 'STOP',
          }]
        });
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        const isRetryable = 
          error.status === 'UNAVAILABLE' || 
          error.message?.includes('503') || 
          error.message?.includes('high demand') ||
          error.message?.includes('Empty or too short response') ||
          error.message?.includes('Empty response') ||
          error.message?.includes('Invalid response format') ||
          error.message?.includes('Invalid JSON') ||
          error.message?.includes('Rate limit');

        if (isRetryable && attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000;
          console.warn(`Retryable error (Attempt ${attempts}): ${error.message}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error(`Error with ${modelName} after ${attempts} attempts:`, error.message);

        if (error.message?.includes('SAFETY') || error.status === 'SAFETY') {
          return res.status(400).json({
            candidates: [{
              finishReason: 'SAFETY',
              content: { parts: [{ text: '' }] },
            }]
          });
        }

        if (error.message?.includes('API key not valid') || error.status === 'INVALID_ARGUMENT' || error.status === 401) {
          return res.status(401).json({ error: 'AI service authentication failed.' });
        }

        return res.status(502).json({ 
          error: 'AI service is temporarily unavailable.',
          details: lastError?.message || 'Unknown error'
        });
      }
    }
  });

  // AI Chat API Route
  const chatCache = new Map<string, string>();
  const sessionLimits = new Map<string, number>();
  const MAX_MESSAGES_PER_SESSION = 20; // Increased limit

  app.post(['/api/ai/chat', '/api/ai/chat/'], async (req, res) => {
    const { message, context, sessionId, systemPrompt } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Make sessionId optional for now to avoid breaking frontend
    const effectiveSessionId = sessionId || 'default-session';

    // Check session limit
    const currentCount = sessionLimits.get(effectiveSessionId) || 0;
    if (currentCount >= MAX_MESSAGES_PER_SESSION) {
      return res.status(429).json({ 
        error: 'Limit reached', 
        message: 'You’ve reached the limit for this session. Please start a new chat.' 
      });
    }

    // Check cache
    const cacheKey = JSON.stringify({ message, context, systemPrompt });
    if (chatCache.has(cacheKey)) {
      console.log('Returning cached chat response');
      return res.json({ content: chatCache.get(cacheKey) });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!isValidKey(groqKey)) {
      return res.status(500).json({ error: 'Groq API key is not configured.' });
    }

    try {
      const groq = new Groq({ apiKey: groqKey! });
      const modelName = 'llama-3.3-70b-versatile';
      
      const defaultSystemPrompt = `You are a financial explainer, not a financial advisor.

Do NOT give advice.
Do NOT recommend actions.
Do NOT suggest what the user should do.

Only explain the numbers provided.

If asked for advice:
'I can help explain the numbers, but I cannot provide financial advice.'

Keep responses simple, short, and clear.

Context:
${JSON.stringify(context)}`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt || defaultSystemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        model: modelName,
        temperature: 0.4,
        max_tokens: 1024
      });

      const responseText = completion.choices[0]?.message?.content || 'I am unable to process your request at this time.';
      
      // Update cache and session limit
      chatCache.set(cacheKey, responseText);
      sessionLimits.set(effectiveSessionId, currentCount + 1);

      // Return 'content' to match frontend expectation
      return res.json({ content: responseText });
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      return res.status(502).json({ error: 'AI service error', message: error.message });
    }
  });

  // Catch-all for API routes to return JSON instead of HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Global error handler for API routes
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? undefined : false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('/sitemap.xml', (req, res) => {
      res.setHeader('Content-Type', 'application/xml');
      res.sendFile(path.join(__dirname, 'dist', 'sitemap.xml'));
    });

    app.get('/robots.txt', (req, res) => {
      res.setHeader('Content-Type', 'text/plain');
      res.sendFile(path.join(__dirname, 'dist', 'robots.txt'));
    });

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
