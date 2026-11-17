import {
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  LayoutGrid,
  Plane,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Tone } from './ui';

/** Icon and colour for each ready-made category; custom categories get a neutral tag. */
const VISUALS: Record<string, { Icon: LucideIcon; tone: Tone }> = {
  'Food & Dining': { Icon: Utensils, tone: 'red' },
  Groceries: { Icon: ShoppingCart, tone: 'green' },
  'Rent & Housing': { Icon: House, tone: 'amber' },
  'Electricity & Bills': { Icon: Zap, tone: 'amber' },
  'Medical & Healthcare': { Icon: HeartPulse, tone: 'red' },
  Entertainment: { Icon: Clapperboard, tone: 'purple' },
  'Transport & Fuel': { Icon: Car, tone: 'green' },
  Education: { Icon: GraduationCap, tone: 'blue' },
  Shopping: { Icon: ShoppingBag, tone: 'purple' },
  Travel: { Icon: Plane, tone: 'blue' },
  Insurance: { Icon: ShieldCheck, tone: 'blue' },
  'EMI & Loans': { Icon: Landmark, tone: 'blue' },
  'Personal Expenses': { Icon: Smile, tone: 'purple' },
  Others: { Icon: LayoutGrid, tone: 'blue' },
};

export const categoryVisual = (name: string) => VISUALS[name] ?? { Icon: Tag, tone: 'slate' as Tone };
