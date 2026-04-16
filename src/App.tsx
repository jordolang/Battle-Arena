import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { 
  Trophy, 
  Shield, 
  Sword, 
  Share2, 
  Settings, 
  Users, 
  TrendingUp,
  Music,
  Dribbble,
  Mic2,
  Theater,
  FlaskConical,
  Palette,
  Heart,
  Zap,
  Star,
  X
} from 'lucide-react';
import { useGame } from './useGame';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  collection, 
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Team, Message } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatTimestamp(ts: any) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ICON_MAP: Record<string, any> = {
  Soccer: Trophy,
  Choir: Music,
  Basketball: Dribbble,
  Football: Trophy,
  Band: Mic2,
  Drama: Theater,
  Science: FlaskConical,
  Art: Palette,
  Trophy: Trophy
};

const ACTIVITY_ICONS: Record<string, any> = {
  Soccer: Trophy,
  Choir: Music,
  Basketball: Dribbble,
  Football: Trophy,
  Band: Mic2,
  Drama: Theater,
  Science: FlaskConical,
  Art: Palette,
};

const DEMO_HEADLINES = [
  "UNLEASH TEAM SPIRIT WITH EVERY DONATION",
  "GENERATE POWER SHIELDS FOR YOUR SQUAD",
  "DEFEAT RIVAL TEAMS IN REAL-TIME COMBAT",
  "SUPPORT YOUR SCHOOL, CLAIM THE CHAMPIONS CUP",
  "CLIMB THE LEADERBOARD IN THE ULTIMATE FUNDRAISER"
];

const PREVIOUS_WINNERS = [
  { season: "SEASON 1", team: "WEST HIGH TIGERS", school: "West High", icon: "Soccer" },
  { season: "SEASON 2", team: "HARMONY CHOIR", school: "East High", icon: "Choir" },
  { season: "SEASON 3", team: "NORTH HIGH JAZZ", school: "North High", icon: "Band" }
];

const DEFAULT_TEAMS: Team[] = [
  {
    id: 'default-1',
    name: 'Red Raiders',
    goal: 5000,
    currentAmount: 1250,
    hp: 3750,
    colorScheme: '#ef4444',
    badgeIcon: 'Soccer',
    activityType: 'Soccer',
    shieldActiveUntil: null,
    lastShareUserId: null,
    consecutiveSharesCount: 0,
    schoolName: 'West Valley High',
    members: ['Lead Captain', 'Defender X']
  },
  {
    id: 'default-2',
    name: 'Blue Blazers',
    goal: 5000,
    currentAmount: 2100,
    hp: 2900,
    colorScheme: '#3b82f6',
    badgeIcon: 'Band',
    activityType: 'Band',
    shieldActiveUntil: null,
    lastShareUserId: null,
    consecutiveSharesCount: 0,
    schoolName: 'East Side Academy',
    members: ['Trumpet King', 'Rhythm Section']
  }
];

