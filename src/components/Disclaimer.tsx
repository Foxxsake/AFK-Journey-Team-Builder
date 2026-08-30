import { ShieldAlert } from 'lucide-react';

export function Disclaimer() {
  return (
    <div className="card flex items-start gap-3 p-4">
      <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-500/70" />
      <p className="text-xs leading-relaxed text-slate-400">
        This is an unofficial fan-made companion tool for AFK Journey. It is not
        affiliated with, endorsed by, or sponsored by Lilith Games. All game
        content, names, and brands belong to their respective owners.
      </p>
    </div>
  );
}
