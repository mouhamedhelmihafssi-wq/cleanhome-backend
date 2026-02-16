-- ============================================
-- Base de données CleanHome - VERSION FINALE
-- Avec : Paiements, Notifications, Documents, 
-- Prix négociable, Favoris, Localisation, Stats
-- ============================================

CREATE DATABASE IF NOT EXISTS cleanhome_db;
USE cleanhome_db;

-- ============================================
-- Table : admins
-- ============================================
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'moderateur') DEFAULT 'moderateur',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('actif', 'inactif') DEFAULT 'actif',
    INDEX idx_email (email)
);

-- ============================================
-- Table : clients
-- ============================================
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo_profil VARCHAR(500),
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('actif', 'suspendu', 'bloque') DEFAULT 'actif',
    raison_blocage TEXT,
    INDEX idx_email (email),
    INDEX idx_statut (statut)
);

-- ============================================
-- Table : nettoyeurs
-- ============================================
CREATE TABLE nettoyeurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo_profil VARCHAR(500),
    ville VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    adresse TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rayon_deplacement INT DEFAULT 10,
    specialites JSON,
    experience_annees INT DEFAULT 0,
    note_moyenne DECIMAL(3, 2) DEFAULT 0.00,
    nombre_avis INT DEFAULT 0,
    description_profil TEXT,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente', 'actif', 'suspendu', 'bloque') DEFAULT 'en_attente',
    date_validation TIMESTAMP NULL,
    admin_validateur_id INT NULL,
    raison_blocage TEXT,
    INDEX idx_email (email),
    INDEX idx_ville (ville),
    INDEX idx_region (region),
    INDEX idx_statut (statut),
    INDEX idx_localisation (latitude, longitude),
    FOREIGN KEY (admin_validateur_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================
-- Table : documents_nettoyeur
-- ============================================
CREATE TABLE documents_nettoyeur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nettoyeur_id INT NOT NULL,
    type_document ENUM('carte_identite', 'passeport', 'permis_conduire', 'assurance', 'diplome', 'autre') NOT NULL,
    nom_fichier VARCHAR(255) NOT NULL,
    url_document VARCHAR(500) NOT NULL,
    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente', 'valide', 'rejete') DEFAULT 'en_attente',
    raison_rejet TEXT,
    date_validation TIMESTAMP NULL,
    admin_validateur_id INT NULL,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_validateur_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_nettoyeur (nettoyeur_id),
    INDEX idx_statut (statut)
);

-- ============================================
-- Table : types_lieu
-- ============================================
CREATE TABLE types_lieu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    prix_base DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table : reservations
-- ============================================
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type_lieu_id INT NOT NULL,
    date_reservation DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME,
    adresse TEXT NOT NULL,
    ville VARCHAR(100) NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    statut ENUM('en_attente', 'en_recherche', 'en_negociation', 'affectee', 'en_cours', 'terminee', 'annulee') DEFAULT 'en_attente',
    prix_propose_client DECIMAL(10, 2),
    prix_negocie BOOLEAN DEFAULT FALSE,
    prix_final DECIMAL(10, 2),
    autoriser_photos BOOLEAN DEFAULT TRUE,
    commentaire_client TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (type_lieu_id) REFERENCES types_lieu(id) ON DELETE CASCADE,
    INDEX idx_client (client_id),
    INDEX idx_type_lieu (type_lieu_id),
    INDEX idx_date (date_reservation),
    INDEX idx_statut (statut),
    INDEX idx_ville (ville),
    INDEX idx_localisation (latitude, longitude)
);

-- ============================================
-- Table : candidatures
-- ============================================
CREATE TABLE candidatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    nettoyeur_id INT NOT NULL,
    prix_propose DECIMAL(10, 2) NOT NULL,
    prix_negociable BOOLEAN DEFAULT TRUE,
    message_motivation TEXT,
    statut ENUM('en_attente', 'en_negociation', 'acceptee', 'refusee') DEFAULT 'en_attente',
    date_candidature TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_reponse TIMESTAMP NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    INDEX idx_reservation (reservation_id),
    INDEX idx_nettoyeur (nettoyeur_id),
    INDEX idx_statut (statut),
    UNIQUE KEY unique_candidature (reservation_id, nettoyeur_id)
);

-- ============================================
-- Table : negociations
-- ============================================
CREATE TABLE negociations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidature_id INT NOT NULL,
    reservation_id INT NOT NULL,
    emetteur_type ENUM('client', 'nettoyeur') NOT NULL,
    prix_propose DECIMAL(10, 2) NOT NULL,
    message TEXT,
    date_proposition TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidature_id) REFERENCES candidatures(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    INDEX idx_candidature (candidature_id)
);

