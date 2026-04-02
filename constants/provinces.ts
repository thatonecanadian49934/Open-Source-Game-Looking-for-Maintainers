// Powered by OnSpace.AI
export interface Province {
  code: string;
  name: string;
  seats: number;
  region: 'West' | 'Prairies' | 'Ontario' | 'Quebec' | 'Atlantic' | 'North';
  population: number;
}

export const PROVINCES: Province[] = [
  { code: 'BC', name: 'British Columbia', seats: 43, region: 'West', population: 5000000 },
  { code: 'AB', name: 'Alberta', seats: 34, region: 'Prairies', population: 4400000 },
  { code: 'SK', name: 'Saskatchewan', seats: 14, region: 'Prairies', population: 1200000 },
  { code: 'MB', name: 'Manitoba', seats: 14, region: 'Prairies', population: 1400000 },
  { code: 'ON', name: 'Ontario', seats: 122, region: 'Ontario', population: 14700000 },
  { code: 'QC', name: 'Quebec', seats: 78, region: 'Quebec', population: 8600000 },
  { code: 'NB', name: 'New Brunswick', seats: 10, region: 'Atlantic', population: 780000 },
  { code: 'NS', name: 'Nova Scotia', seats: 11, region: 'Atlantic', population: 970000 },
  { code: 'PE', name: 'Prince Edward Island', seats: 4, region: 'Atlantic', population: 160000 },
  { code: 'NL', name: 'Newfoundland', seats: 7, region: 'Atlantic', population: 520000 },
  { code: 'YT', name: 'Yukon', seats: 1, region: 'North', population: 43000 },
  { code: 'NT', name: 'Northwest Territories', seats: 1, region: 'North', population: 45000 },
  { code: 'NU', name: 'Nunavut', seats: 1, region: 'North', population: 38000 },
  { code: 'SK2', name: 'Saskatchewan (N)', seats: 1, region: 'North', population: 0 }, // placeholder alignment
];

export const REAL_PROVINCES = PROVINCES.filter(p => p.code !== 'SK2');

export const TOTAL_SEATS = 343;
export const MAJORITY_SEATS = 172;

export const REGION_PROVINCES: Record<string, string[]> = {
  West: ['BC'],
  Prairies: ['AB', 'SK', 'MB'],
  Ontario: ['ON'],
  Quebec: ['QC'],
  Atlantic: ['NB', 'NS', 'PE', 'NL'],
  North: ['YT', 'NT', 'NU'],
};
