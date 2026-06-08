export type TargetStatus = 'new' | 'researched' | 'drafted' | 'sent' | 'replied';

export interface PainSignal {
  id: string;
  label: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
  source?: string;
}

export interface CustomerStory {
  id: string;
  company: string;
  industry: string;
  pain: string;
  outcome: string;
  proofPoint: string;
  keywords: string[];
}

export interface Target {
  id: string;
  company: string;
  contactName: string;
  title: string;
  industry: string;
  website: string;
  linkedin?: string;
  notes: string;
  status: TargetStatus;
  pains: PainSignal[];
  selectedStoryId?: string;
  generatedOutreach: string;
  lastGeneratedAt?: string;
  researchSummary?: string;
  discoveryQuestions: string[];
}

export const painCatalog: PainSignal[] = [
  {
    id: 'manual-handoff',
    label: 'Manual handoffs are slowing revenue teams',
    evidence: 'Open roles and operational notes mention spreadsheets, manual routing, or delayed follow-up.',
    severity: 'high'
  },
  {
    id: 'tool-sprawl',
    label: 'Tool sprawl and fragmented data',
    evidence: 'Stack descriptions include duplicated CRM, sequencing, enrichment, or analytics tools.',
    severity: 'medium'
  },
  {
    id: 'pipeline-quality',
    label: 'Pipeline quality is hard to forecast',
    evidence: 'Leadership messaging emphasizes efficiency, conversion quality, or sales productivity.',
    severity: 'high'
  },
  {
    id: 'rep-ramp',
    label: 'Rep ramp and enablement gaps',
    evidence: 'Hiring velocity or territory expansion creates a need for repeatable playbooks.',
    severity: 'medium'
  }
];

export const customerStories: CustomerStory[] = [
  {
    id: 'fintech-ramp',
    company: 'Northstar Payments',
    industry: 'Fintech',
    pain: 'Manual qualification caused promising accounts to sit untouched for days.',
    outcome: 'Cut speed-to-lead from 31 hours to 11 minutes while increasing booked meetings by 28%.',
    proofPoint: '28% more booked meetings in one quarter',
    keywords: ['fintech', 'payments', 'speed', 'qualification', 'pipeline']
  },
  {
    id: 'saas-expansion',
    company: 'LedgerFlow',
    industry: 'B2B SaaS',
    pain: 'A growing sales team used inconsistent discovery notes and follow-up messaging.',
    outcome: 'Standardized account research and improved reply quality across three segments.',
    proofPoint: '19% lift in positive replies',
    keywords: ['saas', 'enablement', 'discovery', 'reply', 'sales']
  },
  {
    id: 'healthcare-data',
    company: 'CareGrid',
    industry: 'Healthcare',
    pain: 'Data was split across CRM, partner portals, and spreadsheets.',
    outcome: 'Unified account signals so reps could prioritize expansion opportunities quickly.',
    proofPoint: '$2.4M expansion pipeline sourced',
    keywords: ['healthcare', 'data', 'crm', 'expansion', 'prioritize']
  },
  {
    id: 'manufacturing-ops',
    company: 'ForgeWorks',
    industry: 'Manufacturing',
    pain: 'Regional sellers lacked a repeatable way to personalize into strategic accounts.',
    outcome: 'Created a repeatable account narrative workflow for enterprise sellers.',
    proofPoint: '42% reduction in research time',
    keywords: ['manufacturing', 'enterprise', 'personalize', 'research', 'regional']
  }
];
