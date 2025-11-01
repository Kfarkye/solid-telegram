import { useCallback, useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { StoredProject } from './types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: StoredProject) => void;
}

export function HistorySidebar({ isOpen, onClose, onLoadProject }: HistorySidebarProps) {
  const [items, setItems] = useState<StoredProject[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: runs, error } = await supabase
        .from('arch_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (runs) {
        const projects: StoredProject[] = await Promise.all(
          runs.map(async run => {
            const { data: laneData } = await supabase
              .from('lane_events')
              .select('*')
              .eq('run_id', run.id)
              .order('created_at', { ascending: true });

            const lanes: any = {
              spec: { status: 'queued', output: null },
              sql: { status: 'queued', output: null },
              ui: { status: 'queued', output: null },
              test: { status: 'queued', output: null },
              cicd: { status: 'queued', output: null }
            };

            if (laneData) {
              for (const lane of laneData) {
                lanes[lane.lane] = {
                  status: lane.status,
                  output: lane.output,
                  meta: lane.meta
                };
              }
            }

            return {
              id: run.id,
              vision: run.vision,
              project_name: run.project_name,
              timestamp: new Date(run.created_at).getTime(),
              status: run.status,
              lanes,
              wizardData: run.wizard_data
            };
          })
        );

        setItems(projects);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void refresh();
    }
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const titleFor = (p: StoredProject) =>
    p.project_name ||
    p.wizardData?.projectName ||
    p.vision?.split('\n').find(l => l.trim()) ||
    'Untitled Project';

  const descFor = (p: StoredProject) => {
    const v = p.vision || '';
    const first = v.split('\n').find(l => l.trim()) || '';
    return first.length > 100 ? first.slice(0, 100) + '…' : first;
  };

  const completed = (p: StoredProject) =>
    Object.values(p.lanes || {}).filter((l: any) => l.status === 'succeeded').length;

  return (
    <aside
      className="fixed top-0 right-0 w-[360px] h-full bg-black border-l border-white/10 flex flex-col"
      style={{ zIndex: 9997 }}
      role="dialog"
      aria-modal="true"
      aria-label="History"
    >
      <header className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-zinc-400" />
          <h3 className="font-semibold">History</h3>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="text-sm text-zinc-500 text-center py-8">Loading history...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-8">No saved runs yet.</div>
        )}
        {!loading &&
          items.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onLoadProject(item);
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all"
            >
              <div className="text-sm font-semibold truncate">{titleFor(item)}</div>
              <div className="text-xs text-zinc-500 truncate mt-1">{descFor(item)}</div>
              <div className="mt-2 text-[10px] text-zinc-600 flex gap-2 flex-wrap">
                <span>{new Date(item.timestamp).toLocaleString()}</span>
                <span>•</span>
                <span className="uppercase">{item.status}</span>
                <span>•</span>
                <span>{completed(item)}/5 lanes</span>
              </div>
            </button>
          ))}
      </div>
    </aside>
  );
}
