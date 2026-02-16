const db = require('../config/database');

// Créer une réservation (CLIENT uniquement)
exports.createReservation = async (req, res) => {
  try {
    // Vérifier que c'est un client
    if (req.user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les clients peuvent créer des réservations'
      });
    }

    const {
      type_service,
      description,
      adresse_service,
      ville,
      code_postal,
      date_service,
      heure_debut,
      duree_estimee,
      prix_propose
    } = req.body;

    const client_id = req.user.id;

    // Insérer la réservation
    const [result] = await db.query(
      `INSERT INTO reservations 
      (client_id, type_service, description, adresse_service, ville, code_postal, 
       date_service, heure_debut, duree_estimee, prix_propose, statut) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [client_id, type_service, description, adresse_service, ville, code_postal,
       date_service, heure_debut, duree_estimee, prix_propose, 'en_attente']
    );

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: {
        id: result.insertId,
        client_id,
        type_service,
        description,
        adresse_service,
        ville,
        code_postal,
        date_service,
        heure_debut,
        duree_estimee,
        prix_propose,
        statut: 'en_attente'
      }
    });

  } catch (error) {
    console.error('Erreur création réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
      error: error.message
    });
  }
};

// Récupérer les réservations du client connecté
exports.getMyReservations = async (req, res) => {
  try {
    if (req.user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const [reservations] = await db.query(
      `SELECT r.*, 
              n.nom as nettoyeur_nom, 
              n.prenom as nettoyeur_prenom,
              n.telephone as nettoyeur_telephone
       FROM reservations r
       LEFT JOIN nettoyeurs n ON r.nettoyeur_id = n.id
       WHERE r.client_id = ?
       ORDER BY r.date_creation DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: reservations
    });

  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
};

// Récupérer une réservation spécifique
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [reservations] = await db.query(
      `SELECT r.*, 
              c.nom as client_nom, 
              c.prenom as client_prenom,
              c.telephone as client_telephone,
              n.nom as nettoyeur_nom, 
              n.prenom as nettoyeur_prenom,
              n.telephone as nettoyeur_telephone
       FROM reservations r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN nettoyeurs n ON r.nettoyeur_id = n.id
       WHERE r.id = ?`,
      [id]
    );

    if (reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const reservation = reservations[0];

    // Vérifier les droits d'accès
    if (req.user.type === 'client' && reservation.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (req.user.type === 'nettoyeur' && reservation.nettoyeur_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      data: reservation
    });

  } catch (error) {
    console.error('Erreur récupération réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réservation',
      error: error.message
    });
  }
};

// Annuler une réservation (CLIENT uniquement)
exports.cancelReservation = async (req, res) => {
  try {
    if (req.user.type !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les clients peuvent annuler des réservations'
      });
    }

    const { id } = req.params;

    // Vérifier que la réservation existe et appartient au client
    const [reservations] = await db.query(
      'SELECT * FROM reservations WHERE id = ? AND client_id = ?',
      [id, req.user.id]
    );

    if (reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const reservation = reservations[0];

    // Vérifier que la réservation peut être annulée
    if (reservation.statut === 'terminee' || reservation.statut === 'annulee') {
      return res.status(400).json({
        success: false,
        message: `Impossible d'annuler une réservation ${reservation.statut}`
      });
    }

    // Annuler la réservation
    await db.query(
      'UPDATE reservations SET statut = ? WHERE id = ?',
      ['annulee', id]
    );

    res.json({
      success: true,
      message: 'Réservation annulée avec succès'
    });

  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la réservation',
      error: error.message
    });
  }
};

// Récupérer les réservations disponibles (NETTOYEURS)
exports.getAvailableReservations = async (req, res) => {
  try {
    if (req.user.type !== 'nettoyeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const [reservations] = await db.query(
      `SELECT r.*, 
              c.nom as client_nom, 
              c.prenom as client_prenom
       FROM reservations r
       JOIN clients c ON r.client_id = c.id
       WHERE r.statut = 'en_attente' 
       AND r.nettoyeur_id IS NULL
       AND r.date_service >= CURDATE()
       ORDER BY r.date_creation DESC`
    );

    res.json({
      success: true,
      data: reservations
    });

  } catch (error) {
    console.error('Erreur récupération réservations disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations disponibles',
      error: error.message
    });
  }
};

// Récupérer les réservations attribuées au nettoyeur
exports.getMyAssignedReservations = async (req, res) => {
  try {
    if (req.user.type !== 'nettoyeur') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const [reservations] = await db.query(
      `SELECT r.*, 
              c.nom as client_nom, 
              c.prenom as client_prenom,
              c.telephone as client_telephone
       FROM reservations r
       JOIN clients c ON r.client_id = c.id
       WHERE r.nettoyeur_id = ?
       ORDER BY r.date_service ASC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: reservations
    });

  } catch (error) {
    console.error('Erreur récupération réservations attribuées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations attribuées',
      error: error.message
    });
  }
};