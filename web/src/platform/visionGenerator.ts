import type { WizardData } from './types';
import { PROJECT_TEMPLATES, FEATURE_OPTIONS } from './wizardTemplates';

export function generateVisionFromWizard(w: WizardData): string {
  const featureDescriptions = w.features
    .map(f => {
      const feature = FEATURE_OPTIONS.find(opt => opt.id === f);
      return feature ? `- ${feature.name}: ${feature.description}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const projectTemplate = w.projectType ? PROJECT_TEMPLATES[w.projectType] : null;

  return `
Build a ${w.projectType || 'web'} application called "${w.projectName || 'Unnamed Project'}"

PROJECT VISION:
${w.projectDescription || 'A modern web application that solves user needs efficiently.'}

TECHNICAL REQUIREMENTS:
Project Type: ${projectTemplate?.name || 'Web Application'}
Experience Level: ${w.experienceLevel} (optimize code complexity accordingly)
Deployment Target: ${
    w.deploymentTarget === 'bolt'
      ? 'Bolt.new (simplified deployment)'
      : w.deploymentTarget === 'vercel'
      ? 'Vercel (production-ready)'
      : 'Custom infrastructure'
  }

TECHNOLOGY STACK:
- Frontend: ${w.techStack?.frontend || 'Next.js 14 with TypeScript'}
- Backend: ${w.techStack?.backend || 'Supabase Edge Functions'}
- Database: ${w.techStack?.database || 'PostgreSQL with Row Level Security'}
- Authentication: ${w.techStack?.auth || 'Supabase Auth'}
${w.features.includes('payments') ? `- Payments: ${w.techStack?.payments || 'Stripe'}` : ''}
${w.features.includes('email') ? `- Email: ${w.techStack?.email || 'Resend'}` : ''}
${w.features.includes('storage') ? `- Storage: ${w.techStack?.storage || 'Supabase Storage'}` : ''}
${w.features.includes('realtime') ? `- Realtime: ${w.techStack?.realtime || 'Supabase Realtime'}` : ''}

CORE FEATURES:
${featureDescriptions}

GENERATION PREFERENCES:
- Code Complexity: ${
    w.experienceLevel === 'beginner'
      ? 'Simplified with detailed comments'
      : w.experienceLevel === 'intermediate'
      ? 'Standard with best practices'
      : 'Advanced with optimizations'
  }
- Error Handling: Comprehensive with user-friendly messages
- Type Safety: Full TypeScript with strict mode
- Responsive Design: Mobile-first approach
- Performance: Optimized for Core Web Vitals
- Security: Follow OWASP best practices
- Documentation: ${
    w.experienceLevel === 'beginner' ? 'Extensive inline comments' : 'Standard JSDoc comments'
  }

DELIVERABLES:
1. Complete technical specification
2. Database schema with migrations
3. Full UI implementation
4. Comprehensive test suite
5. ${
    w.deploymentTarget === 'bolt'
      ? 'Bolt deployment configuration'
      : w.deploymentTarget === 'vercel'
      ? 'Vercel deployment pipeline'
      : 'Docker and Kubernetes configs'
  }

Make this production-ready with proper error handling, loading states, and a beautiful UI.
`;
}
