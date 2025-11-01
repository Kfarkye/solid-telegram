export type ProjectType = 'saas' | 'marketplace' | 'social' | 'ecommerce';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type DeploymentTarget = 'bolt' | 'vercel' | 'custom';

export interface TechStackSelection {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  payments?: string;
  email?: string;
  storage?: string;
  realtime?: string;
}

export interface WizardData {
  projectType: ProjectType | null;
  projectName: string;
  projectDescription: string;
  features: string[];
  experienceLevel: ExperienceLevel | null;
  deploymentTarget: DeploymentTarget | null;
  techStack: TechStackSelection | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredProject {
  id: string;
  vision: string;
  project_name?: string;
  timestamp: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  lanes: Record<LaneId, LaneResult>;
  wizardData?: WizardData;
}

export type LaneId = 'spec' | 'sql' | 'ui' | 'test' | 'cicd';

export interface LaneResult {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  output?: any;
  error?: string;
  meta?: {
    model?: string;
    provider?: string;
    error?: string;
  };
  lane?: string;
  created_at?: string;
}