function DemoOverlay({ active }: { active: boolean }) {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [winnerIndex, setWinnerIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const hTimer = setInterval(() => setHeadlineIndex(prev => (prev + 1) % DEMO_HEADLINES.length), 5000);
    const wTimer = setInterval(() => setWinnerIndex(prev => (prev + 1) % PREVIOUS_WINNERS.length), 8000);
    return () => { clearInterval(hTimer); clearInterval(wTimer); };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[500] pointer-events-none overflow-hidden select-none crt-flicker">
      {/* Cinematic Film Overlay */}
      <div className="absolute inset-0 bg-indigo-950/10 backdrop-brightness-75 backdrop-contrast-125 backdrop-saturate-[1.3] mix-blend-overlay" />
      <div className="absolute inset-0 demo-vignette" />
      <div className="absolute inset-0 crt-scanlines opacity-40" />
      
      {/* Animated Scanlines/Grain */}
      <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse" />

      {/* Demo Mode HUD */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-2xl shadow-[0_0_30px_rgba(234,179,8,0.5)] flex items-center gap-3 italic"
        >
          <Zap className="w-6 h-6 fill-current animate-bounce" />
          DEMO MODE
          <Zap className="w-6 h-6 fill-current animate-bounce" />
        </motion.div>
      </div>

      {/* Headline Carousel */}
      <div className="absolute bottom-40 left-0 w-full h-24 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.h2
            key={headlineIndex}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="text-4xl font-black uppercase tracking-tighter italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] text-center max-w-4xl"
          >
            {DEMO_HEADLINES[headlineIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      {/* Previous Winners Highlight */}
      <motion.div 
        className="absolute bottom-10 right-10 bg-black/80 border-2 border-yellow-500/50 p-4 rounded-2xl flex items-center gap-5 min-w-[350px]"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={winnerIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-grow"
          >
            <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1">Hall of Fame • {PREVIOUS_WINNERS[winnerIndex].season}</div>
            <div className="text-xl font-bold uppercase tracking-tight leading-none">{PREVIOUS_WINNERS[winnerIndex].team}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{PREVIOUS_WINNERS[winnerIndex].school}</div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Arcade Branding/Style */}
      <div className="absolute top-10 left-10 pointer-events-none opacity-40">
        <div className="text-[10px] font-mono text-white/50 mb-1">SYSTEM_STATUS: IDLE_SIMULATION</div>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse [animation-delay:0.2s]" />
          <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { teams: realTeams, config, loading, handleShare, handlePurchase, bootstrapGame, triggerEmote, sendMessage, updateTeamMembers, updateTeamSettings, latestAction } = useGame();
  const [view, setView] = useState<'arena' | 'scoreboard' | 'admin'>('arena');
  const [user, setUser] = useState(auth.currentUser);
  const [teams, setTeams] = useState<Team[]>([]);
  const isDemoMode = config?.gameActive === false;

  useEffect(() => {
    if (!loading) {
      setTeams(realTeams.length > 0 ? realTeams : DEFAULT_TEAMS);
    }
  }, [realTeams, loading]);

  useEffect(() => {
    if (!isDemoMode || teams.length === 0) return;

    const simulationInterval = setInterval(() => {
      // Simulate battle actions locally for demo
      const randomTeamIndex = Math.floor(Math.random() * teams.length);
      const actionType = Math.random() > 0.5 ? 'emote' : 'damage';
      
      setTeams(prev => prev.map((t, i) => {
        if (i === randomTeamIndex) {
          if (actionType === 'emote') {
            const emotes = ['🔥', '⚔️', '🛡️', '👑', '💯', '🚀'];
            return { ...t, lastEmote: { type: emotes[Math.floor(Math.random() * emotes.length)], timestamp: Date.now() } };
          } else {
            return { ...t, lastDamage: { amount: Math.floor(Math.random() * 50) + 10, timestamp: Date.now() }, hp: Math.max(0, t.hp - 10) };
          }
        }
        return t;
      }));
    }, 2500);

    return () => clearInterval(simulationInterval);
  }, [isDemoMode, teams.length]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const isAdmin = user?.email === 'mike@josemadridsalsa.com';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Zap className="w-12 h-12 text-yellow-400" />
        </motion.div>
        <span className="ml-4 text-xl tracking-widest uppercase">Loading Arena...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <DemoOverlay active={isDemoMode} />
      <ActionNotification action={latestAction} />
      {/* HUD Header */}
      <header className="px-10 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-50">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Fundraising Battle Season 4</span>
          <h1 className="text-xl font-bold tracking-tight">CHAMPIONS ARENA</h1>
        </div>
        
        <div className="text-2xl font-bold text-[var(--accent-gold)] drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
          22d : 14h : 05m
        </div>

        <div className="flex items-center gap-4">
          <NavButton active={view === 'arena'} onClick={() => setView('arena')} icon={<Sword className="w-4 h-4" />} label="Battle" />
          <NavButton active={view === 'scoreboard'} onClick={() => setView('scoreboard')} icon={<TrendingUp className="w-4 h-4" />} label="Scores" />
          {isAdmin && (
            <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Settings className="w-4 h-4" />} label="Admin" />
          )}
          
          <div className="h-6 w-px bg-slate-800 mx-2" />
          
          {user ? (
            <button onClick={logout} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
              Logout
            </button>
          ) : (
            <button onClick={login} className="bg-white text-slate-950 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[var(--accent-gold)] transition-all">
              Login
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow relative flex flex-col">
        <AnimatePresence mode="wait">
          {view === 'arena' && (
            <motion.div
              key="arena"
              className="flex-grow flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BattleArena 
                teams={teams} 
                onShare={handleShare} 
                onPurchase={handlePurchase} 
                onEmote={triggerEmote} 
                onSendMessage={sendMessage} 
                onViewChange={setView} 
                isAdmin={isAdmin}
                onUpdateMembers={updateTeamMembers}
                onUpdateTeam={updateTeamSettings}
                isDemoMode={isDemoMode}
                latestAction={latestAction}
              />
            </motion.div>
          )}
          
          {view === 'scoreboard' && (
            <motion.div
              key="scoreboard"
              className="max-w-7xl mx-auto p-10 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Scoreboard teams={teams} />
            </motion.div>
          )}

          {view === 'admin' && isAdmin && (
            <motion.div
              key="admin"
              className="max-w-7xl mx-auto p-10 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminPanel teams={teams} onBootstrap={bootstrapGame} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Status */}
      <footer className="bg-slate-950/50 px-6 py-1 flex items-center justify-between text-[8px] uppercase tracking-[0.3em] font-bold text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> Live Server</span>
          <span>{teams.length} Teams Active</span>
        </div>
        <div>© 2026 Arena Fundraiser RPG</div>
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
        active ? "bg-slate-800 text-white shadow-inner" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionNotification({ action }: { action: { type: 'purchase' | 'share', teamName: string, amount?: number, timestamp: number } | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (action) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [action]);

  return (
    <AnimatePresence mode="wait">
      {visible && action && (
        <motion.div
          key={`${action.type}-${action.timestamp}`}
          initial={{ opacity: 0, x: 50, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
          className="fixed top-24 right-10 z-[100] pointer-events-none"
        >
          <div className="bg-black/90 border-2 border-[var(--accent-gold)] p-4 rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.3)] flex items-center gap-4 min-w-[300px]">
            <div className="bg-[var(--accent-gold)] p-2 rounded-lg">
              {action.type === 'purchase' ? <Sword className="w-6 h-6 text-black" /> : <Shield className="w-6 h-6 text-black" />}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                {action.type === 'purchase' ? 'Attack Command' : 'Shield Activated'}
              </div>
              <div className="text-sm font-bold">
                {action.type === 'purchase' ? (
                  <>
                    <span className="text-white">{action.teamName}</span> dealt <span className="text-red-500">{action.amount} DMG</span> to all enemies!
                  </>
                ) : (
                  <>
                    <span className="text-white">{action.teamName}</span> generated a <span className="text-[var(--shield-glow)]">1HR SHIELD</span>!
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const BATTLE_EMOTES = [
  { type: '🔥', label: 'FIRE' },
  { type: '⚔️', label: 'ATTACK' },
  { type: '🛡️', label: 'DEFEND' },
  { type: '👑', label: 'CROWN' },
  { type: '💯', label: 'MAX' },
  { type: '🚀', label: 'BOOST' },
  { type: '🙌', label: 'HYPE' },
  { type: '✨', label: 'MAGIC' }
];

function DynamicArenaBg({ team, bgType, action }: { team: Team | null, bgType: number, action: any }) {
  if (!team) return null;
  const color = team.colorScheme || '#3b82f6';
  const controls = useAnimation();

  useEffect(() => {
    if (action) {
      if (action.type === 'purchase') {
        controls.start({
          backgroundColor: [color, '#ff0000', color],
          opacity: [0.2, 0.6, 0.2],
          transition: { duration: 0.5 }
        });
      } else if (action.type === 'share') {
        controls.start({
          backgroundColor: [color, '#00f2ff', color],
          opacity: [0.2, 0.8, 0.2],
          transition: { duration: 0.8 }
        });
      }
    }
  }, [action, color, controls]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${team.id || 'none'}-${bgType}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {/* Base Atmospheric Glow - Now Interactive */}
          <motion.div 
            animate={controls}
            initial={{ opacity: 0.2, backgroundColor: color }}
            className="absolute inset-0 transition-all duration-1000"
            style={{ 
              background: `radial-gradient(circle at 50% 50%, currentColor 0%, transparent 70%)`,
              color: color
            }}
          />

          {/* Procedural Pattern Layer */}
          {bgType === 0 && (
            <motion.div 
              animate={{ 
                opacity: [0.1, 0.2, 0.1],
                scale: action?.type === 'purchase' ? [1, 1.05, 1] : 1
              }}
              transition={{ 
                opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 0.4 }
              }}
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to right, ${color}33 1px, transparent 1px), linear-gradient(to bottom, ${color}33 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
              }}
            />
          )}

          {bgType === 1 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: action?.type === 'share' ? [1, 1.2, 1] : 1
                }}
                transition={{ 
                  rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                  scale: { duration: 0.5 }
                }}
                className="w-[150%] h-[150%] opacity-10"
                style={{
                  background: `conic-gradient(from 0deg at 50% 50%, ${color} 0deg, transparent 60deg, ${color} 180deg, transparent 240deg, ${color} 360deg)`
                }}
              />
            </div>
          )}

          {bgType === 2 && (
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ 
                    opacity: [0, 0.15, 0],
                    y: '-10%',
                    x: `${(i * 5) % 100}%`,
                    height: action?.type === 'purchase' ? ['40%', '50%', '30%'] : '30%'
                  }}
                  transition={{
                    duration: (5 + (i % 5)) / (action?.type === 'purchase' ? 2 : 1),
                    repeat: Infinity,
                    delay: (i % 10) * 0.5,
                    ease: "linear"
                  }}
                  className="absolute bottom-0 w-[2px] h-[30%] blur-[1px]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {bgType === 3 && (
            <motion.div 
              animate={{ 
                opacity: action?.type === 'purchase' ? [0.05, 0.2, 0.05] : 0.05,
              }}
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} 2px, transparent 2px, transparent 20px)`,
                backgroundSize: '100% 100%'
              }}
            />
          )}

          {bgType === 4 && (
            <div className="absolute inset-0 overflow-hidden">
               <motion.div 
                 animate={{ 
                   scale: action?.type === 'share' ? [1.2, 1.5, 1.2] : [1, 1.2, 1],
                   x: [0, 50, 0],
                   y: [0, 30, 0]
                 }}
                 transition={{ 
                   duration: action?.type === 'share' ? 5 : 15, 
                   repeat: Infinity, 
                   ease: "easeInOut" 
                 }}
                 className="absolute -inset-20 opacity-10"
                 style={{
                   background: `radial-gradient(circle at 30% 30%, ${color} 0%, transparent 40%), radial-gradient(circle at 70% 70%, ${color} 0%, transparent 40%)`
                 }}
               />
            </div>
          )}

          {bgType === 5 && (
            <motion.div 
              animate={{ 
                scale: action?.type === 'purchase' ? [1, 1.1, 1] : 1
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45v-30z' fill-opacity='0.4' fill='%23${color.replace('#', '')}' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '80px 70px'
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BattleArena({ 
  teams, 
  onShare, 
  onPurchase, 
  onEmote, 
  onSendMessage, 
  onViewChange,
  isAdmin,
  onUpdateMembers,
  onUpdateTeam,
  isDemoMode,
  latestAction
}: { 
  teams: Team[], 
  onShare: (tid: string, uid: string) => void, 
  onPurchase: (tid: string, amt: number) => void, 
  onEmote: (tid: string, emote: string) => void, 
  onSendMessage: (tid: string, text: string) => void, 
  onViewChange: (v: 'arena' | 'scoreboard' | 'admin') => void,
  isAdmin: boolean,
  onUpdateMembers: (tid: string, members: string[]) => void,
  onUpdateTeam: (tid: string, updates: Partial<Team>) => void,
  isDemoMode: boolean,
  latestAction: any
}) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(teams[0] || null);
  const [activeTab, setActiveTab] = useState<'log' | 'chat'>('log');
  const [showDetailsTeam, setShowDetailsTeam] = useState<Team | null>(null);
  const [bgType, setBgType] = useState<number>(0);
  const user = auth.currentUser;

  // Sync selectedTeam if teams change (in demo mode they update frequently)
  useEffect(() => {
    if (selectedTeam) {
      const updated = teams.find(t => t.id === selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    } else if (teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams]);

  // Demo Mode: Auto-cycle focal team
  useEffect(() => {
    if (!isDemoMode || teams.length === 0) return;
    const cycleTimer = setInterval(() => {
      const currentIndex = teams.findIndex(t => t.id === selectedTeam?.id);
      const nextIndex = (currentIndex + 1) % teams.length;
      setSelectedTeam(teams[nextIndex]);
    }, 10000); // Cycle every 10s
    return () => clearInterval(cycleTimer);
  }, [isDemoMode, teams, selectedTeam?.id]);

  useEffect(() => {
    setBgType(Math.floor(Math.random() * 6));
  }, [selectedTeam?.id]);

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-slate-950">
      <DynamicArenaBg team={selectedTeam} bgType={bgType} action={latestAction} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-10" />
      <AnimatePresence mode="wait">
        {showDetailsTeam && (
          <TeamDetailsModal 
            team={showDetailsTeam} 
            teams={teams} 
            onClose={() => setShowDetailsTeam(null)} 
            isAdmin={isAdmin}
            onUpdateMembers={onUpdateMembers}
            onUpdateTeam={onUpdateTeam}
          />
        )}
      </AnimatePresence>

      {/* Arena Stage */}
      <div className="flex-grow relative flex justify-around items-center px-20">
        {/* Floor Graphic */}
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 w-[80%] h-[60px] floor-gradient z-0" />
        
        {/* Player Side */}
        <div className="z-10 flex flex-col items-center gap-10">
          {selectedTeam && <PlayerSprite team={selectedTeam} onEmote={onEmote} onViewDetails={setShowDetailsTeam} />}
        </div>

        <div className="text-4xl font-black opacity-30 italic select-none">VS</div>

        {/* Enemy Side */}
        <div className="z-10 flex flex-col items-center gap-10">
          {teams.filter(t => t.id !== selectedTeam?.id).slice(0, 2).map((enemy, i) => (
            <EnemySprite key={enemy.id} team={enemy} index={i} onEmote={onEmote} onViewDetails={setShowDetailsTeam} />
          ))}
        </div>
      </div>

      {/* RPG Menu Bottom */}
      <div className="h-[280px] rpg-menu-gradient border-t-4 border-[var(--rpg-border)] p-5 grid grid-cols-[250px_1fr_300px] gap-5">
        {/* Actions */}
        <div className="border-2 border-white/30 rounded-lg p-3 flex flex-col gap-2">
          <MenuItem 
            onClick={() => user && selectedTeam && onShare(selectedTeam.id, user.uid)}
            disabled={!user || !selectedTeam}
            label="SHARE FOR SHIELD"
          />
          <MenuItem 
            onClick={() => selectedTeam && onPurchase(selectedTeam.id, 25)}
            disabled={!selectedTeam}
            label="DEAL $25 DAMAGE"
          />
          <MenuItem 
            onClick={() => selectedTeam && setShowDetailsTeam(selectedTeam)}
            disabled={!selectedTeam}
            label="VIEW TEAM PAGE"
          />
          <MenuItem 
            onClick={() => setBgType((prev) => (prev + 1) % 6)}
            label="SHUFFLE STAGE"
          />
        </div>

        {/* Chat / Battle Log Tabs */}
        <div className="flex flex-col gap-3">
          {/* Emote Gallery */}
          <div className="border-2 border-white/30 rounded-lg bg-black/30 p-2 overflow-hidden">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1">Trigger Emote</div>
            <div className="flex gap-2 items-center overflow-x-auto custom-scrollbar pb-1">
              {BATTLE_EMOTES.map((emote) => (
                <button
                  key={emote.type}
                  onClick={() => selectedTeam && onEmote(selectedTeam.id, emote.type)}
                  disabled={!selectedTeam}
                  className="flex flex-col items-center justify-center min-w-[44px] h-[44px] bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 active:scale-95 transition-all group disabled:opacity-30"
                >
                  <span className="text-xl group-hover:scale-125 transition-transform">{emote.type}</span>
                  <span className="text-[7px] font-black tracking-tighter text-slate-500">{emote.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-grow border-2 border-white/30 rounded-lg flex flex-col bg-black/30 overflow-hidden min-h-0">
            <div className="flex border-b border-white/20 shrink-0">
              <button 
                onClick={() => setActiveTab('log')}
                className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-r border-white/20 transition-colors", activeTab === 'log' ? "bg-white/10" : "hover:bg-white/5")}
              >
                Battle Log
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors", activeTab === 'chat' ? "bg-white/10" : "hover:bg-white/5")}
              >
                Team Chat
              </button>
            </div>
            
            <div className="flex-grow p-4 font-mono text-sm overflow-hidden flex flex-col">
              {activeTab === 'log' ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  <div className="border-l-3 border-[var(--accent-gold)] pl-2 mb-2">[System] Battle initiated. Goal is Victory!</div>
                  <div className="border-l-3 border-[var(--shield-glow)] pl-2 mb-2">[Social] Sarah M. shared the link! Shield generated for 1 hour.</div>
                  <div className="border-l-3 border-[var(--damage-color)] pl-2 mb-2">[Action] Donor #402 purchased $50! All enemies take 50 DMG.</div>
                  <div className="border-l-3 border-white/30 pl-2 mb-2">[Status] Shield blocked incoming damage.</div>
                </div>
              ) : (
                selectedTeam && (
                  <TeamChat teamId={selectedTeam.id} onSendMessage={onSendMessage} />
                )
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Peek */}
        <div className="border-2 border-white/30 rounded-lg p-3">
          <div className="text-[11px] font-bold mb-2 border-b border-white/20 pb-1 uppercase">Current Leaders</div>
          <div className="space-y-1">
            {[...teams].sort((a, b) => b.currentAmount - a.currentAmount).slice(0, 4).map((t, i) => (
              <div key={t.id} className="flex justify-between text-[12px] py-1 border-b border-white/10">
                <span className="truncate max-w-[180px]">{i + 1}. {t.name}</span>
                <span className="font-mono">${t.currentAmount}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => onViewChange('scoreboard')}
            className="mt-2 w-full text-[10px] text-center text-[var(--accent-gold)] font-bold uppercase hover:underline"
          >
            View Full Scoreboard →
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamDetailsModal({ 
  team, 
  teams, 
  onClose, 
  isAdmin, 
  onUpdateMembers,
  onUpdateTeam
}: { 
  team: Team, 
  teams: Team[], 
  onClose: () => void, 
  isAdmin: boolean,
  onUpdateMembers: (tid: string, members: string[]) => void,
  onUpdateTeam: (tid: string, updates: Partial<Team>) => void
}) {
  const [history, setHistory] = useState<{ type: 'share' | 'purchase', amount?: number, timestamp: any, id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState('');

  const sortedTeams = [...teams].sort((a, b) => b.currentAmount - a.currentAmount);
  const rank = sortedTeams.findIndex(t => t.id === team.id) + 1;
  const neighbors = sortedTeams.slice(Math.max(0, rank - 2), Math.min(sortedTeams.length, rank + 1));

  const handleUpdateColor = (color: string) => {
    onUpdateTeam(team.id, { colorScheme: color });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim()) return;
    const updatedMembers = [...(team.members || []), newMember.trim()];
    onUpdateMembers(team.id, updatedMembers);
    setNewMember('');
  };

  const handleRemoveMember = (index: number) => {
    const updatedMembers = (team.members || []).filter((_, i) => i !== index);
    onUpdateMembers(team.id, updatedMembers);
  };

  useEffect(() => {
    // Fetch shares and purchases for this team
    const sharesQuery = query(collection(db, 'shares'), where('teamId', '==', team.id), orderBy('timestamp', 'desc'), limit(10));
    const purchasesQuery = query(collection(db, 'purchases'), where('teamId', '==', team.id), orderBy('timestamp', 'desc'), limit(10));

    let shares: any[] = [];
    let purchases: any[] = [];

    const unsubShares = onSnapshot(sharesQuery, (snap) => {
      shares = snap.docs.map(doc => ({ ...doc.data(), type: 'share', id: doc.id }));
      combine();
    });

    const unsubPurchases = onSnapshot(purchasesQuery, (snap) => {
      purchases = snap.docs.map(doc => ({ ...doc.data(), type: 'purchase', id: doc.id }));
      combine();
    });

    const combine = () => {
      const combined = [...shares, ...purchases].sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setHistory(combined);
      setLoading(false);
    };

    return () => {
      unsubShares();
      unsubPurchases();
    };
  }, [team.id]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border-2 border-[var(--rpg-border)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start" style={{ backgroundColor: `${team.colorScheme}11` }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2" style={{ borderColor: team.colorScheme, backgroundColor: `${team.colorScheme}22` }}>
                {React.createElement(ICON_MAP[team.badgeIcon] || Trophy, { className: "w-8 h-8 text-white" })}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-[#0a0a0a] shadow-lg">
                RANK #{rank}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">{team.name}</h2>
                {team.shieldActiveUntil && team.shieldActiveUntil.toMillis() > Date.now() && (
                  <div className="px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-black rounded flex items-center gap-1 animate-pulse shrink-0">
                    <Shield className="w-3 h-3" />
                    <ShieldTimer until={team.shieldActiveUntil} />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{team.schoolName} • {team.activityType}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-2 gap-8">
          {/* Left: Progress & Members */}
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Fundraising Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-black text-[var(--accent-gold)]">${team.currentAmount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-mono mb-1">GOAL: ${team.goal.toLocaleString()}</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(team.currentAmount / team.goal) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: team.colorScheme, boxShadow: `0 0 15px ${team.colorScheme}aa` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">{(team.currentAmount / team.goal * 100).toFixed(1)}% of goal reached</p>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Team Members</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {team.members?.map((member, i) => (
                  <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 group">
                    {member}
                    {isAdmin && (
                      <button 
                        onClick={() => handleRemoveMember(i)}
                        className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )) || <p className="text-xs text-slate-500 italic">No members listed yet.</p>}
              </div>

              {isAdmin && (
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    placeholder="Add member name..."
                    className="flex-grow bg-black/50 border border-white/20 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                  <button 
                    type="submit"
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Add
                  </button>
                </form>
              )}
            </section>

            {isAdmin && (
              <section className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Team Theme</h3>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-white/20" 
                    style={{ backgroundColor: team.colorScheme }}
                  />
                  <input 
                    type="color" 
                    value={team.colorScheme}
                    onChange={(e) => handleUpdateColor(e.target.value)}
                    className="bg-transparent border-0 cursor-pointer w-full h-8"
                  />
                </div>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-2">Pick a color to instantly update team UI elements</p>
              </section>
            )}

            <section className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Defense Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Shield Status</p>
                  {team.shieldActiveUntil && team.shieldActiveUntil.toMillis() > Date.now() ? (
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Shield className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-tighter">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shield className="w-4 h-4 opacity-30" />
                      <span className="text-xs font-bold uppercase tracking-tighter">Inactive</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Share Streak</p>
                  <div className="flex items-center gap-2 text-[var(--accent-gold)]">
                    <Share2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-tighter">{team.consecutiveSharesCount || 0} / 2</span>
                  </div>
                </div>
              </div>
              {team.shieldActiveUntil && team.shieldActiveUntil.toMillis() > Date.now() && (
                <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-cyan-400/70 font-mono">
                  EXPIRES: <ShieldTimer until={team.shieldActiveUntil} />
                </div>
              )}
            </section>
          </div>

          {/* Right: Competition & History */}
          <div className="flex flex-col h-[400px] space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Competition Rank</h3>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {neighbors.map((t, i) => {
                  const tRank = sortedTeams.findIndex(st => st.id === t.id) + 1;
                  const isCurrent = t.id === team.id;
                  return (
                    <div key={t.id} className={cn(
                      "flex items-center justify-between p-3 border-b border-white/5 last:border-0",
                      isCurrent ? "bg-white/10" : ""
                    )}>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-[10px] font-black w-4", isCurrent ? "text-yellow-500" : "text-slate-500")}>#{tRank}</span>
                        <span className={cn("text-xs font-bold uppercase tracking-tight", isCurrent ? "text-white" : "text-slate-400")}>{t.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">${t.currentAmount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="flex-grow flex flex-col min-h-0">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Recent Activity</h3>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 animate-pulse font-mono">SYNCHRONIZING RECENT DATA...</div>
                ) : history.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">No activity recorded for this unit.</div>
                ) : (
                  <AnimatePresence mode="wait">
                    {history.map((item, i) => (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg", 
                            item.type === 'purchase' ? "bg-red-500/20 text-red-500" : "bg-cyan-500/20 text-cyan-500"
                          )}>
                            {item.type === 'purchase' ? <Sword className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight">
                              {item.type === 'purchase' ? `Attack: $${item.amount}` : 'Shield Link Deployment'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-[var(--accent-gold)] font-bold uppercase tracking-wider">{item.userName || 'Hero'}</span>
                              <span className="text-[9px] text-slate-600">•</span>
                              <p className="text-[9px] text-slate-500 font-mono">
                                {item.timestamp ? formatTimestamp(item.timestamp) : 'Just moments ago'} 
                              </p>
                            </div>
                          </div>
                        </div>
                        {item.type === 'share' && <div className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase font-black">+60m DEF</div>}
                        {item.type === 'purchase' && <div className="text-[8px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30 uppercase font-black">-{item.amount} DMG</div>}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>
        </div>
      </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-2 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-[var(--accent-gold)] transition-all"
          >
            Return to Arena
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TeamChat({ teamId, onSendMessage }: { teamId: string, onSendMessage: (tid: string, text: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('teamId', '==', teamId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
      setMessages(msgs);
    });

    return () => unsub();
  }, [teamId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(teamId, inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-grow overflow-y-auto custom-scrollbar space-y-2 mb-2 pr-2">
        {messages.length === 0 && (
          <div className="text-slate-500 text-xs italic">No messages yet. Be the first to rally your team!</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs">
            <span className="text-[var(--accent-gold)] font-bold mr-2">[{msg.userName}]</span>
            <span className="text-slate-300">{msg.text}</span>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-black/50 border border-white/20 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent-gold)]"
        />
        <button 
          type="submit"
          className="bg-[var(--accent-gold)] text-black px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ShieldVisuals({ burst }: { burst?: boolean }) {
  return (
    <>
      {/* Burst Effect on activation */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key="shield-burst"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 bg-[var(--shield-glow)] rounded-full pointer-events-none filter blur-md"
          />
        )}
      </AnimatePresence>
      {/* Rotating Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-12px] border-2 border-dashed border-[var(--shield-glow)]/40 rounded-full pointer-events-none"
      />
      {/* Pulsing Inner Aura */}
      <motion.div
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[-6px] bg-[var(--shield-glow)] rounded-full pointer-events-none blur-sm"
      />
    </>
  );
}

function ShieldTimer({ until }: { until: any }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = until.toMillis();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);

  return <span className="ml-1.5 opacity-80">{timeLeft}</span>;
}

function DamageNumber({ damage }: { damage?: { amount: number, timestamp: number } }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (damage && Date.now() - damage.timestamp < 1000) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [damage]);

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={damage?.timestamp}
          initial={{ opacity: 0, y: 0, scale: 0, rotate: -20 }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            y: -150, 
            scale: [1, 2.5, 2.2],
            rotate: [Math.random() * 20 - 10, Math.random() * 40 - 20]
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ 
            type: "spring",
            stiffness: 400,
            damping: 10,
            duration: 0.8
          }}
          className="absolute z-50 pointer-events-none text-red-500 font-black italic drop-shadow-[0_0_15px_rgba(239,68,68,1)] text-4xl select-none"
        >
          -{damage?.amount}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EmoteDisplay({ emote }: { emote?: { type: string, timestamp: number } }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (emote && Date.now() - emote.timestamp < 2000) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [emote]);

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={emote?.timestamp}
          initial={{ opacity: 0, y: 20, scale: 0 }}
          animate={{ 
            opacity: 1, 
            y: [-100, -110, -100], 
            scale: 1.8,
            rotate: [0, -5, 5, 0]
          }}
          exit={{ opacity: 0, scale: 0, y: -150 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 15,
            y: {
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }
          }}
          className="absolute z-50 pointer-events-none text-5xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
        >
          {emote?.type}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function MenuItem({ label, onClick, disabled }: { label: string, onClick: () => void, disabled?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-left hover:text-[var(--accent-gold)] transition-colors disabled:opacity-30"
    >
      <div className={cn("w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-white transition-opacity", hovered ? "opacity-100" : "opacity-0")} />
      {label}
    </button>
  );
}

function PlayerSprite({ team, onEmote, onViewDetails }: { team: Team, onEmote: (tid: string, e: string) => void, onViewDetails: (team: Team) => void }) {
  const Icon = ICON_MAP[team.badgeIcon] || Trophy;
  const isShielded = team.shieldActiveUntil && team.shieldActiveUntil.toMillis() > Date.now();
  const controls = useAnimation();
  const prevHp = useRef(team.hp);
  const [shieldBurst, setShieldBurst] = useState(false);
  const prevShielded = useRef(isShielded);

  useEffect(() => {
    if (isShielded && !prevShielded.current) {
      setShieldBurst(true);
      setTimeout(() => setShieldBurst(false), 1000);
    }
    prevShielded.current = isShielded;
  }, [isShielded]);

  useEffect(() => {
    if (team.hp < prevHp.current) {
      controls.start({
        x: [0, -20, 20, -15, 15, -10, 10, 0],
        rotate: [0, -5, 5, -3, 3, 0],
        filter: [
          "brightness(1) contrast(1)",
          "brightness(3) contrast(2) saturate(2) hue-rotate(-60deg)",
          "brightness(1) contrast(1)"
        ],
        transition: { 
          duration: 0.4, 
          ease: "easeOut",
          x: { type: "spring", stiffness: 1000, damping: 10 }
        }
      });
    } else {
      controls.start({ x: 0, opacity: 1, rotate: 0, filter: "brightness(1)" });
    }
    prevHp.current = team.hp;
  }, [team.hp, controls]);

  const handleEasterEgg = () => {
    const easterEggs = ['🔥', '⭐', '🌈', '👻', '👽', '🍕'];
    const randomEmote = easterEggs[Math.floor(Math.random() * easterEggs.length)];
    onEmote(team.id, randomEmote);
  };

  return (
    <motion.div 
      layoutId="player"
      className="relative flex flex-col items-center w-[240px]"
      initial={{ x: -100, opacity: 0 }}
      animate={{ 
        ...controls,
        y: [0, -10, 0]
      }}
      transition={{
        y: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <EmoteDisplay emote={team.lastEmote} />
      <DamageNumber damage={team.lastDamage} />
      
      <div 
        onClick={handleEasterEgg}
        className={cn(
          "w-[120px] h-[120px] bg-[#111] border-4 border-[var(--rpg-border)] rounded-full flex items-center justify-center text-5xl shadow-2xl relative transition-all duration-500 cursor-pointer active:scale-90 group",
          isShielded && "shield-active-glow"
        )}
        style={{ boxShadow: !isShielded ? `0 0 20px ${team.colorScheme}44` : undefined, borderColor: !isShielded ? team.colorScheme : undefined }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onViewDetails(team); }}
          className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
        >
          <span className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-3 py-1 rounded">View Details</span>
        </button>
        {isShielded && <ShieldVisuals burst={shieldBurst} />}
        <Icon className="w-16 h-16 text-white" />
        <AnimatePresence>
          {isShielded && (
            <motion.div 
              key="shield-badge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-5 bg-[var(--shield-glow)] text-black font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest flex items-center whitespace-nowrap"
            >
              Shield Active <ShieldTimer until={team.shieldActiveUntil} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div 
        className="w-full bg-black/70 p-3 border rounded-lg mt-4 overflow-hidden relative"
        style={{ borderColor: `${team.colorScheme}66` }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-1 opacity-50"
          style={{ backgroundColor: team.colorScheme }}
        />
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1 relative z-10">
          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${team.colorScheme}33` }}>{team.name}</span>
          <span className="text-[var(--accent-gold)]">LV. {Math.floor(team.currentAmount / 100) + 1}</span>
        </div>
        <div className="h-3 bg-[#333] rounded-full overflow-hidden border border-[#444] relative">
          <motion.div 
            className="h-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${(team.hp / team.goal) * 100}%` }}
            style={{ 
              backgroundColor: team.colorScheme,
              boxShadow: `0 0 15px ${team.colorScheme}aa`
            }}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/20" />
            {/* Inner Glow */}
            <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(255,255,255,0.3)]" />
          </motion.div>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 text-right font-mono">
          ${team.currentAmount.toLocaleString()} / ${team.goal.toLocaleString()} GOAL
        </div>
      </div>
    </motion.div>
  );
}

interface EnemySpriteProps {
  key?: React.Key;
  team: Team;
  index: number;
  onEmote: (tid: string, e: string) => void;
  onViewDetails: (team: Team) => void;
}

function EnemySprite({ team, index, onEmote, onViewDetails }: EnemySpriteProps) {
  const Icon = ICON_MAP[team.badgeIcon] || Trophy;
  const isShielded = team.shieldActiveUntil && team.shieldActiveUntil.toMillis() > Date.now();
  const controls = useAnimation();
  const prevHp = useRef(team.hp);
  const [shieldBurst, setShieldBurst] = useState(false);
  const prevShielded = useRef(isShielded);

  useEffect(() => {
    if (isShielded && !prevShielded.current) {
      setShieldBurst(true);
      setTimeout(() => setShieldBurst(false), 1000);
    }
    prevShielded.current = isShielded;
  }, [isShielded]);

  useEffect(() => {
    if (team.hp < prevHp.current) {
      controls.start({
        x: [0, -15, 15, -10, 10, -5, 5, 0],
        scale: [1, 0.9, 1.05, 1],
        filter: [
          "brightness(1)",
          "brightness(2.5) saturate(2) hue-rotate(-50deg)",
          "brightness(1)"
        ],
        transition: { 
          duration: 0.35, 
          ease: "linear",
          x: { type: "spring", stiffness: 800, damping: 8 }
        }
      });
    } else {
      controls.start({ x: 0, opacity: 1, filter: "brightness(1)" });
    }
    prevHp.current = team.hp;
  }, [team.hp, controls]);

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{
        ...controls,
        y: [0, -8, 0]
      }}
      transition={{ 
        delay: index * 0.1,
        y: {
          duration: 2.5 + index * 0.2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      className="relative flex flex-col items-center w-[240px]"
    >
      <EmoteDisplay emote={team.lastEmote} />
      <DamageNumber damage={team.lastDamage} />

      <div 
        onClick={() => onEmote(team.id, '💢')}
        className={cn(
          "w-20 h-20 bg-[#111] border-4 border-[var(--rpg-border)] rounded-full flex items-center justify-center text-3xl shadow-lg relative transition-all cursor-pointer active:scale-90",
          isShielded && "shield-active-glow"
        )}
        style={{ boxShadow: !isShielded ? `0 0 15px ${team.colorScheme}33` : undefined, borderColor: !isShielded ? team.colorScheme : undefined }}
      >
        {isShielded && <ShieldVisuals burst={shieldBurst} />}
        <Icon className="w-10 h-10 text-white" />
        <AnimatePresence>
          {isShielded && (
            <motion.div 
              key="shield-timer-badge"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-4 bg-[var(--shield-glow)] text-black font-bold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center whitespace-nowrap"
            >
              <ShieldTimer until={team.shieldActiveUntil} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div 
        className="w-full bg-black/70 p-2 border rounded-lg mt-3 overflow-hidden relative group"
        style={{ borderColor: `${team.colorScheme}44` }}
      >
        <button 
          onClick={() => onViewDetails(team)}
          className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="text-[8px] font-black uppercase tracking-widest bg-white text-black px-2 py-1 rounded">View Details</span>
        </button>
        <div 
          className="absolute top-0 left-0 w-full h-0.5 opacity-40"
          style={{ backgroundColor: team.colorScheme }}
        />
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">
          <span className="truncate max-w-[120px] px-1 rounded" style={{ backgroundColor: `${team.colorScheme}22` }}>{team.name}</span>
          <span className="text-slate-400">LV. {Math.floor(team.currentAmount / 100) + 1}</span>
        </div>
        <div className="h-2 bg-[#333] rounded-full overflow-hidden border border-[#444] relative">
          <motion.div 
            className="h-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${(team.hp / team.goal) * 100}%` }}
            style={{ 
              backgroundColor: team.colorScheme,
              boxShadow: `0 0 10px ${team.colorScheme}88`
            }}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10" />
          </motion.div>
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5 text-right font-mono">
          ${team.currentAmount.toLocaleString()} / ${team.goal.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ onClick, disabled, icon, label, sublabel, color }: { onClick: () => void, disabled: boolean, icon: React.ReactNode, label: string, sublabel: string, color: 'blue' | 'red' }) {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40",
    red: "bg-red-600 hover:bg-red-500 shadow-red-900/40"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative group p-6 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none shadow-xl",
        colors[color]
      )}
    >
      <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="text-center">
        <div className="font-black uppercase tracking-widest text-sm">{label}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{sublabel}</div>
      </div>
    </button>
  );
}

interface TeamSelectorCardProps {
  key?: React.Key;
  team: Team;
  active: boolean;
  onClick: () => void;
}

function TeamSelectorCard({ team, active, onClick }: TeamSelectorCardProps) {
  const Icon = ICON_MAP[team.badgeIcon] || Trophy;
  const progress = (team.currentAmount / team.goal) * 100;

  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left group",
        active ? "bg-slate-800 border-yellow-500 shadow-lg" : "bg-slate-900 border-slate-800 hover:border-slate-700"
      )}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: team.colorScheme }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-black uppercase tracking-tight text-sm truncate">{team.name}</h3>
          <span className="text-[10px] font-mono text-slate-500">${team.currentAmount}/${team.goal}</span>
        </div>
        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function Scoreboard({ teams }: { teams: Team[] }) {
  const sortedTeams = [...teams].sort((a, b) => b.currentAmount - a.currentAmount);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black uppercase tracking-tighter italic">Leaderboard</h2>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" />
          {teams.length} Participating Teams
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rank</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Team</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Raised</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Goal</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedTeams.map((team, index) => (
              <tr key={team.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                    index === 0 ? "bg-yellow-500 text-slate-950" : 
                    index === 1 ? "bg-slate-300 text-slate-950" :
                    index === 2 ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400"
                  )}>
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: team.colorScheme }}>
                      {React.createElement(ICON_MAP[team.badgeIcon] || Trophy, { className: "w-4 h-4 text-white" })}
                    </div>
                    <div>
                      <div className="font-bold text-sm uppercase tracking-tight">{team.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">{team.schoolName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-yellow-500">${team.currentAmount.toLocaleString()}</td>
                <td className="px-6 py-4 font-mono text-sm text-slate-400">${team.goal.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden min-w-[100px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (team.currentAmount / team.goal) * 100)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-yellow-500 rounded-full" 
                        style={{ boxShadow: `0 0 10px rgba(234, 179, 8, 0.4)` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-400">
                      {Math.round((team.currentAmount / team.goal) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPanel({ teams, onBootstrap }: { teams: Team[], onBootstrap: () => void }) {
  const [newTeam, setNewTeam] = useState({
    name: '',
    goal: 1000,
    schoolName: '',
    activityType: 'Soccer',
    colorScheme: '#ef4444'
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<{ type: 'delete' | 'reset', open: boolean } | null>(null);

  const createTeam = async () => {
    try {
      await addDoc(collection(db, 'teams'), {
        ...newTeam,
        currentAmount: 0,
        hp: newTeam.goal,
        badgeIcon: ACTIVITY_ICONS[newTeam.activityType] || 'Trophy',
        shieldActiveUntil: null,
        lastShareUserId: null,
        consecutiveSharesCount: 0,
        members: []
      });
      setNewTeam({ name: '', goal: 1000, schoolName: '', activityType: 'Soccer', colorScheme: '#ef4444' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teams');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (!confirmation) return;
    const { type } = confirmation;
    const batch = writeBatch(db);

    try {
      if (type === 'delete') {
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'teams', id));
        });
      } else if (type === 'reset') {
        selectedIds.forEach(id => {
          const team = teams.find(t => t.id === id);
          if (team) {
            batch.update(doc(db, 'teams', id), {
              currentAmount: 0,
              hp: team.goal,
              shieldActiveUntil: null,
              consecutiveSharesCount: 0
            });
          }
        });
      }

      await batch.commit();
      setSelectedIds([]);
      setConfirmation(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'teams');
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 relative">
      <AnimatePresence>
        {confirmation && confirmation.open && (
          <motion.div 
            key="bulk-confirmation-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black uppercase tracking-tight mb-4">
                Confirm Bulk {confirmation.type === 'delete' ? 'Deletion' : 'Reset'}
              </h3>
              <p className="text-slate-400 text-sm mb-8">
                Are you sure you want to {confirmation.type === 'delete' ? 'permanently DELETE' : 'RESET fundraising for'} {selectedIds.length} selected team(s)? This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setConfirmation(null)}
                  className="bg-slate-800 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkAction}
                  className={cn(
                    "py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg",
                    confirmation.type === 'delete' 
                      ? "bg-red-600 text-white hover:bg-red-500 shadow-red-500/20" 
                      : "bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/20"
                  )}
                >
                  Proceed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Create New Team</h2>
          <button 
            onClick={onBootstrap}
            className="text-[10px] font-black uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Bootstrap Initial Data
          </button>
        </div>
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team Name</label>
            <input 
              value={newTeam.name}
              onChange={e => setNewTeam({...newTeam, name: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
              placeholder="e.g. Tigers Soccer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fundraising Goal ($)</label>
            <input 
              type="number"
              value={newTeam.goal}
              onChange={e => setNewTeam({...newTeam, goal: parseInt(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Name</label>
            <input 
              value={newTeam.schoolName}
              onChange={e => setNewTeam({...newTeam, schoolName: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
              placeholder="e.g. West High"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Activity</label>
              <select 
                value={newTeam.activityType}
                onChange={e => setNewTeam({...newTeam, activityType: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none transition-all"
              >
                {Object.keys(ACTIVITY_ICONS).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Theme Color</label>
              <input 
                type="color"
                value={newTeam.colorScheme}
                onChange={e => setNewTeam({...newTeam, colorScheme: e.target.value})}
                className="w-full h-[46px] bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 cursor-pointer"
              />
            </div>
          </div>
          <button 
            onClick={createTeam}
            className="w-full bg-yellow-500 text-slate-950 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
          >
            Deploy Team to Arena
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Active Teams</h2>
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmation({ type: 'reset', open: true })}
                className="text-[9px] font-black uppercase tracking-widest bg-yellow-500 text-slate-950 px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Reset ({selectedIds.length})
              </button>
              <button 
                onClick={() => setConfirmation({ type: 'delete', open: true })}
                className="text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors"
              >
                Delete ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {teams.map(team => (
            <div 
              key={team.id} 
              onClick={() => toggleSelection(team.id)}
              className={cn(
                "bg-slate-900 p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer group",
                selectedIds.includes(team.id) ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  selectedIds.includes(team.id) ? "bg-yellow-500 border-yellow-500" : "border-slate-700 group-hover:border-slate-500"
                )}>
                  {selectedIds.includes(team.id) && <X className="w-3 h-3 text-slate-950 stroke-[4px]" />}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: team.colorScheme }}>
                    {React.createElement(ICON_MAP[team.badgeIcon] || Trophy, { className: "w-5 h-5 text-white" })}
                  </div>
                  <div>
                    <div className="font-bold text-sm uppercase tracking-tight">{team.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{team.schoolName}</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-yellow-500">${team.currentAmount.toLocaleString()}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">Current Total</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


