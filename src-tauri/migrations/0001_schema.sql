-- Schema consolidato: sostituisce le migration precedenti (accumulate durante lo sviluppo, poi
-- collassate in un unico punto di partenza pulito ogni volta che si accumulano troppi file).
-- Rappresenta lo stato finale risultante dall'applicazione in sequenza di quelle migration, non
-- un nuovo design.

CREATE TABLE food (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    -- "unit_100" dichiara se il riferimento "per 100" è in grammi o millilitri: serve per liquidi
    -- come l'olio EVO, la cui etichetta nutrizionale è spesso per 100ml - niente conversione via
    -- densità, si logga la quantità nella stessa unità dichiarata qui.
    unit_100 TEXT NOT NULL DEFAULT 'g' CHECK (unit_100 IN ('g', 'ml')),
    kcal_100 REAL NOT NULL,
    protein_100 REAL NOT NULL,
    carbs_100 REAL NOT NULL,
    fat_100 REAL NOT NULL,
    sugar_100 REAL,
    saturated_fat_100 REAL,
    fiber_100 REAL,
    salt_100 REAL,
    from_label INTEGER NOT NULL DEFAULT 0 CHECK (from_label IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_food_name ON food (name COLLATE NOCASE);

CREATE TABLE food_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id INTEGER NOT NULL REFERENCES food (id),
    log_date TEXT NOT NULL,
    log_time TEXT,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    quantity REAL NOT NULL,
    kcal REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    sugar_g REAL,
    saturated_fat_g REAL,
    fiber_g REAL,
    salt_g REAL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_food_log_log_date ON food_log (log_date);
CREATE INDEX idx_food_log_food_id ON food_log (food_id);
CREATE UNIQUE INDEX idx_food_log_unique_voce
    ON food_log (food_id, log_date, log_time, meal_type, quantity);

CREATE TABLE goal (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    kcal REAL,
    -- Limite MINIMO di kcal (accanto al massimo "kcal"): scendere troppo sotto il proprio
    -- fabbisogno energetico di base è un rischio (denutrizione), non solo sforare in alto. In
    -- assenza di un valore manuale l'app usa il BMR calcolato come fallback (stesso pattern del
    -- limite massimo con il TDEE).
    kcal_min REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    salt_g REAL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Ogni riga è uno snapshot completo dell'obiettivo al momento del salvataggio, taggato con il
-- macrogruppo del form che l'ha prodotto (kcal / macro / altro - assi nutrizionali indipendenti)
-- e con l'intervallo di validità scelto: valido_dal/valido_al aperti (NULL) per "da ora in poi" e
-- "sempre", chiusi sulla settimana/mese corrente per gli ambiti "settimana"/"mese". recorded_at
-- tiene traccia di quando il salvataggio è stato davvero fatto, indipendentemente dall'intervallo.
CREATE TABLE goal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    valido_dal TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    valido_al TEXT,
    ambito TEXT NOT NULL DEFAULT 'daOra' CHECK (ambito IN ('daOra', 'sempre', 'settimana', 'mese')),
    kcal REAL,
    kcal_min REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    salt_g REAL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    gruppo TEXT NOT NULL DEFAULT 'kcal' CHECK (gruppo IN ('kcal', 'macro', 'altro'))
) STRICT;

-- Una sola misurazione per giorno (peso rilevato, non un log di eventi come i pasti): pesarsi di
-- nuovo lo stesso giorno corregge la lettura precedente invece di aggiungerne una seconda, quindi
-- log_date è UNIQUE e registraPeso in weight.ts fa upsert (INSERT ... ON CONFLICT).
CREATE TABLE weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT NOT NULL UNIQUE,
    weight_kg REAL NOT NULL CHECK (weight_kg > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Riga singola (id=1) come "goal": l'obiettivo di peso non ha bisogno di storicità come i limiti
-- nutrizionali (nessun calcolo retroattivo dipende da "qual era il mio obiettivo di peso il [data
-- passata]") - serve solo il target ATTUALE per la proiezione verso il futuro.
CREATE TABLE weight_goal (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    target_kg REAL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Log append-only di ogni obiettivo di peso impostato (a differenza di weight_goal, che tiene solo
-- il target ATTUALE): richiesto per poter mostrare nei grafici come l'obiettivo è cambiato nel
-- tempo e verificare l'andamento del peso rispetto all'obiettivo che era effettivamente in vigore
-- in un dato momento, non solo rispetto a quello di oggi.
CREATE TABLE weight_goal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_kg REAL NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Riga singola (id=1), come weight_goal: solo l'anagrafica ATTUALE per calcolare BMR/TDEE al
-- momento - niente bmr/peso salvati qui, sono derivati e cambiano più spesso dell'anagrafica
-- stessa (il peso ogni settimana), quindi si calcolano sempre al volo (vedi lib/tdee.ts) invece di
-- essere persistiti e rischiare di disallinearsi dall'input che li ha generati.
CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    age_years INTEGER NOT NULL CHECK (age_years > 0),
    height_cm REAL NOT NULL CHECK (height_cm > 0),
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Append-only: l'età aumenta ogni anno, quindi un aggiornamento di profile perde il valore
-- precedente se non lo si storicizza - stesso pattern di goal_history/weight_goal_history.
CREATE TABLE profile_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    age_years INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    sex TEXT NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Tabella di lookup a righe fisse (seminata qui sotto), non popolata dall'utente: i moltiplicatori
-- standard usati per scalare il BMR a TDEE in base al livello di attività. Etichette/descrizioni
-- doppie ita/eng già da ora anche se l'app oggi è solo in italiano.
CREATE TABLE fitness_level (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL UNIQUE,
    multiplier REAL NOT NULL,
    label_ita TEXT NOT NULL,
    label_eng TEXT NOT NULL,
    description_ita TEXT NOT NULL,
    description_eng TEXT NOT NULL
) STRICT;

INSERT INTO fitness_level (level, multiplier, label_ita, label_eng, description_ita, description_eng) VALUES
    ('sedentary', 1.2, 'Sedentario', 'Sedentary', 'Poco o nessun esercizio', 'Little or no exercise'),
    ('light', 1.375, 'Leggermente attivo', 'Lightly active', 'Esercizio leggero 1-3 giorni/settimana', 'Light exercise 1-3 days/week'),
    ('moderate', 1.55, 'Moderatamente attivo', 'Moderately active', 'Esercizio moderato 3-5 giorni/settimana', 'Moderate exercise 3-5 days/week'),
    ('active', 1.725, 'Molto attivo', 'Very active', 'Esercizio intenso 6-7 giorni/settimana', 'Hard exercise 6-7 days/week'),
    ('very_active', 1.9, 'Estremamente attivo', 'Extremely active', 'Esercizio molto intenso o lavoro fisico', 'Very hard exercise or physical job');

-- Raccordo append-only tra profile e fitness_level: il livello di attività può cambiare mantenendo
-- la stessa anagrafica, quindi ha una sua storicità indipendente da profile_history. profile_id
-- punta sempre a 1 per ora (profile è mono-riga), ma il join esplicito con FK regge già
-- un'eventuale estensione multi-profilo futura senza modifiche allo schema.
CREATE TABLE profile_fitness (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profile (id),
    fitness_level_id INTEGER NOT NULL REFERENCES fitness_level (id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- profile_id è filtrato direttamente in una WHERE (vedi lib/profile.ts), stesso motivo per cui
-- food_log.food_id e recipe_ingredients.recipe_id hanno un indice qui sotto.
CREATE INDEX idx_profile_fitness_profile_id ON profile_fitness (profile_id);

CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_recipes_name ON recipes (name COLLATE NOCASE);

-- Niente ON DELETE CASCADE su food_id, di proposito: stesso comportamento di food_log.food_id -
-- se un alimento è usato in una ricetta, eliminarlo dal catalogo deve fallire per la foreign key,
-- non sparire silenziosamente dalla ricetta. L'eliminazione di una ricetta invece cancella prima le
-- sue righe da recipe_ingredients lato applicazione (lib/recipes.ts), non con una CASCADE qui.
CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes (id),
    food_id INTEGER NOT NULL REFERENCES food (id),
    quantity REAL NOT NULL CHECK (quantity > 0)
) STRICT;

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients (recipe_id);
