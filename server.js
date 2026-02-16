require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Test connexion base de données
db.getConnection()
  .then(connection => {
    console.log('✅ Connexion MySQL réussie');
    connection.release();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur connexion MySQL:', err);
    process.exit(1);
  });