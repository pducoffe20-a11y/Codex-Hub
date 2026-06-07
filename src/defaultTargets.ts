import type { Target } from './data';
import { painCatalog } from './data';
import { getDiscoveryQuestions } from './utils/discoveryQuestions';

export const createTargetId = () => `target-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const makeBlankTarget = (): Target => ({
  id: createTargetId(),
  company: '',
  contactName: '',
  title: '',
  industry: '',
  website: '',
  linkedin: '',
  notes: '',
  status: 'new',
  pains: [],
  generatedOutreach: '',
  discoveryQuestions: getDiscoveryQuestions('', [])
});

export const defaultTargets: Target[] = [
  {
    id: 'target-apex',
    company: 'Apex Analytics',
    contactName: 'Morgan Lee',
    title: 'VP Revenue Operations',
    industry: 'B2B SaaS',
    website: 'https://example.com/apex',
    linkedin: 'https://linkedin.com/company/apex-analytics',
    notes: 'Scaling mid-market sales and hiring RevOps analysts. Leadership posts mention CRM hygiene and forecast confidence.',
    status: 'researched',
    pains: [painCatalog[1], painCatalog[2]],
    selectedStoryId: 'saas-expansion',
    generatedOutreach: '',
    researchSummary: 'Apex appears focused on clean pipeline data, better forecasting, and faster sales team execution.',
    discoveryQuestions: getDiscoveryQuestions('B2B SaaS', [painCatalog[1], painCatalog[2]])
  },
  {
    id: 'target-nova',
    company: 'NovaPay',
    contactName: 'Priya Shah',
    title: 'Head of Growth',
    industry: 'Fintech',
    website: 'https://example.com/novapay',
    linkedin: 'https://linkedin.com/company/novapay',
    notes: 'Payments startup expanding outbound motion into new verticals. Recent hiring suggests SDR team growth.',
    status: 'new',
    pains: [painCatalog[0], painCatalog[3]],
    selectedStoryId: 'fintech-ramp',
    generatedOutreach: '',
    researchSummary: 'NovaPay likely needs fast account qualification and consistent messaging as the SDR team grows.',
    discoveryQuestions: getDiscoveryQuestions('Fintech', [painCatalog[0], painCatalog[3]])
  }
];
