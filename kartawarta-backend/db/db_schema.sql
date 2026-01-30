-- Cardmarket DB Schema for TCGs, Expansions, Cards, CardDetails, ChartData
CREATE TABLE TCG (
    id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    cardMarketName NVARCHAR(100) NULL
);
CREATE TABLE Expansion (
    id INT IDENTITY PRIMARY KEY,
    tcg_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(255) NULL,
    cardMarketExpansionId INT NULL,
    cardMarketExpansionCode NVARCHAR(255) NULL,
    release_date DATE NULL,
    FOREIGN KEY (tcg_id) REFERENCES TCG(id)
);

CREATE TABLE Card (
    id INT IDENTITY PRIMARY KEY,
    expansion_id INT NOT NULL,
    tcg_id INT NULL,
    cardMarketId INT NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    number NVARCHAR(50) NULL,
    rarity NVARCHAR(50) NULL,
    image_url NVARCHAR(255) NULL,
    card_url NVARCHAR(255) NULL,
    last_updated DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (expansion_id) REFERENCES Expansion(id),
    FOREIGN KEY (tcg_id) REFERENCES TCG(id)
);


CREATE TABLE CardDetail (
    id INT IDENTITY PRIMARY KEY,
    card_id INT NOT NULL,
    available INT,
    price FLOAT,
    available_foil INT,
    price_foil FLOAT,
    from_price FLOAT,
    price_trend FLOAT,
    avg_30d FLOAT,
    avg_7d FLOAT,
    avg_1d FLOAT,
    avg FLOAT,
    low_foil FLOAT,
    trend_foil FLOAT,
    avg1_foil FLOAT,
    avg7_foil FLOAT,
    avg30_foil FLOAT,
    versions_url NVARCHAR(255),
    printed_in NVARCHAR(255),
    reprints NVARCHAR(255),
    last_updated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (card_id) REFERENCES Card(id)
);


CREATE TABLE ChartData (
    id INT IDENTITY PRIMARY KEY,
    card_id INT NOT NULL,
    date DATE NOT NULL,
    price FLOAT,
    last_updated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (card_id) REFERENCES Card(id)
);


-- =========================
-- USER SYSTEM (FEDERATED AUTH)
-- =========================

CREATE TABLE [User] (
    id INT IDENTITY PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    password_hash NVARCHAR(255) NULL,      -- NULL if using federated auth only
    email NVARCHAR(255) NOT NULL UNIQUE,
    provider NVARCHAR(50) NOT NULL,          -- e.g. 'google', 'discord'
    provider_id NVARCHAR(255) NOT NULL,      -- unique ID from provider
    avatar_url NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_UserProvider UNIQUE (provider, provider_id)
);

-- =========================
-- USER COLLECTION
-- =========================

CREATE TABLE UserCollection (
    id INT IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    card_id INT NOT NULL,
    quantity INT DEFAULT 0,
    quantity_foil INT DEFAULT 0,
    last_updated DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [User](id),
    FOREIGN KEY (card_id) REFERENCES Card(id),
    CONSTRAINT UQ_UserCollection UNIQUE (user_id, card_id)
);

-- =========================
-- DECKS
-- =========================

CREATE TABLE Deck (
    id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    created_by INT NULL,                      -- NULL = global/predefined deck
    tcg_id INT NULL,
    is_public BIT DEFAULT 0,
    is_official BIT DEFAULT 0,                -- official/starter decks
    is_tournament BIT DEFAULT 0,
    tournament_name NVARCHAR(255) NULL,
    deck_type NVARCHAR(50) NULL,              -- e.g. 'main', 'side'
    format NVARCHAR(100) NULL,                -- e.g. 'standard', 'fusion'
    min_cards INT NULL,
    max_cards INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (created_by) REFERENCES [User](id),
    FOREIGN KEY (tcg_id) REFERENCES TCG(id)
);

-- =========================
-- TOURNAMENTS (OPTIONAL)
-- =========================

CREATE TABLE Tournament (
    id INT IDENTITY PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    tcg_id INT NOT NULL,
    location NVARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (tcg_id) REFERENCES TCG(id)
);

ALTER TABLE Deck
ADD tournament_id INT NULL,
    FOREIGN KEY (tournament_id) REFERENCES Tournament(id);

-- =========================
-- DECK SLOT TYPES (PER TCG)
-- =========================

CREATE TABLE DeckSlotType (
    id INT IDENTITY PRIMARY KEY,
    tcg_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,              -- e.g. 'Leader', 'Champion', 'Rune', etc.
    min_quantity INT DEFAULT 0,
    max_quantity INT DEFAULT NULL,
    is_optional BIT DEFAULT 0,
    FOREIGN KEY (tcg_id) REFERENCES TCG(id)
);

-- =========================
-- DECK CARD LINK
-- =========================

CREATE TABLE DeckCard (
    id INT IDENTITY PRIMARY KEY,
    deck_id INT NOT NULL,
    card_id INT NOT NULL,
    slot_type_id INT NULL,                    -- references DeckSlotType
    quantity INT DEFAULT 1,
    is_foil BIT DEFAULT 0,
    FOREIGN KEY (deck_id) REFERENCES Deck(id),
    FOREIGN KEY (card_id) REFERENCES Card(id),
    FOREIGN KEY (slot_type_id) REFERENCES DeckSlotType(id),
    CONSTRAINT UQ_DeckCard UNIQUE (deck_id, card_id, is_foil)
);