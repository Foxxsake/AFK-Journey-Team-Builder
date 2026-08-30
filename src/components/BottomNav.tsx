import { NAV_ITEMS, type PageId } from './navItems';

interface BottomNavProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
}

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-[#0d1320]/95 backdrop-blur-md safe-bottom"
      role="navigation"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item flex flex-1 flex-col items-center gap-1 py-2.5 ${
                isActive ? 'text-[#e2b04a]' : 'text-slate-500'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.4 : 2}
                className={isActive ? 'drop-shadow-[0_0_6px_rgba(226,176,74,0.4)]' : ''}
              />
              <span className="text-[11px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
