import {
  Building2,
  Droplets,
  Flame,
  Hammer,
  Leaf,
  Shapes,
  Sofa,
  Thermometer,
  TreePine,
  Wifi,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const ICON_MAP: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ["hidraul", "hidro", "agua"], icon: Droplets },
  { keywords: ["eletr", "fotovolt", "energia"], icon: Zap },
  { keywords: ["estrut", "fundac", "concret"], icon: Building2 },
  { keywords: ["arquit", "interior", "decor", "mobil"], icon: Sofa },
  { keywords: ["gas", "glp"], icon: Flame },
  { keywords: ["ar cond", "climat", "hvac", "avac"], icon: Wind },
  { keywords: ["paisag", "jardim"], icon: TreePine },
  { keywords: ["sustent", "ambient", "eco"], icon: Leaf },
  { keywords: ["rede", "tele", "automac", "dados"], icon: Wifi },
  { keywords: ["terma", "aquec"], icon: Thermometer },
  { keywords: ["hidros", "drenag", "esgot"], icon: Droplets },
  { keywords: ["obra", "execuc", "manut"], icon: Wrench },
  { keywords: ["alvenar"], icon: Hammer },
];

export function getDisciplineIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Shapes;
  const n = normalize(name);
  for (const { keywords, icon } of ICON_MAP) {
    if (keywords.some((k) => n.includes(k))) return icon;
  }
  return Shapes;
}
