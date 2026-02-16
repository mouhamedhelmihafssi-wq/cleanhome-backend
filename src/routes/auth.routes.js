const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/register/client', authController.registerClient);
router.post('/register/nettoyeur', authController.registerNettoyeur);
router.post('/login', authController.login);

// Routes protégées
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;