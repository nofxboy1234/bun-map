type SeedValue = string | number | null;

type SeedResolver = () => SeedValue;

type SeedKeyedModel = {
  id: number | null;
  seedKey: string;
};

export type SeedModel = SeedKeyedModel & {
  [key: string]: string | number | null | SeedResolver;
};

export type SeedTableData = {
  table: string;
  data: SeedModel[];
};

const withSeedKeys = <T extends { id: number | null }>(
  rows: T[],
  getSeedKey: (row: T, index: number) => string,
): (T & SeedKeyedModel)[] =>
  rows.map((row, index) => ({ ...row, seedKey: getSeedKey(row, index) }));

const withNameSeedKeys = <T extends { id: number | null; name: () => string }>(rows: T[]) =>
  withSeedKeys(rows, (row) => row.name());

const getIdBySeedKey = <T extends SeedKeyedModel>(rows: T[], seedKey: string) => {
  const row = rows.find((item) => item.seedKey === seedKey);
  if (!row || row.id === null) {
    throw new Error(`Missing id for seed key "${seedKey}". Seed dependency order is invalid.`);
  }
  return row.id;
};

const statusesData = withNameSeedKeys([
  { id: null, name: () => "Alive" },
  { id: null, name: () => "Deceased" },
  { id: null, name: () => "Reincarnated" },
]);
export const statuses: SeedTableData = {
  table: "statuses",
  data: statusesData,
};

const locationTypesData = withNameSeedKeys([
  { id: null, name: () => "Country" },
  { id: null, name: () => "City" },
  { id: null, name: () => "Church" },
  { id: null, name: () => "High School" },
  { id: null, name: () => "Restaurant" },
  { id: null, name: () => "Detention Center" },
  { id: null, name: () => "World" },
]);
export const locationTypes: SeedTableData = {
  table: "location_types",
  data: locationTypesData,
};

const gendersData = withNameSeedKeys([
  { id: null, name: () => "Male" },
  { id: null, name: () => "Female" },
  { id: null, name: () => "Unknown" },
]);
export const genders: SeedTableData = {
  table: "genders",
  data: gendersData,
};

const speciesData = withNameSeedKeys([
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
]);
export const species: SeedTableData = {
  table: "species",
  data: speciesData,
};

const relativeTypesData = withNameSeedKeys([
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
]);
export const relativeTypes: SeedTableData = {
  table: "relative_types",
  data: relativeTypesData,
};

const affiliationsData = withNameSeedKeys([
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
]);
export const affiliations: SeedTableData = {
  table: "affiliations",
  data: affiliationsData,
};

const occupationsData = withNameSeedKeys([
  { id: null, name: () => "Private Devil Hunter" },
  { id: null, name: () => "Public Safety Devil Hunter" },
  { id: null, name: () => "High School Student" },
  { id: null, name: () => "Wild Fiend" },
  { id: null, name: () => "Wild Devil" },
  { id: null, name: () => "Contract Devil" },
  { id: null, name: () => "Denji's Heart" },
  { id: null, name: () => "Primal Fear" },
]);
export const occupations: SeedTableData = {
  table: "occupations",
  data: occupationsData,
};

const locationsData = withNameSeedKeys([
  {
    id: null,
    name: () => "Japan",
    locationTypeId: () => getIdBySeedKey(locationTypesData, "City"),
  },
  {
    id: null,
    name: () => "Hell",
    locationTypeId: () => getIdBySeedKey(locationTypesData, "World"),
  },
]);
export const locations: SeedTableData = {
  table: "locations",
  data: locationsData,
};

const speciesAliasesData = withNameSeedKeys([
  {
    id: null,
    name: () => "Fears",
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
  },
  {
    id: null,
    name: () => "Devil-humans",
    speciesId: () => getIdBySeedKey(speciesData, "Hybrid"),
  },
  {
    id: null,
    name: () => "Weapon-humans",
    speciesId: () => getIdBySeedKey(speciesData, "Hybrid"),
  },
  {
    id: null,
    name: () => "Majin",
    speciesId: () => getIdBySeedKey(speciesData, "Fiend"),
  },
  {
    id: null,
    name: () => "Devilmen",
    speciesId: () => getIdBySeedKey(speciesData, "Fiend"),
  },
]);
export const speciesAliases: SeedTableData = {
  table: "species_aliases",
  data: speciesAliasesData,
};

const mapsData = withSeedKeys(
  [
    {
      id: null,
      imageFilePath: () => "path/to/map-of-japan",
      locationId: () => getIdBySeedKey(locationsData, "Japan"),
    },
  ],
  (row) => row.imageFilePath(),
);
export const maps: SeedTableData = {
  table: "maps",
  data: mapsData,
};

