import 'dotenv/config';
import { slackApp, receiver } from './slack/app.js';
import apiRouter from './api/router.js';

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Attach CORS headers for the frontend
receiver.router.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Mount the REST API on the same Express app as Bolt
receiver.router.use('/api', apiRouter);

(async () => {
  await slackApp.start(PORT);
  console.log(`⚡ Wingdings bot running on port ${PORT}`);
})();
