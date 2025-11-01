import { Building, Users, MessageSquare, ShoppingCart } from 'lucide-react';
import type { ProjectType, TechStackSelection } from './types';

export const PROJECT_TEMPLATES = {
  saas: {
    name: 'SaaS Platform',
    icon: Building,
    description: 'Subscription-based app with user accounts & recurring payments',
    defaultFeatures: ['auth', 'payments', 'email', 'analytics'],
    suggestedStack: {
      frontend: 'Next.js 14',
      backend: 'Supabase Edge Functions',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth',
      payments: 'Stripe',
      email: 'Resend'
    } as TechStackSelection
  },
  marketplace: {
    name: 'Marketplace',
    icon: Users,
    description: 'Connect buyers & sellers with transactions and reviews',
    defaultFeatures: ['auth', 'payments', 'email', 'storage', 'realtime'],
    suggestedStack: {
      frontend: 'Next.js 14',
      backend: 'Node.js + Express',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth',
      payments: 'Stripe',
      storage: 'Supabase Storage'
    } as TechStackSelection
  },
  social: {
    name: 'Social Platform',
    icon: MessageSquare,
    description: 'Profiles, posts, comments, and real-time interactions',
    defaultFeatures: ['auth', 'storage', 'realtime', 'email'],
    suggestedStack: {
      frontend: 'React + Vite',
      backend: 'Supabase',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth',
      realtime: 'Supabase Realtime',
      storage: 'Supabase Storage'
    } as TechStackSelection
  },
  ecommerce: {
    name: 'E-commerce Store',
    icon: ShoppingCart,
    description: 'Products, cart, checkout, and order management',
    defaultFeatures: ['auth', 'payments', 'email', 'storage', 'analytics'],
    suggestedStack: {
      frontend: 'Next.js 14',
      backend: 'Supabase',
      database: 'Supabase PostgreSQL',
      auth: 'Supabase Auth',
      payments: 'Stripe',
      email: 'Resend'
    } as TechStackSelection
  }
};

export const FEATURE_OPTIONS = [
  { id: 'auth', name: '🔐 User Authentication', description: 'Login, signup, password reset' },
  { id: 'payments', name: '💳 Payment Processing', description: 'Subscriptions and one-time payments' },
  { id: 'email', name: '📧 Email Notifications', description: 'Transactional and marketing emails' },
  { id: 'storage', name: '📁 File Storage', description: 'Upload and manage files/images' },
  { id: 'realtime', name: '⚡ Real-time Updates', description: 'Live data synchronization' },
  { id: 'analytics', name: '📊 Analytics Dashboard', description: 'Track metrics and user behavior' },
  { id: 'admin', name: '👤 Admin Panel', description: 'Manage users and content' },
  { id: 'api', name: '🔌 API Access', description: 'RESTful or GraphQL API' },
  { id: 'search', name: '🔍 Search & Filters', description: 'Advanced search capabilities' },
  { id: 'notifications', name: '🔔 Push Notifications', description: 'In-app and mobile notifications' }
];
