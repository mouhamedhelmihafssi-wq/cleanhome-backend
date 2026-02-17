const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const db = require('../config/database');

// Lister les candidatures (selon le type d'utilisateur)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const user_type = req.user.type;

    let results;
    if (user_type === 'nettoyeur') {
      // Pour un nettoyeur : afficher les réservations disponibles (en_attente)
      [results] = await db.query(
        `SELECT r.*, c.nom as client_nom, c.prenom as client_prenom
         FROM reservations r
         JOIN clients c ON r.client_id = c.id
         WHERE r.statut = 'en_attente'
         AND r.id NOT IN (
           SELECT reservation_id FROM candidatures WHERE nettoyeur_id = ?
         )
         ORDER BY r.date_creation DESC`,
        [user_id]
      );
    } else {
      // Pour un client : afficher les candidatures reçues pour ses réservations
      [results] = await db.query(
        `SELECT c.*, n.nom, n.prenom, n.telephone, n.email as nettoyeur_email,
                n.photo_profil, n.specialites, n.note_moyenne,
                r.type_service, r.date_service
         FROM candidatures c
         JOIN nettoyeurs n ON c.nettoyeur_id = n.id
         JOIN reservations r ON c.reservation_id = r.id
         WHERE r.client_id = ?
         ORDER BY c.date_candidature DESC`,
        [user_id]
      );
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Erreur liste candidatures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures'
    });
  }
});

// Créer une candidature (nettoyeur postule)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const nettoyeur_id = req.user.id;
    const { reservation_id, prix_propose, message_motivation, prix_negociable } = req.body;

    // Vérifier que la réservation existe et est disponible
    const [reservation] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND statut = "en_attente"',
      [reservation_id]
    );

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée ou déjà attribuée'
      });
    }

    // Vérifier que le nettoyeur n'a pas déjà postulé
    const [existing] = await db.query(
      'SELECT * FROM candidatures WHERE reservation_id = ? AND nettoyeur_id = ?',
      [reservation_id, nettoyeur_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà postulé pour cette réservation'
      });
    }

    // Créer la candidature
    const [result] = await db.query(
      'INSERT INTO candidatures (reservation_id, nettoyeur_id, prix_propose, message_motivation, prix_negociable, statut) VALUES (?, ?, ?, ?, ?, ?)',
      [reservation_id, nettoyeur_id, prix_propose, message_motivation, prix_negociable || 0, 'en_attente']
    );

    res.status(201).json({
      success: true,
      message: 'Candidature envoyée avec succès',
      data: {
        id: result.insertId,
        reservation_id,
        nettoyeur_id,
        prix_propose,
        message_motivation,
        prix_negociable: prix_negociable || 0,
        statut: 'en_attente'
      }
    });
  } catch (error) {
    console.error('Erreur candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la candidature'
    });
  }
});
// Voir les candidatures pour une réservation (client)
router.get('/reservation/:reservation_id', authenticateToken, async (req, res) => {
  try {
    const { reservation_id } = req.params;
    const client_id = req.user.id;

    // Vérifier que la réservation appartient au client
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

    // Récupérer les candidatures avec infos du nettoyeur
    const [candidatures] = await db.query(
  `SELECT 
    c.id,
    c.prix_propose,
    c.message_motivation,
    c.prix_negociable,
    c.statut,
    c.date_candidature,
    n.nom,
    n.prenom,
    n.telephone,
    n.email,
    n.ville,
    n.region,
    n.photo_profil,
    n.specialites,
    n.experience_annees,
    n.note_moyenne,
    n.nombre_avis,
    n.description_profil
  FROM candidatures c
  JOIN nettoyeurs n ON c.nettoyeur_id = n.id
  WHERE c.reservation_id = ?
  ORDER BY c.date_candidature DESC`,
  [reservation_id]
);

    res.status(200).json({
      success: true,
      data: candidatures
    });
  } catch (error) {
    console.error('Erreur récupération candidatures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures'
    });
  }
});
// Voir les candidatures pour une réservation (client)
router.get('/reservation/:reservation_id', authenticateToken, async (req, res) => {
  try {
    const { reservation_id } = req.params;
    const client_id = req.user.id;

    // Vérifier que la réservation appartient au client
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

    // Récupérer les candidatures avec infos du nettoyeur
    const [candidatures] = await db.query(
      `SELECT 
        c.id,
        c.prix_propose,
        c.message_motivation,
        c.prix_negociable,
        c.statut,
        c.date_candidature,
        n.nom,
        n.prenom,
        n.telephone,
        n.photo_profil,
        n.tarif_horaire,
        n.annees_experience,
        n.specialites,
        n.note_moyenne
      FROM candidatures c
      JOIN nettoyeurs n ON c.nettoyeur_id = n.id
      WHERE c.reservation_id = ?
      ORDER BY c.date_candidature DESC`,
      [reservation_id]
    );

    res.status(200).json({
      success: true,
      data: candidatures
    });
  } catch (error) {
    console.error('Erreur récupération candidatures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des candidatures'
    });
  }
});
// Accepter une candidature (client)
router.put('/:candidature_id/accepter', authenticateToken, async (req, res) => {
  try {
    const { candidature_id } = req.params;
    const client_id = req.user.id;

    // Récupérer la candidature et vérifier les permissions
    const [candidature] = await db.query(
      `SELECT c.*, r.client_id, r.statut as statut_reservation
       FROM candidatures c
       JOIN reservations r ON c.reservation_id = r.id
       WHERE c.id = ?`,
      [candidature_id]
    );

    if (candidature.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    if (candidature[0].client_id !== client_id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (candidature[0].statut_reservation !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette réservation a déjà été attribuée'
      });
    }

    // Accepter la candidature
    await db.query(
      'UPDATE candidatures SET statut = ? WHERE id = ?',
      ['acceptee', candidature_id]
    );

    // Mettre à jour la réservation
    await db.query(
      'UPDATE reservations SET nettoyeur_id = ?, statut = ? WHERE id = ?',
      [candidature[0].nettoyeur_id, 'confirmee', candidature[0].reservation_id]
    );

    // Refuser les autres candidatures
    await db.query(
      'UPDATE candidatures SET statut = ? WHERE reservation_id = ? AND id != ?',
      ['refusee', candidature[0].reservation_id, candidature_id]
    );

    res.status(200).json({
      success: true,
      message: 'Candidature acceptée avec succès',
      data: {
        candidature_id,
        reservation_id: candidature[0].reservation_id,
        nettoyeur_id: candidature[0].nettoyeur_id
      }
    });
  } catch (error) {
    console.error('Erreur acceptation candidature:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'acceptation de la candidature'
    });
  }
});

module.exports = router;
module.exports = router;
module.exports = router;