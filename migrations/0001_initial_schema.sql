CREATE TABLE statuses (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "statuses_name_idx" ON statuses (name);

CREATE TABLE location_types (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "location_types_name_idx" ON location_types (name);

CREATE TABLE genders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "genders_name_idx" ON genders (name);

CREATE TABLE species (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  description VARCHAR(2000)
);
CREATE UNIQUE INDEX "species_name_idx" ON species (name);

CREATE TABLE relative_types (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "relative_types_name_idx" ON relative_types (name);

CREATE TABLE affiliations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "affiliations_name_idx" ON affiliations (name);

CREATE TABLE occupations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX "occupations_name_idx" ON occupations (name);

CREATE TABLE locations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  location_type_id INTEGER NOT NULL REFERENCES location_types (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "locations_name_idx" ON locations (name);
CREATE INDEX "location_type_id_idx" ON locations (location_type_id);

CREATE TABLE characters (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  height INTEGER,
  species_id INTEGER NOT NULL REFERENCES species (id) ON DELETE CASCADE,
  gender_id INTEGER NOT NULL REFERENCES genders (id) ON DELETE CASCADE,
  birthplace_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  status_id INTEGER NOT NULL REFERENCES statuses (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "characters_name_idx" ON characters (name);
CREATE INDEX "characters_species_id_idx" ON characters (species_id);
CREATE INDEX "characters_gender_id_idx" ON characters (gender_id);
CREATE INDEX "characters_birthplace_id_idx" ON characters (birthplace_id);
CREATE INDEX "characters_status_id_idx" ON characters (status_id);

CREATE TABLE maps (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  image_file_path VARCHAR(255) NOT NULL,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "maps_location_id_idx" ON maps (location_id);

CREATE TABLE character_aliases (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "character_aliases_name_characterId_idx" ON character_aliases (name);
CREATE INDEX "character_aliases_character_id_idx" ON character_aliases (character_id);

CREATE TABLE species_aliases (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  name VARCHAR(255) NOT NULL,
  species_id INTEGER NOT NULL REFERENCES species (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "species_aliases_name_idx" ON species_aliases (name);
CREATE INDEX "species_aliases_species_id_idx" ON species_aliases (species_id);

CREATE TABLE relatives (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  character1_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  character2_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  relative_type_id INTEGER NOT NULL REFERENCES relative_types (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "relatives_character1Id_character2Id_idx" ON relatives (character1_id, character2_id);
CREATE INDEX "relatives_character1_id_idx" ON relatives (character1_id);
CREATE INDEX "relatives_character2_id_idx" ON relatives (character2_id);
CREATE INDEX "relatives_relative_type_id_idx" ON relatives (relative_type_id);

CREATE TABLE contracts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  terms VARCHAR(2000) NOT NULL,
  human_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  devil_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  CONSTRAINT "no_self_contract" CHECK (human_id <> devil_id)
);
CREATE UNIQUE INDEX "contracts_humanId_devilId_idx" ON contracts (human_id, devil_id);
CREATE INDEX "contracts_human_id_idx" ON contracts (human_id);
CREATE INDEX "contracts_devil_id_idx" ON contracts (devil_id);

CREATE TABLE character_affiliations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  affiliation_id INTEGER NOT NULL REFERENCES affiliations (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "character_affiliations_characterId_affiliationId_idx" ON character_affiliations (character_id, affiliation_id);
CREATE INDEX "character_affiliations_character_id_idx" ON character_affiliations (character_id);
CREATE INDEX "character_affiliations_affiliation_id_idx" ON character_affiliations (affiliation_id);

CREATE TABLE character_occupations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  occupation_id INTEGER NOT NULL REFERENCES occupations (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "character_occupations_characterId_occupationId_idx" ON character_occupations (character_id, occupation_id);
CREATE INDEX "character_occupations_character_id_idx" ON character_occupations (character_id);
CREATE INDEX "character_occupations_occupation_id_idx" ON character_occupations (occupation_id);
