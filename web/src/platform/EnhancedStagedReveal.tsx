import { useEffect, useState } from 'react';
import { Target, Layers, CheckCircle, Repeat, Loader2, ChevronRight } from 'lucide-react';
import type { LaneResult } from './types';

interface EnhancedStagedRevealProps {
  onComplete: () => void;
  lanes: Record<string, LaneResult>;
}

export function EnhancedStagedReveal({ onComplete, lanes }: EnhancedStagedRevealProps) {
  const [isExiting, setIsExiting] = useState(false);

  const specComplete = lanes.spec?.status === 'succeeded';
  const sqlComplete = lanes.sql?.status === 'succeeded';

  type StepState = 'complete' | 'active' | 'idle';

  const getStepState = (stepId: number): StepState => {
    if (stepId === 1) return 'complete';
    if (stepId === 2) return specComplete ? 'complete' : 'active';
    if (stepId === 3) return specComplete ? (sqlComplete ? 'active' : 'idle') : 'idle';
    return 'idle';
  };

  const steps = [
    {
      id: 1,
      name: 'Vision',
      description: 'Purpose',
      detail: 'Capture intent, context, and constraints.',
      icon: Target,
      state: getStepState(1)
    },
    {
      id: 2,
      name: 'Compose',
      description: 'Structure',
      detail: 'Translate vision into architecture.',
      icon: Layers,
      state: getStepState(2)
    },
    {
      id: 3,
      name: 'Validate',
      description: 'Coherence',
      detail: 'Examine structural logic and integrity.',
      icon: CheckCircle,
      state: getStepState(3)
    },
    {
      id: 4,
      name: 'Refine',
      description: 'Precision',
      detail: 'Iterate conversationally.',
      icon: Repeat,
      state: getStepState(4)
    }
  ];

  useEffect(() => {
    if (specComplete && sqlComplete && !isExiting) {
      const t = setTimeout(() => {
        setIsExiting(true);
        const t2 = setTimeout(onComplete, 700);
        return () => clearTimeout(t2);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [specComplete, sqlComplete, isExiting, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-700 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backdropFilter: 'blur(24px)' }}
    >
      <div className="animated-gradient-bg" />
      <div className="w-full max-w-4xl px-12 animate-reveal-in">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-semibold tracking-tight text-white">
            The Architect Method
          </h2>
          <p className="text-zinc-400 text-lg font-light">Translating your vision into structure</p>
        </div>

        <ol className="space-y-8 relative">
          <div className="absolute left-9 top-14 bottom-14 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          {steps.map((step, i) => {
            const isActive = step.state === 'active';
            const isComplete = step.state === 'complete';
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className="animate-reveal-in"
                style={{ animationDelay: `${150 + i * 100}ms` }}
              >
                <div
                  className={`relative overflow-hidden rounded-3xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/30 shadow-2xl shadow-blue-500/10'
                      : isComplete
                      ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 shadow-xl shadow-emerald-500/5'
                      : 'bg-white/[0.03] border border-white/10 shadow-lg'
                  }`}
                >
                  <div className="relative flex items-center gap-8 p-8">
                    <div
                      className={`relative flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl ${
                        isActive
                          ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 scale-105 shadow-lg shadow-blue-500/20'
                          : isComplete
                          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-md shadow-emerald-500/10'
                          : 'bg-white/5'
                      }`}
                    >
                      <Icon
                        className={`w-7 h-7 ${
                          isActive
                            ? 'text-blue-400 scale-110'
                            : isComplete
                            ? 'text-emerald-400'
                            : 'text-zinc-400'
                        }`}
                      />
                      {isComplete && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-4 mb-2">
                        <h3
                          className={`text-2xl font-semibold ${
                            isActive
                              ? 'text-blue-400'
                              : isComplete
                              ? 'text-emerald-400'
                              : 'text-white'
                          }`}
                        >
                          {step.name}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                        <span className="text-base text-zinc-500 font-light">
                          {step.description}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-base leading-relaxed font-light">
                        {step.detail}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {isActive && (
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div
          className="mt-12 text-center transition-all animate-reveal-in"
          style={{ animationDelay: '700ms' }}
        >
          <p className="text-base text-zinc-500 font-light">
            {!specComplete && 'Analyzing your vision and composing structure...'}
            {specComplete && !sqlComplete && 'Architecture taking shape...'}
            {specComplete && sqlComplete && !isExiting && 'Foundation complete. Revealing workspace...'}
            {isExiting && 'Opening your architecture...'}
          </p>
        </div>
      </div>
    </div>
  );
}
