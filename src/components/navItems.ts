import { Home, Users, Wrench, Database, Settings } from 'lucide-react';

export type PageId = 'home' | 'roster' | 'build' | 'heroes' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'build', label: 'Build', icon: Wrench },
  { id: 'heroes', label: 'Heroes', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];
