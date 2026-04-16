import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { Team, Share, Purchase, GlobalConfig, Message } from './types';

export function useGame() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestAction, setLatestAction] = useState<{ type: 'purchase' | 'share', teamName: string, amount?: number, timestamp: number } | null>(null);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const teamData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as GlobalConfig);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'config/settings'));

    return () => {
      unsubTeams();
      unsubConfig();
    };
  }, []);

  const handleShare = async (teamId: string, userId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);
        
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const team = teamDoc.data() as Team;
        let newConsecutiveCount = 1;
        
        if (team.lastShareUserId === userId) {
          newConsecutiveCount = (team.consecutiveSharesCount || 0) + 1;
        }

        // Rule: Same account can only activate shield 2x back to back
        if (newConsecutiveCount > 2) {
          throw new Error("You've reached the limit of consecutive shares. Another user must share to reset the limit.");
        }

        const oneHourFromNow = Timestamp.fromMillis(Date.now() + 3600000);
        
        transaction.update(teamRef, {
          shieldActiveUntil: oneHourFromNow,
          lastShareUserId: userId,
          consecutiveSharesCount: newConsecutiveCount,
          lastEmote: { type: '🛡️', timestamp: Date.now() }
        });

        const shareRef = doc(collection(db, 'shares'));
        transaction.set(shareRef, {
          teamId,
          userId,
          userName: auth.currentUser?.displayName || 'Anonymous Hero',
          timestamp: Timestamp.now(),
          platform: 'Facebook'
        });

        setLatestAction({
          type: 'share',
          teamName: team.name,
          timestamp: Date.now()
        });
      });
    } catch (error) {
      console.error("Share failed:", error);
      alert(error instanceof Error ? error.message : "Share failed");
    }
  };

  const handlePurchase = async (teamId: string, amount: number) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update the team that received the purchase
      const teamRef = doc(db, 'teams', teamId);
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const isBigPurchase = amount >= 100;
        batch.update(teamRef, {
          currentAmount: team.currentAmount + amount,
          lastEmote: { type: isBigPurchase ? '💰' : '⚔️', timestamp: Date.now() }
        });
      }

      // 2. Deal damage to all OTHER teams
      teams.forEach(t => {
        if (t.id !== teamId) {
          const isShielded = t.shieldActiveUntil && t.shieldActiveUntil.toMillis() > Date.now();
          if (!isShielded) {
            const newHp = Math.max(0, t.hp - amount);
            const isCritical = amount >= 50;
            batch.update(doc(db, 'teams', t.id), {
              hp: newHp,
              lastEmote: { type: isCritical ? '💥' : '💢', timestamp: Date.now() },
              lastDamage: { amount, timestamp: Date.now() }
            });
          } else {
            // Shield block emote
            batch.update(doc(db, 'teams', t.id), {
              lastEmote: { type: '✨', timestamp: Date.now() }
            });
          }
        }
      });

      // 3. Record the purchase
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, {
        teamId,
        amount,
        userId: auth.currentUser?.uid || 'anonymous',
        userName: auth.currentUser?.displayName || 'Anonymous Hero',
        timestamp: Timestamp.now()
      });

      await batch.commit();

      if (team) {
        setLatestAction({
          type: 'purchase',
          teamName: team.name,
          amount,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchases');
    }
  };

  const bootstrapGame = async () => {
    try {
      const batch = writeBatch(db);
      
      // 1. Create config
      const configRef = doc(db, 'config', 'settings');
      batch.set(configRef, {
        gameActive: true,
        lastUpdate: Timestamp.now()
      });

      // 2. Create some initial teams
      const initialTeams = [
        { name: 'Tigers Soccer', goal: 5000, schoolName: 'West High', activityType: 'Soccer', colorScheme: '#ef4444', members: ['Coach Miller', 'Alex J.', 'Sam K.', 'Jordan P.'] },
        { name: 'Harmony Choir', goal: 3000, schoolName: 'East High', activityType: 'Choir', colorScheme: '#8b5cf6', members: ['Ms. Song', 'Elena R.', 'David W.', 'Chloe M.'] },
        { name: 'Lions Football', goal: 10000, schoolName: 'Central High', activityType: 'Football', colorScheme: '#f59e0b', members: ['Coach Strong', 'Marcus T.', 'Leo G.', 'Tyler B.'] },
        { name: 'Jazz Band', goal: 4000, schoolName: 'North High', activityType: 'Band', colorScheme: '#10b981', members: ['Mr. Note', 'Miles D.', 'Sarah L.', 'Ben S.'] }
      ];

      initialTeams.forEach(t => {
        const teamRef = doc(collection(db, 'teams'));
        batch.set(teamRef, {
          ...t,
          currentAmount: 0,
          hp: t.goal,
          badgeIcon: ACTIVITY_ICONS[t.activityType] || 'Trophy',
          shieldActiveUntil: null,
          lastShareUserId: null,
          consecutiveSharesCount: 0
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Bootstrap failed:", error);
    }
  };

  const triggerEmote = async (teamId: string, emoteType: string) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        lastEmote: { type: emoteType, timestamp: Date.now() }
      });
    } catch (error) {
      console.error("Emote failed:", error);
    }
  };

  const sendMessage = async (teamId: string, text: string) => {
    if (!auth.currentUser) return;
    
    try {
      // Basic moderation: simple word filter
      const forbiddenWords = ['badword1', 'badword2']; // Example
      let filteredText = text;
      forbiddenWords.forEach(word => {
        const reg = new RegExp(word, 'gi');
        filteredText = filteredText.replace(reg, '***');
      });

      await addDoc(collection(db, 'messages'), {
        teamId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous Hero',
        text: filteredText,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  const updateTeamMembers = async (teamId: string, members: string[]) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, { members });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${teamId}`);
    }
  };

  const updateTeamSettings = async (teamId: string, updates: Partial<Team>) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${teamId}`);
    }
  };

  return { teams, config, loading, handleShare, handlePurchase, bootstrapGame, triggerEmote, sendMessage, updateTeamMembers, updateTeamSettings, latestAction };
}

const ACTIVITY_ICONS: Record<string, string> = {
  Soccer: 'Trophy',
  Choir: 'Music',
  Basketball: 'Dribbble',
  Football: 'Trophy',
  Band: 'Mic2',
  Drama: 'Theater',
  Science: 'FlaskConical',
  Art: 'Palette',
};
