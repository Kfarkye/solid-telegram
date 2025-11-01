import { useEffect, useState, useCallback } from 'react';
import { Command, History, User as UserIcon } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './platform.css';
import './enhanced-platform.css';
import { EnhancedWizard } from './platform/EnhancedWizard';
import { EnhancedStagedReveal } from './platform/EnhancedStagedReveal';
import { EnhancedResults } from './platform/EnhancedResults';
import { HistorySidebar } from './platform/HistorySidebar';
import { generateVisionFromWizard } from './platform/visionGenerator';
import type { WizardData, StoredProject, ChatMessage, LaneId, LaneResult } from './platform/types';
import { useRealtimeLanes } from './platform/useRealtimeLanes';

type PlatformMode = 'architect' | 'studio';

export default function EnhancedArchitectPlatform() {
  const [mode, setMode] = useState<PlatformMode>('architect');
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [visionText, setVisionText] = useState('');
  const [currentProject, setCurrentProject] = useState<StoredProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [showStagedReveal, setShowStagedReveal] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);

  const { lanes, runStatus, reset: resetRealtime } = useRealtimeLanes(runId);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email || null });
      } else {
        setUser({ id: 'dev-user', email: 'guest@example.com' });
      }
    };
    void getUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || null });
      } else {
        setUser({ id: 'dev-user', email: 'guest@example.com' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowHistory(s => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (runId && lanes && !isGenerating) {
      const laneResults: Record<LaneId, LaneResult> = {
        spec: lanes.spec || { status: 'queued', output: null },
        sql: lanes.sql || { status: 'queued', output: null },
        ui: lanes.ui || { status: 'queued', output: null },
        test: lanes.test || { status: 'queued', output: null },
        cicd: lanes.cicd || { status: 'queued', output: null }
      };

      if (currentProject && currentProject.id === runId) {
        setCurrentProject(prev => ({
          ...prev!,
          lanes: laneResults,
          status: runStatus || 'running'
        }));
      }
    }
  }, [lanes, runId, runStatus, currentProject, isGenerating]);

  useEffect(() => {
    if (runStatus === 'succeeded' || runStatus === 'failed') {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  }, [runStatus]);

  const handleWizardComplete = useCallback(async (data: WizardData) => {
    const generatedVision = generateVisionFromWizard(data);
    setVisionText(generatedVision);
    setShowWizard(false);
    setTimeout(() => {
      void executeArchitecture(generatedVision, data);
    }, 300);
  }, []);

  const executeArchitecture = async (vision: string, wizardData?: WizardData) => {
    if (!user || !vision.trim()) return;

    setIsGenerating(true);
    setShowStagedReveal(true);
    setRevealComplete(false);
    setGenerationProgress('Initializing workflow...');
    resetRealtime();
    setRunId(null);

    try {
      const payload: any = { vision };
      if (wizardData) {
        payload.wizard_data = wizardData;
        payload.project_name = wizardData.projectName;
      }

      const { data, error } = await supabase.functions.invoke('arch-runner', {
        body: payload
      });

      if (error) {
        console.error('Architecture generation failed:', error);
        setIsGenerating(false);
        setShowStagedReveal(false);
        setGenerationProgress('Failed to start architecture generation');
        return;
      }

      if (data?.run_id) {
        const newRunId = data.run_id;
        setRunId(newRunId);

        const newProject: StoredProject = {
          id: newRunId,
          vision,
          project_name: wizardData?.projectName,
          timestamp: Date.now(),
          status: 'running',
          lanes: {
            spec: { status: 'queued', output: null },
            sql: { status: 'queued', output: null },
            ui: { status: 'queued', output: null },
            test: { status: 'queued', output: null },
            cicd: { status: 'queued', output: null }
          },
          wizardData
        };
        setCurrentProject(newProject);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsGenerating(false);
      setShowStagedReveal(false);
      setGenerationProgress('An unexpected error occurred');
    }
  };

  const handleRevealComplete = () => {
    setShowStagedReveal(false);
    setRevealComplete(true);
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setVisionText('');
    setRunId(null);
    setGenerationProgress('');
    setIsGenerating(false);
    setShowStagedReveal(false);
    setRevealComplete(false);
    setChatMessages([]);
    resetRealtime();
  };

  const handleLoadProject = (project: StoredProject) => {
    setCurrentProject(project);
    setVisionText(project.vision);
    setRunId(project.id);
    setRevealComplete(true);
    setIsGenerating(false);
    setShowStagedReveal(false);
    setGenerationProgress('');
    setChatMessages([]);
  };

  const sendChatMessage = useCallback(
    async (userMessage: string) => {
      if (!user || !userMessage.trim() || !currentProject) return;

      setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setIsChatting(true);

      try {
        const contextPrompt = `You are an expert software architect helping a user refine an existing architecture.

**ORIGINAL VISION:**
${currentProject.vision}

**CURRENT GENERATED LANES:**
---
SPEC:
${JSON.stringify(currentProject.lanes.spec.output, null, 2)}
---
SQL:
${JSON.stringify(currentProject.lanes.sql.output, null, 2)}
---
UI:
${JSON.stringify(currentProject.lanes.ui.output, null, 2)}
---
TEST:
${JSON.stringify(currentProject.lanes.test.output, null, 2)}
---
CICD:
${JSON.stringify(currentProject.lanes.cicd.output, null, 2)}
---

The user has provided the following conversation history:
${chatMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Based on ALL the context above, respond to the user's latest request. Provide concise answers, and if you provide code, keep it brief and relevant to the change.

**User Request:** ${userMessage}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: contextPrompt }] }]
            })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get response from AI');
        }

        const json = await response.json();
        const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } catch (error) {
        console.error('Error calling AI:', error);
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }
        ]);
      } finally {
        setIsChatting(false);
      }
    },
    [user, currentProject, chatMessages]
  );

  const hasStarted = currentProject !== null;

  return (
    <div className="bg-black min-h-screen text-white font-sans antialiased">
      {showWizard && (
        <EnhancedWizard onComplete={handleWizardComplete} onCancel={() => setShowWizard(false)} />
      )}

      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 1600px 800px at 50% -20%, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 35%, rgba(0,0,0,0) 70%)'
        }}
      />

      <header
        className="sticky top-0 z-40 flex justify-between items-center px-12 py-6 h-[100px]"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="text-2xl font-semibold flex items-center gap-4">
          <Command className="w-8 h-8 text-blue-500" />
          <span>The Platform</span>
        </div>
        <div
          className="inline-flex backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-2xl p-1.5 shadow-2xl"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <button
            onClick={() => setMode('architect')}
            aria-pressed={mode === 'architect'}
            className={`px-8 py-3 text-sm font-medium rounded-xl transition-all ${
              mode === 'architect'
                ? 'bg-white text-zinc-900 shadow-lg scale-[1.02]'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Architect
          </button>
          <button
            onClick={() => setMode('studio')}
            aria-pressed={mode === 'studio'}
            className={`px-8 py-3 text-sm font-medium rounded-xl transition-all ${
              mode === 'studio'
                ? 'bg-white text-zinc-900 shadow-lg scale-[1.02]'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Studio
          </button>
        </div>
        <div className="text-sm text-zinc-400 flex items-center gap-8">
          {mode === 'architect' && (
            <button
              onClick={() => setShowHistory(true)}
              className="text-zinc-400 hover:text-white p-2.5 rounded-xl hover:bg-white/5"
              aria-label="Open History (⌘/Ctrl+K)"
              title="History (⌘/Ctrl+K)"
            >
              <div className="inline-flex items-center gap-3">
                <History className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">History</span>
              </div>
            </button>
          )}
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
            <UserIcon className="w-5 h-5 text-zinc-400" />
            <span className="truncate max-w-[16ch] font-medium">{user?.email || 'Guest'}</span>
          </div>
        </div>
      </header>

      <main className="relative max-w-[1800px] mx-auto px-12 lg:px-16 py-16">
        {mode === 'architect' ? (
          <>
            {!hasStarted ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
                <div className="space-y-20 lg:sticky lg:top-32">
                  <div className="text-left space-y-8">
                    <h1 className="text-8xl md:text-9xl font-semibold tracking-tighter text-white">
                      The Architect
                    </h1>
                    <p className="text-2xl text-zinc-300 max-w-2xl leading-relaxed font-light">
                      Translate expertise into structured systems through a proven four‑stage
                      methodology.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-zinc-400 mb-6">Choose your path</h3>
                    <button
                      onClick={() => setShowWizard(true)}
                      className="w-full p-6 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                          <Command className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-1">Guided Wizard</h4>
                          <p className="text-sm text-zinc-400">
                            Step-by-step configuration in 5 steps
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="relative">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <span className="px-3 bg-black text-zinc-600 text-xs font-medium">OR</span>
                      </div>
                      <div className="border-t border-white/10"></div>
                    </div>

                    <div className="text-center text-zinc-500 text-sm">
                      Write your vision directly below
                    </div>
                  </div>
                </div>

                <div className="lg:h-[calc(100vh-10rem)] flex flex-col">
                  <div className="space-y-10 flex flex-col h-full">
                    <div className="relative flex-1">
                      <textarea
                        value={visionText}
                        onChange={e => setVisionText(e.target.value)}
                        onKeyDown={e => {
                          const mod = e.metaKey || e.ctrlKey;
                          if (mod && e.key === 'Enter' && !isGenerating) {
                            e.preventDefault();
                            void executeArchitecture(visionText);
                          }
                        }}
                        placeholder="Define your Vision. Describe the system you intend to build."
                        disabled={isGenerating}
                        className="relative z-10 w-full min-h-[280px] max-h-[65vh] p-12 text-xl bg-zinc-900/30 border border-white/10 rounded-3xl text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300 backdrop-blur-xl disabled:opacity-50 resize-none leading-relaxed font-light"
                        style={{
                          boxShadow:
                            '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 10px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-6 py-3 text-zinc-400 hover:text-white"
                      >
                        Use Wizard Instead
                      </button>
                      <button
                        onClick={() => executeArchitecture(visionText)}
                        disabled={!visionText.trim() || isGenerating}
                        className={`relative overflow-hidden flex items-center px-12 py-5 text-lg font-medium bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          visionText.trim() && !isGenerating ? 'cta-glow' : ''
                        }`}
                      >
                        {isGenerating ? 'Architecting...' : 'Architect'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={revealComplete ? 'animate-fade-in' : ''}>
                <EnhancedResults
                  project={currentProject}
                  onNewProject={handleNewProject}
                  isGenerating={isGenerating}
                  generationProgress={generationProgress}
                  chatMessages={chatMessages}
                  isChatting={isChatting}
                  sendChatMessage={sendChatMessage}
                />
              </div>
            )}

            {showStagedReveal && (
              <EnhancedStagedReveal onComplete={handleRevealComplete} lanes={lanes} />
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-4xl font-semibold mb-4">Studio Mode</h2>
            <p className="text-zinc-400">Studio functionality coming soon...</p>
          </div>
        )}
      </main>

      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadProject={handleLoadProject}
      />
    </div>
  );
}
