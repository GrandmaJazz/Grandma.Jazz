export interface FamilyMember {
  id: string;
  title: string;
  name: string;
  email?: string;
}

export const INITIAL_FAMILY: FamilyMember[] = [];

export const TITLES = [
  "Grandma",
  "Grandpa",
  "Mumma",
  "Papa",
  "Sister",
  "Brother",
  "Auntie",
  "Uncle",
  "Cousin",
  "Nephew",
  "Niece",
  "Little",
  "Big",
  "Friend",
];