-- ============================================
-- Table : affectations
-- ============================================
CREATE TABLE affectations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    nettoyeur_id INT NOT NULL,
    candidature_id INT NOT NULL,
    date_affectation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_debut_intervention TIMESTAMP NULL,
    date_fin_intervention TIMESTAMP NULL,
    duree_reelle INT,
    commentaire_nettoyeur TEXT,
    commentaire_supprime BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    FOREIGN KEY (candidature_id) REFERENCES candidatures(id) ON DELETE CASCADE
);

-- ============================================
-- Table : paiements
-- ============================================
CREATE TABLE paiements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    client_id INT NOT NULL,
    nettoyeur_id INT NOT NULL,
    montant_total DECIMAL(10, 2) NOT NULL,
    commission_plateforme DECIMAL(10, 2) DEFAULT 0.00,
    montant_nettoyeur DECIMAL(10, 2) NOT NULL,
    methode_paiement ENUM('carte_bancaire', 'paypal', 'stripe', 'especes', 'virement', 'autre') NOT NULL,
    statut ENUM('en_attente', 'en_cours', 'valide', 'echoue', 'rembourse') DEFAULT 'en_attente',
    transaction_id VARCHAR(255),
    date_paiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP NULL,
    date_remboursement TIMESTAMP NULL,
    raison_remboursement TEXT,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    INDEX idx_reservation (reservation_id),
    INDEX idx_client (client_id),
    INDEX idx_nettoyeur (nettoyeur_id),
    INDEX idx_statut (statut),
    INDEX idx_date (date_paiement)
);

-- ============================================
-- Table : methodes_paiement_client
-- ============================================
CREATE TABLE methodes_paiement_client (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type_methode ENUM('carte_bancaire', 'paypal', 'stripe') NOT NULL,
    est_defaut BOOLEAN DEFAULT FALSE,
    numero_masque VARCHAR(20),
    token_paiement VARCHAR(500),
    date_expiration DATE,
    email_compte VARCHAR(255),
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client (client_id)
);

-- ============================================
-- Table : photos_intervention
-- ============================================
CREATE TABLE photos_intervention (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affectation_id INT NOT NULL,
    url_photo VARCHAR(500) NOT NULL,
    description TEXT,
    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supprimee BOOLEAN DEFAULT FALSE,
    date_suppression TIMESTAMP NULL,
    admin_suppression_id INT NULL,
    FOREIGN KEY (affectation_id) REFERENCES affectations(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_suppression_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================
-- Table : evaluations
-- ============================================
CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    nettoyeur_id INT NOT NULL,
    client_id INT NOT NULL,
    note INT NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire TEXT,
    date_evaluation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================
-- Table : favoris
-- ============================================
CREATE TABLE favoris (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    nettoyeur_id INT NOT NULL,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favori (client_id, nettoyeur_id),
    INDEX idx_client (client_id),
    INDEX idx_nettoyeur (nettoyeur_id)
);

-- ============================================
-- Table : notifications
-- ============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destinataire_type ENUM('client', 'nettoyeur', 'admin') NOT NULL,
    destinataire_id INT NOT NULL,
    type_notification VARCHAR(100) NOT NULL,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    lien VARCHAR(500),
    lu BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_lecture TIMESTAMP NULL,
    INDEX idx_destinataire (destinataire_type, destinataire_id),
    INDEX idx_lu (lu),
    INDEX idx_date (date_creation)
);

-- ============================================
-- Table : litiges
-- ============================================
CREATE TABLE litiges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    declarant_type ENUM('client', 'nettoyeur') NOT NULL,
    declarant_id INT NOT NULL,
    type_litige ENUM('non_paiement', 'travail_non_conforme', 'absence', 'comportement', 'autre') NOT NULL,
    description TEXT NOT NULL,
    statut ENUM('en_attente', 'en_cours', 'resolu', 'rejete') DEFAULT 'en_attente',
    date_declaration TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_resolution TIMESTAMP NULL,
    admin_responsable_id INT NULL,
    resolution TEXT,
    action_prise ENUM('aucune', 'remboursement', 'avertissement', 'suspension', 'blocage') DEFAULT 'aucune',
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_responsable_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_reservation (reservation_id),
    INDEX idx_statut (statut),
    INDEX idx_declarant (declarant_type, declarant_id)
);

-- ============================================
-- Table : signalements
-- ============================================
CREATE TABLE signalements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type_contenu ENUM('photo', 'commentaire') NOT NULL,
    contenu_id INT NOT NULL,
    raison TEXT NOT NULL,
    statut ENUM('en_attente', 'traite', 'rejete') DEFAULT 'en_attente',
    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_traitement TIMESTAMP NULL,
    admin_responsable_id INT NULL,
    action_prise TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_responsable_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_statut (statut),
    INDEX idx_type (type_contenu)
);

