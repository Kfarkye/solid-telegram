import { useState } from 'react';
import {
  Wand2,
  ArrowRight,
  ChevronLeft,
  Check as CheckIcon,
  Rocket
} from 'lucide-react';
import type { WizardData, ProjectType, ExperienceLevel } from './types';
import { PROJECT_TEMPLATES, FEATURE_OPTIONS } from './wizardTemplates';

interface EnhancedWizardProps {
  onComplete: (wizardData: WizardData) => void;
  onCancel: () => void;
}

export function EnhancedWizard({ onComplete, onCancel }: EnhancedWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    projectType: null,
    projectName: '',
    projectDescription: '',
    features: [],
    experienceLevel: null,
    deploymentTarget: null,
    techStack: null
  });
  const totalSteps = 5;

  const handleProjectTypeSelect = (type: ProjectType) => {
    const template = PROJECT_TEMPLATES[type];
    setWizardData(prev => ({
      ...prev,
      projectType: type,
      features: template.defaultFeatures,
      techStack: template.suggestedStack
    }));
  };

  const toggleFeature = (featureId: string) => {
    setWizardData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleExperienceSelect = (level: ExperienceLevel) => {
    setWizardData(prev => ({
      ...prev,
      experienceLevel: level,
      deploymentTarget:
        level === 'beginner' ? 'bolt' : level === 'intermediate' ? 'vercel' : 'custom'
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.projectType !== null;
      case 2:
        return wizardData.projectName.trim() !== '' && wizardData.projectDescription.trim() !== '';
      case 3:
        return wizardData.features.length > 0;
      case 4:
        return wizardData.experienceLevel !== null;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(p => p + 1);
    } else {
      onComplete(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(p => p - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse 1400px 700px at 50% 20%, rgba(17,24,39,0.98) 0%, rgba(0,0,0,0.98) 50%, rgba(0,0,0,1) 100%)',
        backdropFilter: 'blur(24px)'
      }}
    >
      <div className="w-full max-w-5xl px-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 mb-6">
            <Wand2 className="w-8 h-8 text-blue-400" />
            <h1 className="text-5xl font-semibold text-white tracking-tight">
              The Architect Wizard
            </h1>
          </div>
          <p className="text-zinc-400 text-lg font-light">5 simple steps</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -translate-y-1/2" />
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step === currentStep
                    ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/50'
                    : step < currentStep
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-zinc-400'
                }`}
              >
                {step < currentStep ? <CheckIcon className="w-5 h-5" /> : step}
              </div>
              <span
                className={`absolute -bottom-6 text-xs whitespace-nowrap ${
                  step === currentStep ? 'text-blue-400' : 'text-zinc-600'
                }`}
              >
                {step === 1 && 'Project Type'}
                {step === 2 && 'Details'}
                {step === 3 && 'Features'}
                {step === 4 && 'Experience'}
                {step === 5 && 'Review'}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 min-h-[500px] backdrop-blur-xl">
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-semibold text-white mb-8">What are you building?</h2>
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(PROJECT_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handleProjectTypeSelect(key as ProjectType)}
                      className={`p-8 rounded-2xl border-2 transition-all text-left group ${
                        wizardData.projectType === key
                          ? 'bg-blue-500/10 border-blue-500 scale-[1.02]'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl ${
                            wizardData.projectType === key
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-white/5 text-zinc-400 group-hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                          <p className="text-zinc-400 text-sm leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-semibold text-white mb-8">
                Tell us about your project
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={wizardData.projectName}
                    onChange={e =>
                      setWizardData(prev => ({ ...prev, projectName: e.target.value }))
                    }
                    placeholder="e.g., TaskFlow Pro"
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Project Description
                  </label>
                  <textarea
                    value={wizardData.projectDescription}
                    onChange={e =>
                      setWizardData(prev => ({ ...prev, projectDescription: e.target.value }))
                    }
                    placeholder="Describe your vision..."
                    rows={6}
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-semibold text-white mb-8">Select your features</h2>
              <div className="grid grid-cols-2 gap-4">
                {FEATURE_OPTIONS.map(feature => (
                  <button
                    key={feature.id}
                    onClick={() => toggleFeature(feature.id)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      wizardData.features.includes(feature.id)
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          wizardData.features.includes(feature.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/30'
                        }`}
                      >
                        {wizardData.features.includes(feature.id) && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{feature.name}</div>
                        <div className="text-xs text-zinc-400 mt-1">{feature.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-semibold text-white mb-8">
                What's your experience level?
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => handleExperienceSelect(level)}
                    className={`p-8 rounded-2xl border-2 transition-all ${
                      wizardData.experienceLevel === level
                        ? level === 'beginner'
                          ? 'bg-emerald-500/10 border-emerald-500'
                          : level === 'intermediate'
                          ? 'bg-blue-500/10 border-blue-500'
                          : 'bg-purple-500/10 border-purple-500'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="text-4xl mb-4">
                      {level === 'beginner' ? '🌱' : level === 'intermediate' ? '🌿' : '🌳'}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 capitalize">{level}</h3>
                    <p className="text-sm text-zinc-400">
                      {level === 'beginner'
                        ? "I'm new to deployment"
                        : level === 'intermediate'
                        ? "I've deployed before"
                        : 'I handle DevOps'}
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p
                        className={`text-xs ${
                          level === 'advanced' ? 'text-purple-400' : 'text-blue-400'
                        }`}
                      >
                        {level === 'beginner'
                          ? 'Deploys to Bolt.new'
                          : level === 'intermediate'
                          ? 'Deploys to Vercel'
                          : 'Custom deployment'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-3xl font-semibold text-white">Review your architecture</h2>
              <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Project</h3>
                <p className="text-xl text-white font-semibold">
                  {wizardData.projectName || 'Unnamed Project'}
                </p>
                <p className="text-zinc-400 mt-2">
                  {wizardData.projectDescription || 'No description'}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Architecture Stack</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500">Frontend</span>
                    <p className="text-white">{wizardData.techStack?.frontend || 'Next.js 14'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Backend</span>
                    <p className="text-white">{wizardData.techStack?.backend || 'Supabase'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Database</span>
                    <p className="text-white">{wizardData.techStack?.database || 'PostgreSQL'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Deployment</span>
                    <p className="text-white capitalize">
                      {wizardData.deploymentTarget || 'vercel'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-6 border border-white/10">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">
                  Features ({wizardData.features.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {wizardData.features.map(f => {
                    const feature = FEATURE_OPTIONS.find(opt => opt.id === f);
                    return (
                      <span
                        key={f}
                        className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm"
                      >
                        {feature?.name.split(' ')[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleNext}
                className="group w-full text-left bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-4">
                  <Rocket className="w-8 h-8 text-blue-400" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Ready to build!</h3>
                    <p className="text-zinc-400">All lanes will be generated end‑to‑end.</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-400 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={currentStep === 1 ? onCancel : handleBack}
            className="flex items-center gap-2 px-6 py-3 text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-medium ${
              canProceed()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white/5 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {currentStep === 5 ? (
              <>Generate Architecture</>
            ) : (
              <>
                Continue <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
