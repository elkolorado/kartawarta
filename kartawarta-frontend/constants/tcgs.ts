export type AvailableTcg = {
  id: number;
  name: string;
  slug: string;
  label: string;
  color: string;
};

export const DEFAULT_TCG_NAME = 'DragonBallSuper';

export const AVAILABLE_TCGS: AvailableTcg[] = [
  { id: 1, name: 'DragonBallSuper', slug: 'DragonBallSuper', label: 'Fusion World', color: '#3b82f6' },
  { id: 5, name: 'riftbound', slug: 'riftbound', label: 'Riftbound', color: '#7c3aed' },
  { id: 1008, name: 'Cyberpunk', slug: 'cyberpunk', label: 'Cyberpunk', color: '#facc15' },
];

export const DEFAULT_TCG = AVAILABLE_TCGS[0];

export const normalizeTcgName = (value?: string | string[] | null) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return DEFAULT_TCG_NAME;

  const decoded = decodeURIComponent(raw);
  const match = AVAILABLE_TCGS.find(
    (tcg) => tcg.slug.toLowerCase() === decoded.toLowerCase() || tcg.name.toLowerCase() === decoded.toLowerCase()
  );

  return match?.name ?? decoded;
};

export const getTcgByName = (name?: string | null) => {
  const normalizedName = normalizeTcgName(name);
  return AVAILABLE_TCGS.find((tcg) => tcg.name.toLowerCase() === normalizedName.toLowerCase()) ?? DEFAULT_TCG;
};

export const getTcgPath = (tcgName?: string | null, tabName: string = 'index') => {
  const tcg = getTcgByName(tcgName);
  return tabName === 'index' ? `/${tcg.slug}` : `/${tcg.slug}/${tabName}`;
};
