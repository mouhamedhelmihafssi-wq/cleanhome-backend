const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const db = require('../config/database');

// Créer une évaluation (client note le nettoyeur)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const client_id = req.user.id;
    const { reservation_id, note, commentaire } = req.body;

    // Vérifier que la réservation existe et appartient au client
    const [reservation] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND client_id = ?',
      [reservation_id, client_id]
    );

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const resaData = reservation[0];

    // Vérifier que la réservation est terminée
    if (resaData.statut !== 'terminee') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez évaluer qu\'une réservation terminée'
      });
    }

    // Vérifier qu'il y a un nettoyeur assigné
    if (!resaData.nettoyeur_id) {
      return res.status(400).json({
        success: false,
        message: 'Aucun nettoyeur assigné à cette réservation'
      });
    }

    // Vérifier que le client n'a pas déjà évalué
    const [existing] = await db.query(
      'SELECT * FROM evaluations WHERE reservation_id = ?',
      [reservation_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà évalué cette réservation'
      });
    }

    // Créer l'évaluation
    const [result] = await db.query(
      'INSERT INTO evaluations (reservation_id, client_id, nettoyeur_id, note, commentaire) VALUES (?, ?, ?, ?, ?)',
      [reservation_id, client_id, resaData.nettoyeur_id, note, commentaire]
    );

    // Mettre à jour la note moyenne du nettoyeur
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as nombre_avis,
        AVG(note) as note_moyenne
      FROM evaluations
      WHERE nettoyeur_id = ?`,
      [resaData.nettoyeur_id]
    );

    await db.query(
      'UPDATE nettoyeurs SET note_moyenne = ?, nombre_avis = ? WHERE id = ?',
      [stats[0].note_moyenne, stats[0].nombre_avis, resaData.nettoyeur_id]
    );

    res.status(201).json({
      success: true,
      message: 'Évaluation créée avec succès',
      data: {
        id: result.insertId,
        reservation_id,
        nettoyeur_id: resaData.nettoyeur_id,
        note,
        commentaire
      }
    });
  } catch (error) {
    console.error('Erreur création évaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'évaluation'
    });
  }
});

// Voir les évaluations d'un nettoyeur
router.get('/nettoyeur/:nettoyeur_id', async (req, res) => {
  try {
    const { nettoyeur_id } = req.params;

    const [evaluations] = await db.query(
      `SELECT 
        e.*,
        c.nom as client_nom,
        c.prenom as client_prenom,
        r.type_service,
        r.date_service
      FROM evaluations e
      JOIN clients c ON e.client_id = c.id
      JOIN reservations r ON e.reservation_id = r.id
      WHERE e.nettoyeur_id = ?
      ORDER BY e.date_evaluation DESC`,
      [nettoyeur_id]
    );

    res.status(200).json({
      success: true,
      data: evaluations
    });
  } catch (error) {
    console.error('Erreur récupération évaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des évaluations'
    });
  }
});

module.exports = router;