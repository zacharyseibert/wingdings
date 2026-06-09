import 'dotenv/config';
import express from 'express';
import { slackApp, receiver } from './slack/app.js';
import apiRouter from './api/router.js';

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = [
  'https://wingdings-seven.vercel.app',
  'https://wings.hwffl.com',
  'http://localhost:3000',
];

// JSON body parsing
receiver.router.use(express.json());

// CORS
receiver.router.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

receiver.router.use('/api', apiRouter);

(async () => {
  await slackApp.start(PORT);
  console.log(`⚡ Wingdings bot running on port ${PORT}`);
})();
