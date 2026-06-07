import type { LmsId, OutreachStatus } from './data';

export type TargetAccount = {
  id: string;
  accountName: string;
  website: string;
  vertical: string;
  contactName: string;
  title: string;
  email: string;
  lmsId: LmsId;
  hasCredential: boolean;
  status: OutreachStatus;
  notes: string;
};

export const defaultTargets: TargetAccount[] = [
  { id: 'american-nurses', accountName: 'American Nurses Association', website: 'nursingworld.org', vertical: 'healthcare association credentialing', contactName: 'Jordan Lee', title: 'Director, Education Programs', email: 'jordan.lee@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'Public CE and credential signals; verify current LMS.' },
  { id: 'project-mgmt', accountName: 'Project Management Institute Chapter Network', website: 'pmi.org', vertical: 'association professional education credentialing', contactName: 'Maya Patel', title: 'VP, Learning Experience', email: 'maya.patel@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'Credential renewal and chapter education complexity.' },
  { id: 'state-cpa', accountName: 'State CPA Society', website: 'examplecpa.org', vertical: 'finance accounting association credentialing', contactName: 'Chris Morgan', title: 'Chief Learning Officer', email: 'chris.morgan@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'CPE catalog and member education use case.' },
  { id: 'clinical-quality', accountName: 'Institute for Clinical Quality', website: 'clinicalquality.example', vertical: 'healthcare continuing medical education', contactName: 'Taylor Kim', title: 'Education Operations Lead', email: 'taylor.kim@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'CME-like education and reporting requirements.' },
  { id: 'supply-chain-pros', accountName: 'Supply Chain Professionals Alliance', website: 'scpa.example', vertical: 'association workforce credentialing', contactName: 'Alex Rivera', title: 'Director of Member Education', email: 'alex.rivera@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'Certification prep and renewal education.' },
  { id: 'nonprofit-leadership', accountName: 'Nonprofit Leadership Council', website: 'nlc.example', vertical: 'nonprofit workforce association credentialing', contactName: 'Sam Nguyen', title: 'Head of Learning', email: 'sam.nguyen@example.org', lmsId: 'unsure_research', hasCredential: true, status: 'Not started', notes: 'Distributed professional development with credential signals.' }
];
