import React from "react";
import {
  Home,
  Utensils,
  Car,
  Gamepad2,
  Pill,
  GraduationCap,
  Plane,
  ShoppingCart,
  Wallet,
  CreditCard,
  Smartphone,
  Zap,
  Film,
  Dumbbell,
  Palette,
  BookOpen,
  Tag,
  Coffee,
  HeartPulse,
  Gift,
  Wrench,
  Sparkles,
  ShoppingBag,
  Landmark,
  Tv,
  Music,
  Shield,
  HelpCircle,
  LucideIcon
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Named identifiers
  home: Home,
  food: Utensils,
  transport: Car,
  gaming: Gamepad2,
  health: Pill,
  education: GraduationCap,
  travel: Plane,
  shopping: ShoppingCart,
  salary: Wallet,
  bank: Landmark,
  card: CreditCard,
  phone: Smartphone,
  energy: Zap,
  entertainment: Film,
  sport: Dumbbell,
  art: Palette,
  books: BookOpen,
  coffee: Coffee,
  medical: HeartPulse,
  gift: Gift,
  services: Wrench,
  subscription: Tv,
  music: Music,
  insurance: Shield,
  tag: Tag,

  // Mapping from existing emojis in database
  "🏠": Home,
  "🍔": Utensils,
  "🍽️": Utensils,
  "🚗": Car,
  "🎮": Gamepad2,
  "💊": Pill,
  "🎓": GraduationCap,
  "✈️": Plane,
  "🛒": ShoppingCart,
  "🛍️": ShoppingBag,
  "💰": Wallet,
  "💳": CreditCard,
  "📱": Smartphone,
  "⚡": Zap,
  "🎬": Film,
  "🏋️": Dumbbell,
  "🎨": Palette,
  "📚": BookOpen,
  "☕": Coffee,
  "🏥": HeartPulse,
  "🎁": Gift,
  "🔧": Wrench,
  "🔒": Shield,
  "👕": ShoppingBag,
  "🔌": Zap,
};

export const AVAILABLE_CATEGORY_ICONS = [
  { name: "home", label: "Logement", icon: Home },
  { name: "food", label: "Alimentation", icon: Utensils },
  { name: "transport", label: "Transport", icon: Car },
  { name: "shopping", label: "Shopping", icon: ShoppingCart },
  { name: "salary", label: "Revenu / Salaire", icon: Wallet },
  { name: "card", label: "Banque / Carte", icon: CreditCard },
  { name: "travel", label: "Voyage", icon: Plane },
  { name: "health", label: "Santé", icon: Pill },
  { name: "energy", label: "Énergie / Factures", icon: Zap },
  { name: "entertainment", label: "Loisirs / Cinéma", icon: Film },
  { name: "subscription", label: "Abonnement", icon: Tv },
  { name: "gaming", label: "Jeux", icon: Gamepad2 },
  { name: "sport", label: "Sport", icon: Dumbbell },
  { name: "education", label: "Formation", icon: GraduationCap },
  { name: "phone", label: "Téléphone", icon: Smartphone },
  { name: "tag", label: "Autre", icon: Tag },
];

interface CategoryIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  color?: string;
}

export function CategoryIcon({ icon, className = "w-4 h-4", size = 16, color }: CategoryIconProps) {
  const IconComponent = (icon && CATEGORY_ICON_MAP[icon]) || Tag;
  return <IconComponent className={className} size={size} style={color ? { color } : undefined} />;
}
