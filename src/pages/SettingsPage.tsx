import {
  Settings, Trash2, Database, Info, CheckCircle, AlertTriangle, Info as InfoIcon,
  Download, Upload, RefreshCw, Activity, AlertCircle, CloudDownload, History, Wifi,
  Brain, Target, Link2, Zap, TrendingUp,
} from 'lucide-react';
import { rosterService } from '@/services/RosterService';
import { listDataProviders } from '@/services/DataProvider';
import { DATA_VERSION, LAST_UPDATED, DATASET_STATUS } from '@/data/dataset';
import { validateGameData } from '@/utils/validateGameData';
import { dataIntelligenceService, type DataHealthReport } from '@/services/DataIntelligenceService';
import { dataUpdateService, type UpdateResult } from '@/services/DataUpdateService';
import { SOURCE_REGISTRY } from '@/data/sources';
import { calculateFreshness, relativeTime } from '@/engine/FreshnessCalculator';
import type { LucideIcon } from 'lucide-react';
import { useState, useRef } from 'react';

export function SettingsPage() {
  const providers = listDataProviders();
  const [validation, setValidation] = useState<ReturnType<typeof validateGameData> | null>(null);
  const [healthReport, setHealthReport] = useState<DataHealthReport | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; errors: string[]; warnings: string[]; imported: number } | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [updating, setUpdating] = useState(false);
  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClearRoster() {
    if (confirm('Clear your entire roster? This cannot be undone.')) {
      rosterService.clearRoster();
      rosterService.clearTeams();
    }
  }

  function handleValidate() {
    setValidation(validateGameData());
  }

  function handleDataHealth() {
    setHealthReport(dataIntelligenceService.getDataHealth());
  }

  async function handleUpdateData() {
    setUpdating(true);
    setUpdateResult(null);
    setRollbackMsg(null);
    try {
      const result = await dataUpdateService.updateFromDotGG();
      setUpdateResult(result);
      setHealthReport(null);
    } catch (err) {
      setUpdateResult({
        success: false,
        sourceId: 'dotgg',
        retrievedAt: new Date().toISOString(),
        received: 0, mapped: 0, unknown: 0, rejected: 0, withoutTiers: 0,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        warnings: [], diff: null, heroesEnriched: [], fromCache: false,
        quality: null,
      });
    }
    setUpdating(false);
  }

  function handleRollback() {
    if (!confirm('Restore the previous dataset? Current data will be replaced with the snapshot taken before the last update.')) return;
    const snapshot = dataUpdateService.rollback();
    if (snapshot) {
      setRollbackMsg(`Restored dataset from ${relativeTime(snapshot.timestamp)}`);
      setHealthReport(null);
      setUpdateResult(null);
    } else {
      setRollbackMsg('No snapshot available to restore.');
    }
  }

  function handleExport() {
    const data = dataIntelligenceService.exportDataset();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `afkj-dataset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const result = dataIntelligenceService.importDataset(data, { replace: false });
        setImportResult(result);
        setHealthReport(null);
      } catch {
        setImportResult({ success: false, errors: ['Invalid JSON file'], warnings: [], imported: 0 });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleResetData() {
    if (confirm('Reset meta data to seed values? This will discard any imported data.')) {
      dataIntelligenceService.resetToSeed();
      setHealthReport(null);
      setImportResult(null);
      setUpdateResult(null);
    }
  }

  const canRollback = dataUpdateService.canRollback();
  const sourceHealth = dataUpdateService.getSourceHealth();
  const dotggCache = dataUpdateService.getCacheEntry('dotgg');

  return (
    <div className="fade-in flex flex-col gap-4 px-5 pb-6 pt-8">
      <PageHeader icon={Settings} title="Settings" subtitle="App configuration and data management" />

      {/* Dataset */}
      <Section title="Data Status">
        <Row label="Data Version" value={DATA_VERSION} />
        <Row label="Last Updated" value={LAST_UPDATED} />
        <Row label="Status" value={DATASET_STATUS === 'incomplete' ? 'Incomplete' : DATASET_STATUS === 'partial' ? 'Partial' : 'Complete'} />
        <Row label="Meta Status" value={dataIntelligenceService.getDataStatusLabel()} />
        <Row label="Game Version" value={dataIntelligenceService.getGameVersion() || 'unknown'} />
        {dotggCache?.lastSuccessAt && (
          <Row
            label="DotGG Last Update"
            value={relativeTime(dotggCache.lastSuccessAt)}
          />
        )}
      </Section>

      {/* Data Sources with Health */}
      <Section title="Sources">
        {sourceHealth.map((sh) => {
          const registry = SOURCE_REGISTRY.find((s) => s.id === sh.sourceId);
          if (!registry) return null;
          const records = dataIntelligenceService.getAllRecords().filter((r) => r.sourceId === sh.sourceId);
          const statusColor = sh.status === 'available' ? 'text-emerald-400' : sh.status === 'failed' ? 'text-rose-400' : 'text-slate-500';
          const statusLabel = sh.status === 'available' ? 'Connected' : sh.status === 'failed' ? 'Failed' : 'Never updated';
          const qualityColor = sh.datasetQuality === 'valid' ? 'text-emerald-400' : sh.datasetQuality === 'suspicious' ? 'text-amber-400' : sh.datasetQuality === 'invalid' ? 'text-rose-400' : 'text-slate-500';
          return (
            <div key={sh.sourceId} className="py-2.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  registry.type === 'official' ? 'bg-amber-500/10' : registry.type === 'community' ? 'bg-sky-500/10' : 'bg-slate-700/30'
                }`}>
                  <Database size={14} className={registry.type === 'official' ? 'text-amber-400' : registry.type === 'community' ? 'text-sky-400' : 'text-slate-400'} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-200">{registry.name}</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="capitalize">{registry.retrievalMethod.replace('-', ' ')}</span>
                    <span>·</span>
                    <span>{records.length} records</span>
                    {sh.lastSuccessAt && <><span>·</span><span>Updated {relativeTime(sh.lastSuccessAt)}</span></>}
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
              </div>
              {/* Quality / meta influence row */}
              {sh.datasetQuality !== 'unknown' && (
                <div className="ml-11 mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className={qualityColor}>
                    Dataset: {sh.datasetQuality === 'valid' ? 'Valid' : sh.datasetQuality === 'suspicious' ? 'Suspicious' : 'Invalid'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className={sh.metaInfluenceEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                    Meta influence: {sh.metaInfluenceEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {sh.datasetQuality === 'suspicious' && (
                    <span className="text-amber-400/60">· {sh.qualityExplanation}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-800/40 p-3">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
          <p className="text-xs leading-relaxed text-slate-500">
            DotGG supports live retrieval via its public API. Prydwen and AllClash use
            manual/import — no automated scraping. The optimiser uses consensus from all sources.
          </p>
        </div>
      </Section>

      {/* Data Intelligence */}
      <Section title="Data Intelligence">
        <div className="flex flex-col gap-2">
          {/* Update button */}
          <button
            onClick={handleUpdateData}
            disabled={updating}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
              updating
                ? 'bg-slate-700 text-slate-400'
                : 'bg-sky-600 text-white hover:bg-sky-500 active:scale-[0.98]'
            }`}
          >
            {updating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CloudDownload size={16} />
                Update Data from DotGG
              </>
            )}
          </button>

          {/* Other actions */}
          <button
            onClick={handleDataHealth}
            className="btn-secondary flex items-center gap-2 py-3 text-sm font-semibold"
          >
            <Activity size={16} />
            Check Data Health
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="btn-secondary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleImportClick}
              className="btn-secondary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold"
            >
              <Upload size={16} />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* Rollback */}
          {canRollback && (
            <button
              onClick={handleRollback}
              className="flex items-center gap-2 rounded-xl border border-amber-700/40 bg-amber-950/20 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-950/30"
            >
              <History size={14} />
              Restore Previous Dataset
            </button>
          )}

          <button
            onClick={handleResetData}
            className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            <RefreshCw size={14} />
            Reset to seed data
          </button>
        </div>

        {/* Update result */}
        {updateResult && (
          <div className={`mt-3 rounded-lg p-3 ${
            !updateResult.success ? 'bg-rose-500/10 border border-rose-500/20'
            : updateResult.quality?.level === 'suspicious' ? 'bg-amber-500/10 border border-amber-500/20'
            : 'bg-emerald-500/10 border border-emerald-500/20'
          }`}>
            <div className="flex items-center gap-2">
              {!updateResult.success ? <AlertCircle size={14} className="text-rose-400" />
              : updateResult.quality?.level === 'suspicious' ? <AlertTriangle size={14} className="text-amber-400" />
              : <CheckCircle size={14} className="text-emerald-400" />}
              <span className="text-xs font-semibold text-slate-200">
                {!updateResult.success
                  ? 'Update failed — existing data preserved'
                  : updateResult.quality?.level === 'suspicious'
                  ? `Connected — but tier data appears suspicious. Meta influence disabled.`
                  : `Updated successfully — ${updateResult.mapped} heroes mapped, ${updateResult.heroesEnriched.length} heroes enriched`}
              </span>
            </div>
            {updateResult.quality?.reasons.map((r, i) => (
              <p key={i} className="mt-1 text-[10px] text-amber-400/70">{r}</p>
            ))}
            {updateResult.success && updateResult.diff && updateResult.diff.totalChanges > 0 && (
              <div className="mt-2 rounded bg-slate-800/40 p-2">
                <p className="text-[10px] font-semibold text-sky-400 mb-1">Data Changes</p>
                <div className="flex flex-wrap gap-1.5">
                  {updateResult.diff.summary.map((s, i) => (
                    <span key={i} className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">{s}</span>
                  ))}
                </div>
                {updateResult.diff.tierChanges.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {updateResult.diff.tierChanges.slice(0, 5).map((tc, i) => (
                      <li key={i} className="text-[10px] text-slate-400">
                        {tc.heroId} ({tc.modeId}): {tc.oldTier ?? 'none'} → {tc.newTier ?? 'none'}
                      </li>
                    ))}
                    {updateResult.diff.tierChanges.length > 5 && (
                      <li className="text-[10px] text-slate-500">...and {updateResult.diff.tierChanges.length - 5} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
            {updateResult.success && updateResult.unknown > 0 && (
              <p className="mt-1.5 text-[10px] text-amber-400/70">
                {updateResult.unknown} unknown hero(s) not in database — flagged for review.
              </p>
            )}
            {updateResult.errors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {updateResult.errors.slice(0, 3).map((e, i) => (
                  <li key={i} className="text-[10px] text-rose-400/70">{e}</li>
                ))}
              </ul>
            )}
            {updateResult.warnings.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {updateResult.warnings.slice(0, 3).map((w, i) => (
                  <li key={i} className="text-[10px] text-amber-400/70">{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Rollback message */}
        {rollbackMsg && (
          <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <div className="flex items-center gap-2">
              <History size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">{rollbackMsg}</span>
            </div>
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className={`mt-3 rounded-lg p-3 ${importResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
            <div className="flex items-center gap-2">
              {importResult.success ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-rose-400" />}
              <span className="text-xs font-semibold text-slate-200">
                {importResult.success ? `Imported ${importResult.imported} records` : 'Import failed'}
              </span>
            </div>
            {importResult.warnings.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {importResult.warnings.slice(0, 5).map((w, i) => (
                  <li key={i} className="text-[10px] text-amber-400/70">{w}</li>
                ))}
              </ul>
            )}
            {importResult.errors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {importResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-[10px] text-rose-400/70">{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Data health report */}
        {healthReport && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <StatRow label="Total records" value={healthReport.totalRecords} />
              <StatRow label="Sources with data" value={healthReport.sourcesWithRecords} />
              <StatRow label="Stale records" value={healthReport.staleRecordCount} warning={healthReport.staleRecordCount > 0} />
              <StatRow label="Disagreements" value={healthReport.disagreementCount} warning={healthReport.disagreementCount > 0} />
              <StatRow label="Unknown heroes" value={healthReport.unknownHeroCount} warning={healthReport.unknownHeroCount > 0} />
              <StatRow label="Heroes w/o meta" value={healthReport.heroesWithoutMetaCount} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatRow label="Heroes" value={healthReport.totalHeroes} />
              <StatRow label="Modes" value={healthReport.totalModes} />
              <StatRow label="Formations" value={healthReport.totalFormations} />
            </div>
            {healthReport.disagreements.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                <p className="text-[10px] font-semibold text-amber-400 mb-1">Source Disagreements</p>
                {healthReport.disagreements.slice(0, 5).map((d, i) => (
                  <p key={i} className="text-[10px] text-slate-400">{d.heroId} in {d.modeId}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Hero Intelligence Health */}
      <Section title="Hero Intelligence">
        {(() => {
          const h = healthReport;
          if (!h) {
            return (
              <button
                onClick={handleDataHealth}
                className="btn-secondary w-full py-3 text-sm font-semibold"
              >
                Check Intelligence Health
              </button>
            );
          }
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <StatRow label="Verified heroes" value={h.heroesWithVerifiedIntelligence} />
                <StatRow label="Heuristic heroes" value={h.heroesWithHeuristicIntelligence} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBadge icon={Zap} label="Abilities" value={h.verifiedAbilityCount} color="text-sky-400" />
                <StatBadge icon={Link2} label="Synergies" value={h.synergyCount} color="text-emerald-400" />
                <StatBadge icon={Target} label="Counters" value={h.counterCount} color="text-amber-400" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBadge icon={Activity} label="Mode Ratings" value={h.modeAssessmentCount} color="text-sky-400" />
                <StatBadge icon={AlertTriangle} label="Anti-Syn." value={h.antiSynergyCount} color="text-rose-400" />
                <StatBadge icon={Brain} label="Verified" value={h.heroesWithVerifiedIntelligence} color="text-emerald-400" />
              </div>
              {h.lastImportValidation && (
                <div className={`rounded-lg p-2 text-[10px] ${
                  h.lastImportValidation.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  Last import: {h.lastImportValidation.valid ? 'All intelligence data valid' : `${h.lastImportValidation.errors.length} validation error(s)`}
                  {h.lastImportMerge && h.lastImportMerge.skipped > 0 && (
                    <span className="ml-2 text-amber-400/70">· {h.lastImportMerge.skipped} skipped (weaker evidence)</span>
                  )}
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-slate-800/40 p-2.5">
                <Info size={12} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Verified abilities come from structured community sources (wiki). No data is marked official.
                  Heroes without verified data use heuristic class-based intelligence.
                </p>
              </div>
            </div>
          );
        })()}
      </Section>

      <Section title="Data Providers">
        {providers.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <Database size={16} className="text-slate-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">{p.name}</span>
              <span className="text-xs text-slate-500">{p.isAvailable() ? 'Active' : 'Unavailable'}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Data Validation">
        <button
          onClick={handleValidate}
          className="btn-secondary w-full py-3 text-sm font-semibold"
        >
          Run Validation Check
        </button>
        {validation && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <StatBadge icon={CheckCircle} label="Errors" value={validation.errors} color="text-emerald-400" />
              <StatBadge icon={AlertTriangle} label="Warnings" value={validation.warnings} color="text-amber-400" />
              <StatBadge icon={InfoIcon} label="Info" value={validation.infos} color="text-sky-400" />
            </div>
            {validation.valid ? (
              <p className="text-xs text-emerald-400">All critical checks passed.</p>
            ) : (
              <p className="text-xs text-red-400">{validation.errors} error(s) found.</p>
            )}
            {validation.issues.slice(0, 10).map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={
                  issue.severity === 'error' ? 'text-red-400' :
                  issue.severity === 'warning' ? 'text-amber-400' : 'text-sky-400'
                }>•</span>
                <span className="text-slate-400">{issue.message}</span>
              </div>
            ))}
            {validation.issues.length > 10 && (
              <p className="text-xs text-slate-500">...and {validation.issues.length - 10} more</p>
            )}
          </div>
        )}
      </Section>

      <Section title="Data Management">
        <button
          onClick={handleClearRoster}
          className="flex w-full items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-left transition-colors hover:bg-red-950/30"
        >
          <Trash2 size={20} className="text-red-400" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-red-300">Clear Roster & Teams</span>
            <span className="text-xs text-slate-500">Removes all locally stored data</span>
          </div>
        </button>
      </Section>

      <Section title="About">
        <p className="text-xs leading-relaxed text-slate-500">
          AFK Journey Team Builder is an unofficial fan-made companion app. It is
          not affiliated with, endorsed by, or sponsored by Lilith Games. All game
          content and brands belong to their respective owners.
        </p>
        <p className="mt-2 text-xs text-slate-600">App Version: 0.5.0 · PWA</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="card p-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
    </div>
  );
}

function StatRow({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-2.5 py-1.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${warning ? 'text-amber-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-slate-800/40 p-2">
      <Icon size={16} className={color} />
      <span className="mt-1 text-lg font-bold text-white">{value}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function PageHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <header className="flex flex-col gap-1 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/15">
          <Icon size={20} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </header>
  );
}
