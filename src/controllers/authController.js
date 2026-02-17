const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      type: user.type, 
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Générer un refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      type: user.type 
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Inscription CLIENT
exports.registerClient = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe } = req.body;

    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      'SELECT id FROM clients WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Insérer le client
    const [result] = await db.query(
      'INSERT INTO clients (nom, prenom, email, telephone, mot_de_passe) VALUES (?, ?, ?, ?, ?)',
      [nom, prenom, email, telephone, hashedPassword]
    );

    // Générer les tokens
    const token = generateToken({ id: result.insertId, type: 'client', email });
    const refreshToken = generateRefreshToken({ id: result.insertId, type: 'client' });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: {
          id: result.insertId,
          nom,
          prenom,
          email,
          telephone,
          type: 'client'
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur inscription client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// Inscription NETTOYEUR
exports.registerNettoyeur = async (req, res) => {
  try {
    const { 
      nom, prenom, email, telephone, mot_de_passe,
      ville, region, adresse, specialites, 
      experience_annees, description_profil 
    } = req.body;

    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      'SELECT id FROM nettoyeurs WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Convertir les spécialités en JSON
    const specialitesJSON = JSON.stringify(specialites || []);

    // Insérer le nettoyeur
    const [result] = await db.query(
      'INSERT INTO nettoyeurs (nom, prenom, email, telephone, mot_de_passe, ville, region, adresse, specialites, experience_annees, description_profil, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, prenom, email, telephone, hashedPassword, ville, region, adresse || null, specialitesJSON, experience_annees || 0, description_profil || null, 'en_attente']
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Votre compte est en attente de validation par un administrateur.',
      data: {
        user: {
          id: result.insertId,
          nom,
          prenom,
          email,
          telephone,
          ville,
          region,
          statut: 'en_attente',
          type: 'nettoyeur'
        }
      }
    });

  } catch (error) {
    console.error('Erreur inscription nettoyeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, mot_de_passe, type } = req.body;

    if (!email || !mot_de_passe || !type) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe et type sont requis'
      });
    }

    // Déterminer la table selon le type
    const table = type === 'client' ? 'clients' : type === 'nettoyeur' ? 'nettoyeurs' : 'admins';

    // Récupérer l'utilisateur
    const [users] = await db.query(
      `SELECT * FROM ${table} WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le statut
    if (user.statut && user.statut !== 'actif') {
      return res.status(403).json({
        success: false,
        message: `Votre compte est ${user.statut}. Veuillez contacter un administrateur.`
      });
    }

    // Générer les tokens
    const token = generateToken({ id: user.id, type, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, type });

    // Supprimer le mot de passe de la réponse
    delete user.mot_de_passe;

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: { ...user, type },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// Inscription UNIFIÉE (route unique)
exports.register = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, mot_de_passe, role } = req.body;
    const password = motDePasse || mot_de_passe;

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prénom, email et mot de passe sont requis'
      });
    }

    const type = role === 'nettoyeur' ? 'nettoyeur' : 'client';
    const table = type === 'client' ? 'clients' : 'nettoyeurs';

    // Vérifier si l'email existe déjà
    const [existing] = await db.query(
      `SELECT id FROM ${table} WHERE email = ?`,
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let result;
    if (type === 'client') {
      [result] = await db.query(
        'INSERT INTO clients (nom, prenom, email, telephone, mot_de_passe) VALUES (?, ?, ?, ?, ?)',
        [nom, prenom, email, telephone, hashedPassword]
      );
    } else {
      [result] = await db.query(
        'INSERT INTO nettoyeurs (nom, prenom, email, telephone, mot_de_passe, statut) VALUES (?, ?, ?, ?, ?, ?)',
        [nom, prenom, email, telephone, hashedPassword, 'en_attente']
      );
    }

    const token = generateToken({ id: result.insertId, type, email });
    const refreshToken = generateRefreshToken({ id: result.insertId, type });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      refreshToken,
      user: {
        id: result.insertId,
        nom,
        prenom,
        email,
        telephone,
        type,
        role: type
      },
      data: {
        user: {
          id: result.insertId,
          nom,
          prenom,
          email,
          telephone,
          type,
          role: type
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// Mise à jour du profil
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, telephone } = req.body;
    const { type } = req.user;

    const table = type === 'client' ? 'clients' : type === 'nettoyeur' ? 'nettoyeurs' : 'admins';

    // Vérifier que l'utilisateur modifie son propre profil
    if (parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier si l'email est déjà pris par un autre utilisateur
    if (email) {
      const [existing] = await db.query(
        `SELECT id FROM ${table} WHERE email = ? AND id != ?`,
        [email, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }
    }

    await db.query(
      `UPDATE ${table} SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE id = ?`,
      [nom, prenom, email, telephone, id]
    );

    const [users] = await db.query(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );

    const user = users[0];
    delete user.mot_de_passe;

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: { ...user, type, role: type },
      data: { ...user, type, role: type }
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message
    });
  }
};

// Récupérer l'utilisateur connecté
exports.getCurrentUser = async (req, res) => {
  try {
    const { id, type } = req.user;

    const table = type === 'client' ? 'clients' : type === 'nettoyeur' ? 'nettoyeurs' : 'admins';

    const [users] = await db.query(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];
    delete user.mot_de_passe;

    res.json({
      success: true,
      data: { ...user, type }
    });

  } catch (error) {
    console.error('Erreur getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
};