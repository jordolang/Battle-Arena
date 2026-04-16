import { Timestamp } from 'firebase/firestore';

export interface Team {
  id: string;
  name: string;
  goal: number;
  currentAmount: number;
  hp: number;
  colorScheme: string;
  badgeIcon: string;
  activityType: string;
  shieldActiveUntil: Timestamp | null;
  lastShareUserId: string | null;
  consecutiveSharesCount: number;
  schoolName: string;
  lastEmote?: {
    type: string;
    timestamp: number;
  };
  lastDamage?: {
    amount: number;
    timestamp: number;
  };
  members?: string[];
}

export interface Share {
  id: string;
  teamId: string;
  userId: string;
  timestamp: Timestamp;
  platform: string;
}

export interface Purchase {
  id: string;
  teamId: string;
  amount: number;
  timestamp: Timestamp;
}

export interface GlobalConfig {
  gameActive: boolean;
  lastUpdate: Timestamp;
}

export interface Message {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
}

export const ACTIVITY_ICONS: Record<string, string> = {
  Soccer: 'Trophy',
  Choir: 'Music',
  Basketball: 'Basketball',
  Football: 'Football',
  Band: 'Mic2',
  Drama: 'Theater',
  Science: 'FlaskConical',
  Art: 'Palette',
};