const charactersData: SeedModel[] = withNameSeedKeys([
  {
    id: null,
    name: () => "Denji",
    age: (): number | null => 18,
    height: (): number | null => 173,
    speciesId: () => getIdBySeedKey(speciesData, "Human"),
    genderId: () => getIdBySeedKey(gendersData, "Male"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Japan"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Pochita",
    age: (): number | null => null,
    height: (): number | null => null,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Male"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Hell"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Makima",
    age: (): number | null => null,
    height: (): number | null => 168,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Female"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Japan"),
    statusId: () => getIdBySeedKey(statusesData, "Reincarnated"),
  },
  {
    id: null,
    name: () => "Power",
    age: (): number | null => null,
    height: (): number | null => 170,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Female"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Japan"),
    statusId: () => getIdBySeedKey(statusesData, "Deceased"),
  },
  {
    id: null,
    name: () => "Aki Hayakawa",
    age: (): number | null => null,
    height: (): number | null => 182,
    speciesId: () => getIdBySeedKey(speciesData, "Human"),
    genderId: () => getIdBySeedKey(gendersData, "Male"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Japan"),
    statusId: () => getIdBySeedKey(statusesData, "Deceased"),
  },
  {
    id: null,
    name: () => "Future Devil",
    age: (): number | null => null,
    height: (): number | null => null,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Unknown"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Hell"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Curse Devil",
    age: (): number | null => null,
    height: (): number | null => null,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Unknown"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Hell"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Fox Devil",
    age: (): number | null => null,
    height: (): number | null => null,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Female"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Hell"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
  {
    id: null,
    name: () => "Aging Devil",
    age: (): number | null => null,
    height: (): number | null => null,
    speciesId: () => getIdBySeedKey(speciesData, "Devil"),
    genderId: () => getIdBySeedKey(gendersData, "Unknown"),
    birthplaceId: () => getIdBySeedKey(locationsData, "Hell"),
    statusId: () => getIdBySeedKey(statusesData, "Alive"),
  },
]);
export const characters: SeedTableData = {
  table: "characters",
  data: charactersData,
};

const characterAliasesData = withNameSeedKeys([
  {
    id: null,
    name: () => "Blood Fiend",
    characterId: () => getIdBySeedKey(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Blood Devil",
    characterId: () => getIdBySeedKey(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Detective Power",
    characterId: () => getIdBySeedKey(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Powy",
    characterId: () => getIdBySeedKey(charactersData, "Power"),
  },
  {
    id: null,
    name: () => "Number One",
    characterId: () => getIdBySeedKey(charactersData, "Power"),
  },

  {
    id: null,
    name: () => "Topknot",
    characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
  },
  {
    id: null,
    name: () => "Jerk-face",
    characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
  },
  {
    id: null,
    name: () => "Gun Fiend",
    characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
  },

  {
    id: null,
    name: () => "Chainsaw",
    characterId: () => getIdBySeedKey(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Chainsaw Devil",
    characterId: () => getIdBySeedKey(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Chainsaw Man",
    characterId: () => getIdBySeedKey(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Hero of Hell",
    characterId: () => getIdBySeedKey(charactersData, "Pochita"),
  },
  {
    id: null,
    name: () => "Black Chainsaw Man",
    characterId: () => getIdBySeedKey(charactersData, "Pochita"),
  },

  {
    id: null,
    name: () => "Control Devil",
    characterId: () => getIdBySeedKey(charactersData, "Makima"),
  },
  {
    id: null,
    name: () => "Conquest Devil",
    characterId: () => getIdBySeedKey(charactersData, "Makima"),
  },
  {
    id: null,
    name: () => "Devil of Domination",
    characterId: () => getIdBySeedKey(charactersData, "Makima"),
  },

  {
    id: null,
    name: () => "Aging",
    characterId: () => getIdBySeedKey(charactersData, "Aging Devil"),
  },
]);
export const characterAliases: SeedTableData = {
  table: "character_aliases",
  data: characterAliasesData,
};

const contractsData = withSeedKeys(
  [
    {
      id: null,
      terms: () =>
        "In exchange for letting him live in his right eye, Aki can see a few seconds into the future with the Future Devil's power. For the two others in Public Safety, one has to pay half of their lifespan, and the other one has to exchange their eyes, sense of taste and smell. The price of the exchange will depend on the future of the devil hunter.",
      humanId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      devilId: () => getIdBySeedKey(charactersData, "Future Devil"),
    },
    {
      id: null,
      terms: () => "The Control Devil will give Aki power if he gives everything of himself to her",
      humanId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      devilId: () => getIdBySeedKey(charactersData, "Makima"),
    },
    {
      id: null,
      terms: () =>
        "In exchange for most of his lifespan, the Curse Devil kills his target if he stabs it with his sword by three times.",
      humanId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      devilId: () => getIdBySeedKey(charactersData, "Curse Devil"),
    },
    {
      id: null,
      terms: () =>
        "In exchange for feeding her a part of his body, Aki may summon the Fox Devil to attack a target. Aki can summon her head because the Fox Devil considers him 'handsome'",
      humanId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      devilId: () => getIdBySeedKey(charactersData, "Fox Devil"),
    },

    {
      id: null,
      terms: () =>
        "In exchange for promising to find and befriend the reincarnated blood devil and 'turn her back into Power,' Power gave Denji her blood.",
      humanId: () => getIdBySeedKey(charactersData, "Denji"),
      devilId: () => getIdBySeedKey(charactersData, "Power"),
    },
    {
      id: null,
      terms: () =>
        "In exchange for living a normal life, the Chainsaw Devil became Denji's heart and turned him into a hybrid.",
      humanId: () => getIdBySeedKey(charactersData, "Denji"),
      devilId: () => getIdBySeedKey(charactersData, "Pochita"),
    },
    {
      id: null,
      terms: () =>
        "In exchange for escaping Aging's World, and Yoshida, Denji, Asa, Yoru and the Aging Devil's Victim to return to their respective worlds and never fight each other again.",
      humanId: () => getIdBySeedKey(charactersData, "Denji"),
      devilId: () => getIdBySeedKey(charactersData, "Aging Devil"),
    },
  ],
  (_row, index) => `contract-${index + 1}`,
);
export const contracts: SeedTableData = {
  table: "contracts",
  data: contractsData,
};

const relativesData = withSeedKeys(
  [
    {
      id: null,
      character1Id: () => getIdBySeedKey(charactersData, "Denji"),
      character2Id: () => getIdBySeedKey(charactersData, "Pochita"),
      relativeTypeId: () => getIdBySeedKey(relativeTypesData, "Devil Pet"),
    },
    {
      id: null,
      character1Id: () => getIdBySeedKey(charactersData, "Pochita"),
      character2Id: () => getIdBySeedKey(charactersData, "Denji"),
      relativeTypeId: () => getIdBySeedKey(relativeTypesData, "Owner"),
    },
  ],
  (_row, index) => `relative-${index + 1}`,
);
export const relatives: SeedTableData = {
  table: "relatives",
  data: relativesData,
};

const characterAffiliationsData = withSeedKeys(
  [
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Pochita"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Yakuza"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Special Division 4"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Fourth East High School"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Chainsaw Man Church"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Pochita"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Yakuza"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Pochita"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Denji"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Four Horsemen"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Special Division 4"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Special Division 5"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Power"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Bat Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Power"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Power"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Special Division 4"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Division 2"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Tokyo Special Division 4"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Future Devil"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Fox Devil"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aging Devil"),
      affiliationId: () => getIdBySeedKey(affiliationsData, "Public Safety Devil Hunters"),
    },
  ],
  (_row, index) => `character-affiliation-${index + 1}`,
);
export const characterAffiliations: SeedTableData = {
  table: "character_affiliations",
  data: characterAffiliationsData,
};

const characterOccupationsData = withSeedKeys(
  [
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      occupationId: () => getIdBySeedKey(occupationsData, "Private Devil Hunter"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      occupationId: () => getIdBySeedKey(occupationsData, "Public Safety Devil Hunter"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Denji"),
      occupationId: () => getIdBySeedKey(occupationsData, "High School Student"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Pochita"),
      occupationId: () => getIdBySeedKey(occupationsData, "Wild Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Pochita"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Pochita"),
      occupationId: () => getIdBySeedKey(occupationsData, "Denji's Heart"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      occupationId: () => getIdBySeedKey(occupationsData, "Public Safety Devil Hunter"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Makima"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Power"),
      occupationId: () => getIdBySeedKey(occupationsData, "Public Safety Devil Hunter"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      occupationId: () => getIdBySeedKey(occupationsData, "Public Safety Devil Hunter"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aki Hayakawa"),
      occupationId: () => getIdBySeedKey(occupationsData, "Wild Fiend"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Future Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Curse Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Fox Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Wild Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Fox Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },

    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aging Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Wild Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aging Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Contract Devil"),
    },
    {
      id: null,
      characterId: () => getIdBySeedKey(charactersData, "Aging Devil"),
      occupationId: () => getIdBySeedKey(occupationsData, "Primal Fear"),
    },
  ],
  (_row, index) => `character-occupation-${index + 1}`,
);
export const characterOccupations: SeedTableData = {
  table: "character_occupations",
  data: characterOccupationsData,
};
