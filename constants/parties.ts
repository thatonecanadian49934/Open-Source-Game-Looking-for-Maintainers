// Powered by OnSpace.AI
export interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  ideology: string;
  description: string;
  baseSupport: number; // percentage
  strongProvinces: string[];
  leader: string;
  founded: number;
  tagline: string;
}

export const PARTIES: Party[] = [
  {
    id: 'liberal',
    name: 'Liberal Party of Canada',
    shortName: 'LPC',
    color: '#D71920',
    ideology: 'Centre-left / Liberal',
    description: 'Canada\'s most successful federal party, advocating for social liberalism, multiculturalism, and managed capitalism.',
    baseSupport: 32,
    strongProvinces: ['ON', 'QC', 'BC'],
    leader: 'Your Character',
    founded: 1867,
    tagline: 'Real Change',
  },
  {
    id: 'conservative',
    name: 'Conservative Party of Canada',
    shortName: 'CPC',
    color: '#1A4782',
    ideology: 'Centre-right / Conservative',
    description: 'Canada\'s main right-of-centre party, championing fiscal responsibility, individual freedoms, and traditional values.',
    baseSupport: 34,
    strongProvinces: ['AB', 'SK', 'MB'],
    leader: 'Your Character',
    founded: 2003,
    tagline: 'A Canada That Works',
  },
  {
    id: 'ndp',
    name: 'New Democratic Party',
    shortName: 'NDP',
    color: '#F37021',
    ideology: 'Centre-left / Social Democratic',
    description: 'Canada\'s social democratic party advocating for workers\' rights, universal healthcare expansion, and social equality.',
    baseSupport: 20,
    strongProvinces: ['BC', 'MB', 'SK'],
    leader: 'Your Character',
    founded: 1961,
    tagline: 'In It For You',
  },
  {
    id: 'bloc',
    name: 'Bloc Québécois',
    shortName: 'BQ',
    color: '#093D6D',
    ideology: 'Quebec Sovereignty / Social Democracy',
    description: 'A federal party that advocates for Quebec\'s interests and sovereignty in the House of Commons.',
    baseSupport: 8,
    strongProvinces: ['QC'],
    leader: 'Your Character',
    founded: 1991,
    tagline: 'Pour le Québec',
  },
  {
    id: 'green',
    name: 'Green Party of Canada',
    shortName: 'GPC',
    color: '#3D9B35',
    ideology: 'Green / Ecologism',
    description: 'Canada\'s environmentalist party focused on climate action, sustainability, and social justice.',
    baseSupport: 5,
    strongProvinces: ['BC', 'PE'],
    leader: 'Your Character',
    founded: 1983,
    tagline: 'Ready for Real Change',
  },
  {
    id: 'ppc',
    name: "People's Party of Canada",
    shortName: 'PPC',
    color: '#4B0082',
    ideology: 'Right-wing / Libertarian',
    description: 'A right-wing libertarian party advocating for economic freedom, limited government, and Canadian sovereignty.',
    baseSupport: 5,
    strongProvinces: ['AB', 'BC'],
    leader: 'Your Character',
    founded: 2018,
    tagline: 'Strong and Free',
  },
];

export const RIVAL_LEADERS: Record<string, string[]> = {
  liberal: ['Pierre Fontaine (CPC)', 'Rachel Lavoie (NDP)', 'Marc Tremblay (BQ)', 'Lisa Chen (GPC)'],
  conservative: ['Alex Moreau (LPC)', 'Sarah Mitchell (NDP)', 'Marc Tremblay (BQ)', 'Lisa Chen (GPC)'],
  ndp: ['Alex Moreau (LPC)', 'Pierre Fontaine (CPC)', 'Marc Tremblay (BQ)', 'Lisa Chen (GPC)'],
  bloc: ['Alex Moreau (LPC)', 'Pierre Fontaine (CPC)', 'Rachel Lavoie (NDP)', 'Lisa Chen (GPC)'],
  green: ['Alex Moreau (LPC)', 'Pierre Fontaine (CPC)', 'Rachel Lavoie (NDP)', 'Marc Tremblay (BQ)'],
  ppc: ['Alex Moreau (LPC)', 'Pierre Fontaine (CPC)', 'Rachel Lavoie (NDP)', 'Marc Tremblay (BQ)'],
};

export const MINISTERS_LIST = [
  'Finance',
  'Foreign Affairs',
  'Immigration',
  'Public Safety',
  'Defence',
  'Health',
  'Environment',
  'Justice',
  'Treasury Board',
  'Transport',
];

export const PARLIAMENTARY_SECRETARY_LIST = [
  'Finance PS',
  'Foreign Affairs PS',
  'Immigration PS',
  'Public Safety PS',
  'Defence PS',
];
