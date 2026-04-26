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
  HardHat,
  Layers,
  Lightbulb,
  PlugZap,
  ShieldCheck,
  Truck,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface DisciplineIconEntry {
  name: string;
  icon: LucideIcon;
  label: string;
}

export const DISCIPLINE_ICONS: DisciplineIconEntry[] = [
  { name: "Shapes", icon: Shapes, label: "Geral" },
  { name: "Building2", icon: Building2, label: "Estrutura" },
  { name: "Sofa", icon: Sofa, label: "Arquitetura" },
  { name: "Droplets", icon: Droplets, label: "Hidráulica" },
  { name: "Waves", icon: Waves, label: "Drenagem" },
  { name: "Zap", icon: Zap, label: "Elétrica" },
  { name: "PlugZap", icon: PlugZap, label: "Energia" },
  { name: "Lightbulb", icon: Lightbulb, label: "Luminotécnica" },
  { name: "Flame", icon: Flame, label: "Gás" },
  { name: "Wind", icon: Wind, label: "Ar-Condicionado" },
  { name: "Thermometer", icon: Thermometer, label: "Térmico" },
  { name: "Wifi", icon: Wifi, label: "Redes" },
  { name: "TreePine", icon: TreePine, label: "Paisagismo" },
  { name: "Leaf", icon: Leaf, label: "Sustentabilidade" },
  { name: "Wrench", icon: Wrench, label: "Manutenção" },
  { name: "Hammer", icon: Hammer, label: "Alvenaria" },
  { name: "HardHat", icon: HardHat, label: "Obra" },
  { name: "Layers", icon: Layers, label: "Revestimento" },
  { name: "ShieldCheck", icon: ShieldCheck, label: "Segurança" },
  { name: "Truck", icon: Truck, label: "Logística" },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const KEYWORD_MAP: Array<{ keywords: string[]; name: string }> = [
  { keywords: ["hidraul", "hidro", "agua"], name: "Droplets" },
  { keywords: ["eletr", "fotovolt", "energia"], name: "Zap" },
  { keywords: ["estrut", "fundac", "concret"], name: "Building2" },
  { keywords: ["arquit", "interior", "decor", "mobil"], name: "Sofa" },
  { keywords: ["gas", "glp"], name: "Flame" },
  { keywords: ["ar cond", "climat", "hvac", "avac"], name: "Wind" },
  { keywords: ["paisag", "jardim"], name: "TreePine" },
  { keywords: ["sustent", "ambient", "eco"], name: "Leaf" },
  { keywords: ["rede", "tele", "automac", "dados"], name: "Wifi" },
  { keywords: ["terma", "aquec"], name: "Thermometer" },
  { keywords: ["hidros", "drenag", "esgot"], name: "Waves" },
  { keywords: ["obra", "execuc", "manut"], name: "Wrench" },
  { keywords: ["alvenar"], name: "Hammer" },
];

export function getDisciplineIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Shapes;
  const n = normalize(name);
  for (const { keywords, name: iconName } of KEYWORD_MAP) {
    if (keywords.some((k) => n.includes(k))) {
      return DISCIPLINE_ICONS.find((e) => e.name === iconName)?.icon ?? Shapes;
    }
  }
  return Shapes;
}

export function getDisciplineIconByName(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Shapes;
  return DISCIPLINE_ICONS.find((e) => e.name === iconName)?.icon ?? Shapes;
}

export function resolveDisciplineIcon(
  iconName: string | null | undefined,
  disciplineName: string | null | undefined,
): LucideIcon {
  if (iconName) return getDisciplineIconByName(iconName);
  return getDisciplineIcon(disciplineName);
}
