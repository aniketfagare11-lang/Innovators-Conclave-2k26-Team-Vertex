const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ambulancesRouter = require('./routes/ambulances');
const hospitalsRouter = require('./routes/hospitals');
const routeRouter = require('./routes/route');
const aiDecisionRouter = require('./routes/aiDecision');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173']
  : '*';

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'LifeLine AI Backend', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/ambulances', ambulancesRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/calculate-route', routeRouter);
app.use('/api/ai-decision', aiDecisionRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚑 LifeLine AI Backend running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   GET  /api/ambulances?lat=&lng=`);
  console.log(`   GET  /api/hospitals`);
  console.log(`   POST /api/calculate-route`);
  console.log(`   POST /api/ai-decision\n`);
});
