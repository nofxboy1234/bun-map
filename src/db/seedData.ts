type SeedValue = string | number | null;

type SeedResolver = () => SeedValue;

export type SeedModel = {
  id: number | null;
  [key: string]: number | null | SeedResolver;
};

export type SeedTableData = {
  table: string;
  data: SeedModel[];
};

type NamedSeedModel = {
  id: number | null;
  name: () => string;
};

const getIdByName = <T extends NamedSeedModel>(rows: T[], name: string) => {
  const row = rows.find((item) => item.name() === name);
  if (!row || row.id === null) {
    throw new Error(`Missing id for "${name}". Seed dependency order is invalid.`);
  }
  return row.id;
};

const statusesData = [
  { id: null, name: () => "Alive" },
  { id: null, name: () => "Deceased" },
  { id: null, name: () => "Reincarnated" },
];
export const statuses: SeedTableData = {
  table: "statuses",
  data: statusesData,
};

const locationTypesData = [
  { id: null, name: () => "Country" },
  { id: null, name: () => "City" },
  { id: null, name: () => "Church" },
  { id: null, name: () => "High School" },
  { id: null, name: () => "Restaurant" },
  { id: null, name: () => "Detention Center" },
  { id: null, name: () => "World" },
];
export const locationTypes: SeedTableData = {
  table: "location_types",
  data: locationTypesData,
};

const gendersData = [
  { id: null, name: () => "Male" },
  { id: null, name: () => "Female" },
  { id: null, name: () => "Unknown" },
];
export const genders: SeedTableData = {
  table: "genders",
  data: gendersData,
};

const speciesData = [
  { id: null, name: () => "Human", description: () => null },
  {
    id: null,
    name: () => "Devil",
    description: () => "Supernatural creatures born from human concepts",
  },
  {
    id: null,
    name: () => "Fiend",
    description: () => "Devils that possess corpses.",
  },
  {
    id: null,
    name: () => "Hybrid",
    description: () => "Humans who have merged with and can take on the form of a Devil.",
  },
];
export const species: SeedTableData = {
  table: "species",
  data: speciesData,
};

const relativeTypesData = [
  {
    id: null,
    name: () => "Mother",
  },
  {
    id: null,
    name: () => "Father",
  },
  {
    id: null,
    name: () => "Son",
  },
  {
    id: null,
    name: () => "Daughter",
  },
  {
    id: null,
    name: () => "Sister",
  },
  {
    id: null,
    name: () => "Brother",
  },
  {
    id: null,
    name: () => "Owner",
  },
  {
    id: null,
    name: () => "Pet",
  },
  {
    id: null,
    name: () => "Devil Pet",
  },
  {
    id: null,
    name: () => "Previous Incarnation",
  },
  {
    id: null,
    name: () => "Reincarnation",
  },
  {
    id: null,
    name: () => "Boyfriend",
  },
  {
    id: null,
    name: () => "Girlfriend",
  },
];
export const relativeTypes: SeedTableData = {
  table: "relative_types",
  data: relativeTypesData,
};

const affiliationsData = [
  {
    id: null,
    name: () => "Pochita",
  },
  {
    id: null,
    name: () => "Yakuza",
  },
  {
    id: null,
    name: () => "Public Safety Devil Hunters",
  },
  { id: null, name: () => "Tokyo Special Division 4" },
  { id: null, name: () => "Tokyo Special Division 5" },
  { id: null, name: () => "Fourth East High School" },
  { id: null, name: () => "Chainsaw Man Church" },
  { id: null, name: () => "Bat Devil" },
  { id: null, name: () => "Tokyo Divison 2" },
  { id: null, name: () => "Devil Hunters" },
  { id: null, name: () => "Weapon Devils" },
  { id: null, name: () => "Four Horsemen" },
  { id: null, name: () => "Tokyo Division 2" },
  { id: null, name: () => "Denji" },
];
export const affiliations: SeedTableData = {
  table: "affiliations",
  data: affiliationsData,
};

const occupationsData = [
  { id: null, name: () => "Private Devil Hunter" },
  { id: null, name: () => "Public Safety Devil Hunter" },
  { id: null, name: () => "High School Student" },
  { id: null, name: () => "Wild Fiend" },
  { id: null, name: () => "Wild Devil" },
  { id: null, name: () => "Contract Devil" },
  { id: null, name: () => "Denji's Heart" },
  { id: null, name: () => "Primal Fear" },
];
export const occupations: SeedTableData = {
  table: "occupations",
  data: occupationsData,
};

const locationsData = [
  {
    id: null,
    name: () => "Japan",
    locationTypeId: () => getIdByName(locationTypesData, "City"),
  },
  {
    id: null,
    name: () => "Hell",
    locationTypeId: () => getIdByName(locationTypesData, "World"),
  },
];
export const locations: SeedTableData = {
  table: "locations",
  data: locationsData,
};

