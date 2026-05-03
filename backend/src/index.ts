import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();

// --- 1. CORS CONFIGURATION ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloccato dalle policy CORS'));
    }
  },
  credentials: true 
}));

app.use(express.json());

// --- 2. MOUNT API ROUTES ---
app.use('/api', apiRoutes);

// --- 3. SERVER INITIALIZATION ---
const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;