import 'dotenv/config';
import express from 'express';
import { slackApp, receiver } from './slack/app.js';
import apiRouter from './api/router.js';

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// JSON body parsing
receiver.router.use(express.json());

// CORS
receiver.router.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
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
