import {
  Activity,
  BedDouble,
  Heart,
  Home,
  LineChart,
  NotebookPen,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export const navItems: NavItem[] = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/sleep", label: "Sleep", icon: BedDouble },
  { href: "/recovery", label: "Recovery", icon: Heart },
  { href: "/strain", label: "Strain", icon: Activity },
  { href: "/health", label: "Health", icon: Stethoscope },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/trends", label: "Trends", icon: LineChart },
  { href: "/team", label: "Team", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

/** Items shown on the mobile bottom nav (5 max) */
export const bottomNavItems: NavItem[] = [
  navItems[0], // Today
  navItems[1], // Sleep
  navItems[2], // Recovery
  navItems[3], // Strain
  navItems[4], // Journal
];
