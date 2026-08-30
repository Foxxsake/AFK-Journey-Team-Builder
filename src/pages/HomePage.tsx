import { Users, Wrench, Database, ChevronRight } from 'lucide-react';
import type { PageId } from '@/components/navItems';
import { Disclaimer } from '@/components/Disclaimer';
import { DATA_VERSION, LAST_UPDATED, DATASET_STATUS } from '@/data/dataset';
import { heroes } from '@/data/heroes';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="fade-in flex flex-col gap-5 px-5 pb-6 pt-8">
      <header className="flex flex-col items-center text-center pt-4">
        <div className="mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center">
          <span className="text-3xl font-black text-amber-400">A</span>
        </div>
        <h1 className="text-2xl font-black tracking-[0.15em] text-white">
          AFK JOURNEY
        </h1>
        <h2 className="text-lg font-bold tracking-[0.3em] text-amber-400 mt-1">
          TEAM BUILDER
        </h2>
        <p className="mt-3 text-sm text-slate-400 max-w-xs">
          Build the best teams around <span className="text-amber-400">your</span> account.
        </p>
      </header>

      <div className="flex flex-col gap-3 mt-2">
        <ActionButton
          icon={Users}
          label="My Roster"
          description="Manage your owned heroes"
          onClick={() => onNavigate('roster')}
        />
        <ActionButton
          icon={Wrench}
          label="Build Team"
          description="Optimise teams for any mode"
          onClick={() => onNavigate('build')}
        />
        <ActionButton
          icon={Database}
          label="Hero Database"
          description={`Browse ${heroes.length} heroes & stats`}
          onClick={() => onNavigate('heroes')}
        />
      </div>

      <div className="card mt-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Data Version
          </span>
          <span className="text-sm font-semibold text-slate-200">{DATA_VERSION}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last Updated
          </span>
          <span className="text-sm font-semibold text-slate-200">{LAST_UPDATED}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Heroes
          </span>
          <span className="text-sm font-semibold text-slate-200">{heroes.length}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Dataset Status
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {DATASET_STATUS === 'incomplete' ? 'Incomplete' : DATASET_STATUS === 'partial' ? 'Partial' : 'Complete'}
          </span>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

interface ActionButtonProps {
  icon: typeof Users;
  label: string;
  description: string;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, description, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary group flex items-center gap-4 p-4 text-left"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15">
        <Icon size={24} className="text-amber-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold text-white">{label}</span>
        <span className="text-xs text-slate-400">{description}</span>
      </div>
      <ChevronRight
        size={20}
        className="ml-auto text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400"
      />
    </button>
  );
}
