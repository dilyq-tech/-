import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { advanceWorld, feedWorld, loadWorld, saveWorld } from './simulation.js';
import Aquarium from './components/Aquarium.jsx';
import { CustomCursor, InteractiveBackdrop, Toast } from './components/Atmosphere.jsx';
import { CarePanel, FooterNote, HistoryPanel, LifePanel, StatsGrid, Welcome } from './components/DashboardPanels.jsx';
import { Sidebar, Topbar } from './components/Navigation.jsx';
import useScrollReveal from './hooks/useScrollReveal.js';
import './styles.css';

function getElapsedLabel(timestamp) {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return 'Только что';
  if (elapsed < 3_600_000) return `${Math.round(elapsed / 60_000)} мин назад`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} ч назад`;
  return `${Math.floor(elapsed / 86_400_000)} дн. назад`;
}

export default function App() {
  const worldRef = useRef(null);
  const [world, setWorld] = useState(() => {
    const savedWorld = loadWorld();
    worldRef.current = savedWorld;
    return savedWorld;
  });
  const [paused, setPaused] = useState(false);
  const [lastVisit] = useState(() => getElapsedLabel(worldRef.current?.lastVisited || Date.now()));
  const [selected, setSelected] = useState('overview');
  const [toast, setToast] = useState('');
  const [, startTransition] = useTransition();

  useScrollReveal();

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(''), 2200);
  }, []);

  // Keep browser storage current and flush the latest ecosystem when the page closes.
  useEffect(() => {
    const saveInterval = window.setInterval(() => {
      if (!document.hidden) saveWorld(worldRef.current);
    }, 10_000);
    const saveBeforeLeave = () => saveWorld(worldRef.current);
    let hiddenAt = document.hidden ? Date.now() : null;
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        saveWorld(worldRef.current);
        return;
      }

      if (hiddenAt) {
        const awayHours = ((Date.now() - hiddenAt) / 3_600_000) * 60;
        advanceWorld(worldRef.current, awayHours);
        hiddenAt = null;
        saveWorld(worldRef.current);
        const currentWorld = worldRef.current;
        startTransition(() => setWorld({
          ...currentWorld,
          creatures: [...currentWorld.creatures],
          food: [...currentWorld.food],
          history: [...currentWorld.history],
        }));
      }
    };
    window.addEventListener('pagehide', saveBeforeLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(saveInterval);
      window.removeEventListener('pagehide', saveBeforeLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
      saveWorld(worldRef.current);
    };
  }, []);

  // The Canvas ticks independently; React renders only occasional snapshots for the dashboard.
  useEffect(() => {
    const updateSnapshot = () => {
      const currentWorld = worldRef.current;
      // One event can fire a few milliseconds before tab restore; ignore while the page sleeps.
      if (document.hidden) return;
      startTransition(() => setWorld({
        ...currentWorld,
        creatures: [...currentWorld.creatures],
        food: [...currentWorld.food],
        history: [...currentWorld.history],
      }));
    };
    window.addEventListener('aquarium:tick', updateSnapshot);
    return () => window.removeEventListener('aquarium:tick', updateSnapshot);
  }, []);

  const feed = () => {
    feedWorld(worldRef.current);
    notify('Корм добавлен в воду');
  };

  const setTemperature = (value) => {
    worldRef.current.temperature = Number(value);
    setWorld({ ...worldRef.current });
  };

  const reset = () => {
    if (!window.confirm('Начать новую экосистему? Текущий мир будет заменён.')) return;
    localStorage.removeItem('quiet-water-world-v1');
    worldRef.current = loadWorld();
    setWorld({ ...worldRef.current });
    notify('Новая экосистема запущена');
  };

  const openHelp = () => notify('Мир сохраняется автоматически и живёт между посещениями.');
  const fish = world.creatures;
  const averageGeneration = fish.length
    ? (fish.reduce((sum, creature) => sum + creature.generation, 0) / fish.length).toFixed(1)
    : '—';
  const day = Math.max(1, Math.floor(world.elapsedHours / 24) + 1);

  return (
    <main className="app-shell">
      <InteractiveBackdrop />
      <CustomCursor />
      <Sidebar selected={selected} onSelect={setSelected} count={fish.length} onHelp={openHelp} />
      <section className="main-content">
        <Topbar onSettings={() => notify('Ваш мир хранится только в этом браузере.')} />
        <div className="page-content">
          <Welcome day={day} onReset={reset} />
          <Aquarium worldRef={worldRef} paused={paused} onTogglePause={() => setPaused((value) => !value)} />
          <StatsGrid world={world} fish={fish} averageGeneration={averageGeneration} day={day} lastVisit={lastVisit} />
          <div className="lower-grid">
            <CarePanel world={world} onFeed={feed} onTemperatureChange={setTemperature} />
            <HistoryPanel world={world} />
          </div>
          <LifePanel fish={fish} />
          <FooterNote />
        </div>
      </section>
      <Toast message={toast} />
    </main>
  );
}
