import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { StoredProject, LaneId, ChatMessage } from './types';

interface EnhancedResultsProps {
  project: StoredProject | null;
  onNewProject: () => void;
  isGenerating: boolean;
  generationProgress: string;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  sendChatMessage: (msg: string) => Promise<void>;
}

export function EnhancedResults({
  project,
  onNewProject,
  isGenerating,
  generationProgress,
  chatMessages,
  isChatting,
  sendChatMessage
}: EnhancedResultsProps) {
  const [copiedLane, setCopiedLane] = useState<LaneId | null>(null);
  const [chatInput, setChatInput] = useState('');

  const lanesOrder: LaneId[] = ['spec', 'sql', 'ui', 'test', 'cicd'];

  const copyContent = (laneId: LaneId, content: any) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedLane(laneId);
    setTimeout(() => setCopiedLane(null), 1600);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting || isGenerating) return;
    const msg = chatInput;
    setChatInput('');
    await sendChatMessage(msg);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {project?.project_name || project?.wizardData?.projectName || 'Architecture'}
            </h2>
            <p className="text-base text-zinc-400 mt-1">
              {isGenerating ? generationProgress : project ? `Status: ${project.status}` : 'Idle'}
            </p>
          </div>
          <button
            onClick={onNewProject}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
          >
            New Project
          </button>
        </header>

        <div className="space-y-6">
          {lanesOrder.map(id => {
            const lane = project?.lanes[id];
            if (!lane) return null;

            return (
              <div key={id} className="lane-card group">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize text-lg text-white">{id}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        lane.status === 'succeeded'
                          ? 'status-badge-completed'
                          : lane.status === 'running'
                          ? 'status-badge-running'
                          : lane.status === 'failed'
                          ? 'status-badge-failed'
                          : 'status-badge-pending'
                      }`}
                    >
                      {lane.status}
                    </span>
                    {lane.output && (
                      <button
                        onClick={() => copyContent(id, lane.output)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                        title="Copy content"
                      >
                        {copiedLane === id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {lane.meta?.error && (
                  <div className="text-red-400 text-sm mb-2 p-3 bg-red-500/10 rounded-lg">
                    Error: {lane.meta.error}
                  </div>
                )}
                {lane.output && (
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-light leading-relaxed">
                    {typeof lane.output === 'string'
                      ? lane.output
                      : JSON.stringify(lane.output, null, 2)}
                  </pre>
                )}
                {!lane.output && lane.status === 'queued' && (
                  <p className="text-zinc-500 text-sm">Waiting to start...</p>
                )}
                {!lane.output && lane.status === 'running' && (
                  <p className="text-blue-400 text-sm">Generating...</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 sticky top-32 h-[calc(100vh-10rem)] flex flex-col">
        <h3 className="text-3xl font-semibold tracking-tight">Refine</h3>
        <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-6">
          {chatMessages.length === 0 && (
            <div className="text-center text-zinc-500 py-8">
              <p className="mb-2">Chat with the architect to refine your design</p>
              <p className="text-sm">Ask questions or request changes to any lane</p>
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
              <div
                className={`px-5 py-4 rounded-2xl text-base ${
                  m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}
              >
                <pre className="whitespace-pre-wrap font-light leading-relaxed">{m.content}</pre>
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="text-zinc-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Thinking…
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="Ask for changes to spec/sql/ui/test… (Shift+Enter for newline)"
            className="flex-1 px-5 py-4 rounded-2xl bg-zinc-900/50 border border-white/10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/80 resize-none transition-all"
            rows={3}
            disabled={isChatting || isGenerating}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatting || isGenerating}
            className="px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
            title="Send"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
