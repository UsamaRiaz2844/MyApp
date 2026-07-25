require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const initSockets = require('./sockets');

const app = express();
app.set('trust proxy', 1); // behind Render/other proxy
const server = http.createServer(app);

// CLIENT_ORIGIN may be a comma-separated list of exact origins, or "*"
// (or empty) to allow any origin. For this personal app auth is via bearer
// token in the Authorization header (no cookies), so allowing any origin is
// safe and removes the frontend/backend URL chicken-and-egg during setup.
const rawOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowAllOrigins = rawOrigins.length === 0 || rawOrigins.includes('*');
const corsOptions = allowAllOrigins
  ? { origin: true, credentials: false }
  : { origin: rawOrigins, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());

// Root + health routes — handy for uptime pingers (e.g. UptimeRobot) that
// keep a free Render instance from sleeping.
app.get('/', (req, res) => res.json({ ok: true, service: 'pronto', ts: Date.now() }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// JSON 404 + error handlers so clients always get JSON, never HTML.
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

const io = new Server(server, {
  cors: corsOptions,
});
initSockets(io);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Pronto server listening on port ${PORT}`);
      console.log(
        allowAllOrigins
          ? 'CORS: allowing all origins'
          : `CORS: allowing ${rawOrigins.join(', ')}`
      );
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
