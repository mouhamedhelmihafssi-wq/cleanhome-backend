const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
const reservationRoutes = require('./routes/reservation.routes');
app.use('/api/reservations', reservationRoutes);
const candidatureRoutes = require('./routes/candidature.routes');
app.use('/api/candidatures', candidatureRoutes);
const evaluationRoutes = require('./routes/evaluation.routes');
app.use('/api/evaluations', evaluationRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🧹 Bienvenue sur l\'API CleanHome',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth'
    }
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

module.exports = app;