-- ============================================
-- Table : logs_admin
-- ============================================
CREATE TABLE logs_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    entite_type VARCHAR(50) NOT NULL,
    entite_id INT NOT NULL,
    details TEXT,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_date (date_action)
);

-- ============================================
-- Table : statistiques_nettoyeur
-- ============================================
CREATE TABLE statistiques_nettoyeur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nettoyeur_id INT NOT NULL UNIQUE,
    nombre_interventions_total INT DEFAULT 0,
    nombre_interventions_mois INT DEFAULT 0,
    revenu_total DECIMAL(10, 2) DEFAULT 0.00,
    revenu_mois DECIMAL(10, 2) DEFAULT 0.00,
    taux_acceptation DECIMAL(5, 2) DEFAULT 0.00,
    taux_completion DECIMAL(5, 2) DEFAULT 0.00,
    note_moyenne DECIMAL(3, 2) DEFAULT 0.00,
    nombre_favoris INT DEFAULT 0,
    derniere_intervention DATE NULL,
    date_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nettoyeur_id) REFERENCES nettoyeurs(id) ON DELETE CASCADE
);

-- ============================================
-- Table : statistiques_plateforme
-- ============================================
CREATE TABLE statistiques_plateforme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_stat DATE NOT NULL UNIQUE,
    nombre_clients_actifs INT DEFAULT 0,
    nombre_nettoyeurs_actifs INT DEFAULT 0,
    nombre_reservations_jour INT DEFAULT 0,
    nombre_interventions_terminees INT DEFAULT 0,
    revenu_jour DECIMAL(10, 2) DEFAULT 0.00,
    commission_jour DECIMAL(10, 2) DEFAULT 0.00,
    note_moyenne_plateforme DECIMAL(3, 2) DEFAULT 0.00,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date_stat)
);

-- ============================================
-- Table : details_maison
-- ============================================
CREATE TABLE details_maison (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    nombre_chambres INT NOT NULL,
    nombre_etages INT NOT NULL,
    nombre_salles_bain INT NOT NULL,
    type_service ENUM('grand_menage', 'rangement') NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Table : details_voiture
-- ============================================
CREATE TABLE details_voiture (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    nom_voiture VARCHAR(100) NOT NULL,
    type_voiture ENUM('standard', '4x4') NOT NULL,
    zone_nettoyage ENUM('exterieur', 'interieur', 'les_deux') NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Table : details_batiment
-- ============================================
CREATE TABLE details_batiment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    nombre_etages INT NOT NULL,
    avec_ascenseur BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Table : details_bureau
-- ============================================
CREATE TABLE details_bureau (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    surface DECIMAL(10, 2) NOT NULL,
    avec_cuisine BOOLEAN NOT NULL DEFAULT FALSE,
    avec_toilette BOOLEAN NOT NULL DEFAULT FALSE,
    type_service ENUM('grand_menage', 'rangement') NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Table : details_jardin
-- ============================================
CREATE TABLE details_jardin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    surface DECIMAL(10, 2) NOT NULL,
    avec_gazon BOOLEAN DEFAULT FALSE,
    avec_arbres BOOLEAN DEFAULT FALSE,
    avec_piscine BOOLEAN DEFAULT FALSE,
    type_service ENUM('inclure_tout', 'une_par_choix') NOT NULL,
    services_choisis JSON,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Vues
-- ============================================

CREATE VIEW vue_reservations_completes AS
SELECT 
    r.*,
    c.nom AS client_nom,
    c.prenom AS client_prenom,
    c.email AS client_email,
    c.telephone AS client_telephone,
    tl.nom AS type_lieu_nom,
    n.nom AS nettoyeur_nom,
    n.prenom AS nettoyeur_prenom,
    n.note_moyenne AS nettoyeur_note,
    p.statut AS statut_paiement,
    p.montant_total AS montant_paye
FROM reservations r
LEFT JOIN clients c ON r.client_id = c.id
LEFT JOIN types_lieu tl ON r.type_lieu_id = tl.id
LEFT JOIN affectations a ON r.id = a.reservation_id
LEFT JOIN nettoyeurs n ON a.nettoyeur_id = n.id
LEFT JOIN paiements p ON r.id = p.reservation_id;

CREATE VIEW vue_nettoyeurs_stats AS
SELECT 
    n.*,
    s.nombre_interventions_total,
    s.revenu_total,
    s.taux_acceptation,
    s.taux_completion,
    s.nombre_favoris
FROM nettoyeurs n
LEFT JOIN statistiques_nettoyeur s ON n.id = s.nettoyeur_id;