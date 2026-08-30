import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import type { PageId } from '@/components/navItems';
import { RosterProvider } from '@/services/RosterStore';
import { HomePage } from '@/pages/HomePage';
import { RosterPage } from '@/pages/RosterPage';
import { BuildPage } from '@/pages/BuildPage';
import { HeroesPage } from '@/pages/HeroesPage';
import { HeroDetailPage } from '@/pages/HeroDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  const [page, setPage] = useState<PageId>('home');
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  function navigate(next: PageId) {
    setPage(next);
    setSelectedHeroId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function selectHero(heroId: string) {
    setSelectedHeroId(heroId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function backToHeroes() {
    setSelectedHeroId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  useEffect(() => {
    const titles: Record<PageId, string> = {
      home: 'AFK Journey Team Builder',
      roster: 'My Roster · AFKJ Team Builder',
      build: 'Build Team · AFKJ Team Builder',
      heroes: 'Hero Database · AFKJ Team Builder',
      settings: 'Settings · AFKJ Team Builder',
    };
    if (selectedHeroId) {
      document.title = 'Hero Details · AFKJ Team Builder';
    } else {
      document.title = titles[page];
    }
  }, [page, selectedHeroId]);

  return (
    <RosterProvider>
      <div className="app-bg min-h-screen">
        <main className="mx-auto min-h-screen max-w-md pb-20 safe-top">
          {selectedHeroId && page === 'heroes' ? (
            <HeroDetailPage heroId={selectedHeroId} onBack={backToHeroes} />
          ) : (
            <>
              {page === 'home' && <HomePage onNavigate={navigate} />}
              {page === 'roster' && <RosterPage />}
              {page === 'build' && <BuildPage />}
              {page === 'heroes' && <HeroesPage onSelectHero={selectHero} />}
              {page === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
        <BottomNav current={page} onNavigate={navigate} />
      </div>
    </RosterProvider>
  );
}

export default App;
