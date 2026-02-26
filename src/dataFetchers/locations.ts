import { sql } from "bun";

type Location = {
  id: number;
  createdAt: Date;
  name: string;
  locationTypeId: number;
};

type LocationType = {
  id: number;
  createdAt: Date;
  name: string;
};

export async function fetchLocations() {
  return await sql<Location[]>`
    SELECT 
      id, 
      created_at AS "createdAt",
      name,
      location_type_id AS "locationTypeId"
    FROM locations
  `;
}

export async function fetchLocationTypes() {
  return await sql<LocationType[]>`
    SELECT
      location_types.id,
      location_types.created_at AS "createdAt",
      location_types.name
    FROM location_types
  `;
}

const locations = await fetchLocations();
console.log(locations);
locations.forEach((location) => console.log(location.locationTypeId));

const locationTypes = await fetchLocationTypes();
console.log(locationTypes);
locationTypes.forEach((locationType) => console.log(locationType.name));