const speciesAliasesData = [
  {
    id: null,
    name: () => "Fears",
    speciesId: () => getIdByName(speciesData, "Devil"),
  },
  {
    id: null,
    name: () => "Devil-humans",
    speciesId: () => getIdByName(speciesData, "Hybrid"),
  },
  {
    id: null,
    name: () => "Weapon-humans",
    speciesId: () => getIdByName(speciesData, "Hybrid"),
  },
  {
    id: null,
    name: () => "Majin",
    speciesId: () => getIdByName(speciesData, "Fiend"),
  },
  {
    id: null,
    name: () => "Devilmen",
    speciesId: () => getIdByName(speciesData, "Fiend"),
  },
];
export const speciesAliases: SeedTableData = {
  table: "species_aliases",
  data: speciesAliasesData,
};

const mapsData = [
  {
    id: null,
    imageFilePath: () => "path/to/map-of-japan",
    locationId: () => getIdByName(locationsData, "Japan"),
  },
];
export const maps: SeedTableData = {
  table: "maps",
  data: mapsData,
};

const charactersData = [
  {
    id: null,
    name: () => "Denji",
    age: () => 18,
    height: () => 173,
    speciesId: () => getIdByName(speciesData, "Human"),
    genderId: () => getIdByName(gendersData, "Male"),
    birthplaceId: () => getIdByName(locationsData, "Japan"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Pochita",
    age: () => null,
    height: () => null,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Male"),
    birthplaceId: () => getIdByName(locationsData, "Hell"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Makima",
    age: () => null,
    height: () => 168,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Female"),
    birthplaceId: () => getIdByName(locationsData, "Japan"),
    statusId: () => getIdByName(statusesData, "Reincarnated"),
  },
  {
    id: null,
    name: () => "Power",
    age: () => null,
    height: () => 170,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Female"),
    birthplaceId: () => getIdByName(locationsData, "Japan"),
    statusId: () => getIdByName(statusesData, "Deceased"),
  },
  {
    id: null,
    name: () => "Aki Hayakawa",
    age: () => null,
    height: () => 182,
    speciesId: () => getIdByName(speciesData, "Human"),
    genderId: () => getIdByName(gendersData, "Male"),
    birthplaceId: () => getIdByName(locationsData, "Japan"),
    statusId: () => getIdByName(statusesData, "Deceased"),
  },
  {
    id: null,
    name: () => "Future Devil",
    age: () => null,
    height: () => null,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Unknown"),
    birthplaceId: () => getIdByName(locationsData, "Hell"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Curse Devil",
    age: () => null,
    height: () => null,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Unknown"),
    birthplaceId: () => getIdByName(locationsData, "Hell"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Fox Devil",
    age: () => null,
    height: () => null,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Female"),
    birthplaceId: () => getIdByName(locationsData, "Hell"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Aging Devil",
    age: () => null,
    height: () => null,
    speciesId: () => getIdByName(speciesData, "Devil"),
    genderId: () => getIdByName(gendersData, "Unknown"),
    birthplaceId: () => getIdByName(locationsData, "Hell"),
    statusId: () => getIdByName(statusesData, "Alive"),
  },
];
export const characters: SeedTableData = {
  table: "characters",
  data: charactersData,
};

const characterAliasesData = [
  {
    id: null,
    name: () => "Blood Fiend",
    characterId: () => getIdByName(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Blood Devil",
    characterId: () => getIdByName(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Detective Power",
    characterId: () => getIdByName(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Powy",
    characterId: () => getIdByName(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Number One",
    characterId: () => getIdByName(charactersData, "Power"),
  },

  {
    id: null,
    name: () => "Topknot",
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
  },
  {
    id: null,
    name: () => "Jerk-face",
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
  },
  {
    id: null,
    name: () => "Gun Fiend",
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
  },

  {
    id: null,
    name: () => "Chainsaw",
    characterId: () => getIdByName(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Chainsaw Devil",
    characterId: () => getIdByName(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Chainsaw Man",
    characterId: () => getIdByName(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Hero of Hell",
    characterId: () => getIdByName(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Black Chainsaw Man",
    characterId: () => getIdByName(charactersData, "Pochita"),
  },

  {
    id: null,
    name: () => "Control Devil",
    characterId: () => getIdByName(charactersData, "Makima"),
  },
  {
    id: null,
    name: () => "Conquest Devil",
    characterId: () => getIdByName(charactersData, "Makima"),
  },
  {
    id: null,
    name: () => "Devil of Domination",
    characterId: () => getIdByName(charactersData, "Makima"),
  },

  {
    id: null,
    name: () => "Aging",
    characterId: () => getIdByName(charactersData, "Aging Devil"),
  },
];
export const characterAliases: SeedTableData = {
  table: "character_aliases",
  data: characterAliasesData,
};

const contractsData = [
  {
    id: null,
    terms: () =>
      "In exchange for letting him live in his right eye, Aki can see a few seconds into the future with the Future Devil's power. For the two others in Public Safety, one has to pay half of their lifespan, and the other one has to exchange their eyes, sense of taste and smell. The price of the exchange will depend on the future of the devil hunter.",
    humanId: () => getIdByName(charactersData, "Aki Hayakawa"),
    devilId: () => getIdByName(charactersData, "Future Devil"),
  },
  {
    id: null,
    terms: () => "The Control Devil will give Aki power if he gives everything of himself to her",
    humanId: () => getIdByName(charactersData, "Aki Hayakawa"),
    devilId: () => getIdByName(charactersData, "Makima"),
  },
  {
    id: null,
    terms: () =>
      "In exchange for most of his lifespan, the Curse Devil kills his target if he stabs it with his sword by three times.",
    humanId: () => getIdByName(charactersData, "Aki Hayakawa"),
    devilId: () => getIdByName(charactersData, "Curse Devil"),
  },
  {
    id: null,
    terms: () =>
      "In exchange for feeding her a part of his body, Aki may summon the Fox Devil to attack a target. Aki can summon her head because the Fox Devil considers him 'handsome'",
    humanId: () => getIdByName(charactersData, "Aki Hayakawa"),
    devilId: () => getIdByName(charactersData, "Fox Devil"),
  },

  {
    id: null,
    terms: () =>
      "In exchange for promising to find and befriend the reincarnated blood devil and 'turn her back into Power,' Power gave Denji her blood.",
    humanId: () => getIdByName(charactersData, "Denji"),
    devilId: () => getIdByName(charactersData, "Power"),
  },
  {
    id: null,
    terms: () =>
      "In exchange for living a normal life, the Chainsaw Devil became Denji's heart and turned him into a hybrid.",
    humanId: () => getIdByName(charactersData, "Denji"),
    devilId: () => getIdByName(charactersData, "Pochita"),
  },
  {
    id: null,
    terms: () =>
      "In exchange for escaping Aging's World, and Yoshida, Denji, Asa, Yoru and the Aging Devil's Victim to return to their respective worlds and never fight each other again.",
    humanId: () => getIdByName(charactersData, "Denji"),
    devilId: () => getIdByName(charactersData, "Aging Devil"),
  },
];
export const contracts: SeedTableData = {
  table: "contracts",
  data: contractsData,
};

const relativesData = [
  {
    id: null,
    character1Id: () => getIdByName(charactersData, "Denji"),
    character2Id: () => getIdByName(charactersData, "Pochita"),
    relativeTypeId: () => getIdByName(relativeTypesData, "Devil Pet"),
  },
  {
    id: null,
    character1Id: () => getIdByName(charactersData, "Pochita"),
    character2Id: () => getIdByName(charactersData, "Denji"),
    relativeTypeId: () => getIdByName(relativeTypesData, "Owner"),
  },
];
export const relatives: SeedTableData = {
  table: "relatives",
  data: relativesData,
};

const characterAffiliationsData = [
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Pochita"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Yakuza"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Special Division 4"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Fourth East High School"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    affiliationId: () => getIdByName(affiliationsData, "Chainsaw Man Church"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Pochita"),
    affiliationId: () => getIdByName(affiliationsData, "Yakuza"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Pochita"),
    affiliationId: () => getIdByName(affiliationsData, "Denji"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    affiliationId: () => getIdByName(affiliationsData, "Four Horsemen"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Special Division 4"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Special Division 5"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Power"),
    affiliationId: () => getIdByName(affiliationsData, "Bat Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Power"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Power"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Special Division 4"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Division 2"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
    affiliationId: () => getIdByName(affiliationsData, "Tokyo Special Division 4"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Future Devil"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Fox Devil"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aging Devil"),
    affiliationId: () => getIdByName(affiliationsData, "Public Safety Devil Hunters"),
  },
];
export const characterAffiliations: SeedTableData = {
  table: "character_affiliations",
  data: characterAffiliationsData,
};

const characterOccupationsData = [
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    occupationId: () => getIdByName(occupationsData, "Private Devil Hunter"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    occupationId: () => getIdByName(occupationsData, "Public Safety Devil Hunter"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Denji"),
    occupationId: () => getIdByName(occupationsData, "High School Student"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Pochita"),
    occupationId: () => getIdByName(occupationsData, "Wild Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Pochita"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Pochita"),
    occupationId: () => getIdByName(occupationsData, "Denji's Heart"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    occupationId: () => getIdByName(occupationsData, "Public Safety Devil Hunter"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Makima"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Power"),
    occupationId: () => getIdByName(occupationsData, "Public Safety Devil Hunter"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
    occupationId: () => getIdByName(occupationsData, "Public Safety Devil Hunter"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aki Hayakawa"),
    occupationId: () => getIdByName(occupationsData, "Wild Fiend"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Future Devil"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Curse Devil"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Fox Devil"),
    occupationId: () => getIdByName(occupationsData, "Wild Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Fox Devil"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },

  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aging Devil"),
    occupationId: () => getIdByName(occupationsData, "Wild Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aging Devil"),
    occupationId: () => getIdByName(occupationsData, "Contract Devil"),
  },
  {
    id: null,
    characterId: () => getIdByName(charactersData, "Aging Devil"),
    occupationId: () => getIdByName(occupationsData, "Primal Fear"),
  },
];
export const characterOccupations: SeedTableData = {
  table: "character_occupations",
  data: characterOccupationsData,
};
