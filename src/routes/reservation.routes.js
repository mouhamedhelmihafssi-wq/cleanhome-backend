const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken } = require('../middlewares/auth.middleware');
const db = require('../config/database');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CLIENT
router.post('/', reservationController.createReservation);
router.get('/my-reservations', reservationController.getMyReservations);
router.put('/:id/cancel', reservationController.cancelReservation);

// Routes NETTOYEUR
router.get('/available', reservationController.getAvailableReservations);
router.get('/assigned', reservationController.getMyAssignedReservations);

// GET /api/reservations/nettoyeur — missions du nettoyeur connecté
router.get('/nettoyeur', async (req, res) => {
  try {
    const nettoyeur_id = req.user.id;
    const [missions] = await db.query(
      `SELECT r.*, c.nom as client_nom, c.prenom as client_prenom,
              c.telephone as client_telephone, c.email as client_email
       FROM reservations r
       JOIN clients c ON r.client_id = c.id
       WHERE r.nettoyeur_id = ?
       ORDER BY r.date_service DESC`,
      [nettoyeur_id]
    );
    res.status(200).json({
      success: true,
      data: missions
    });
  } catch (error) {
    console.error('Erreur récupération missions nettoyeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des missions'
    });
  }
});

// Voir MES réservations (client)
router.get('/mes-reservations', async (req, res) => {
  try {
    const client_id = req.user.id;

    const [reservations] = await db.query(
      `SELECT 
        r.*,
        n.nom as nettoyeur_nom,
        n.prenom as nettoyeur_prenom,
        n.telephone as nettoyeur_telephone,
        n.photo_profil as nettoyeur_photo
      FROM reservations r
      LEFT JOIN nettoyeurs n ON r.nettoyeur_id = n.id
      WHERE r.client_id = ?
      ORDER BY r.date_service DESC`,
      [client_id]
    );

    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations'
    });
  }
});

// Voir MES missions (nettoyeur)
router.get('/mes-missions', async (req, res) => {
  try {
    const nettoyeur_id = req.user.id;

    const [missions] = await db.query(
      `SELECT 
        r.*,
        c.nom as client_nom,
        c.prenom as client_prenom,
        c.telephone as client_telephone,
        c.email as client_email
      FROM reservations r
      JOIN clients c ON r.client_id = c.id
      WHERE r.nettoyeur_id = ? AND r.statut IN ('confirmee', 'en_cours', 'terminee')
      ORDER BY r.date_service ASC`,
      [nettoyeur_id]
    );

    res.status(200).json({
      success: true,
      data: missions
    });
  } catch (error) {
    console.error('Erreur récupération missions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des missions'
    });
  }
});

// GET /api/reservations — réservations du client connecté
router.get('/', async (req, res) => {
  try {
    const client_id = req.user.id;
    const [reservations] = await db.query(
      `SELECT r.*, n.nom as nettoyeur_nom, n.prenom as nettoyeur_prenom,
              n.telephone as nettoyeur_telephone, n.photo_profil as nettoyeur_photo
       FROM reservations r
       LEFT JOIN nettoyeurs n ON r.nettoyeur_id = n.id
       WHERE r.client_id = ?
       ORDER BY r.date_service DESC`,
      [client_id]
    );
    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    console.error('Erreur récupération réservations client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations'
    });
  }
});

// Routes communes (/:id doit être À LA FIN pour ne pas capturer les routes ci-dessus)
router.get('/:id', reservationController.getReservationById);

// Annuler une réservation
router.put('/:id/annuler', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_type = req.user.type;
    const { motif_annulation } = req.body;

    // Récupérer la réservation
    const [reservation] = await db.query(
      'SELECT * FROM reservations WHERE id = ?',
      [id]
    );

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const resaData = reservation[0];

    // Vérifier les permissions
    if (user_type === 'client' && resaData.client_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (user_type === 'nettoyeur' && resaData.nettoyeur_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier que la réservation peut être annulée
    if (resaData.statut === 'annulee') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation est déjà annulée'
      });
    }

    if (resaData.statut === 'terminee') {
      return res.status(400).json({
        success: false,
        message: 'Impossible d\'annuler une réservation terminée'
      });
    }

    // Annuler la réservation
    await db.query(
      'UPDATE reservations SET statut = ?, motif_annulation = ?, date_annulation = NOW() WHERE id = ?',
      ['annulee', motif_annulation || 'Aucun motif fourni', id]
    );

    // Si un nettoyeur était assigné, le retirer
    if (resaData.nettoyeur_id) {
      await db.query(
        'UPDATE reservations SET nettoyeur_id = NULL WHERE id = ?',
        [id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Réservation annulée avec succès',
      data: {
        id,
        statut: 'annulee',
        motif_annulation: motif_annulation || 'Aucun motif fourni'
      }
    });
  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la réservation'
    });
  }
});

module.exports = router;
module.exports = router;