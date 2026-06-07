export type LmsId =
  | 'forj'
  | 'topclass'
  | 'docebo'
  | 'thought_industries'
  | 'blue_sky'
  | 'litmos'
  | 'crowd_wisdom'
  | 'moodle'
  | 'homegrown_none'
  | 'unsure_research';

export type PainPoint = {
  id: string;
  label: string;
  evidence: string;
  d2lAngle: string;
};

export type CompetitorProfile = {
  id: LmsId;
  name: string;
  summary: string;
  pains: PainPoint[];
  migrationTrigger: string;
};

export type CustomerStory = {
  id: string;
  organization: string;
  verticals: string[];
  headline: string;
  proof: string;
  useWhen: string;
};

export const competitorPainDatabase: Record<LmsId, CompetitorProfile> = {
  forj: {
    id: 'forj',
    name: 'Forj',
    summary: 'Community-first learning platform often used by associations that need stronger credentialing and analytics maturity.',
    migrationTrigger: 'When member education has outgrown community content delivery and leaders need defensible CE, reporting, and scalable learner journeys.',
    pains: [
      { id: 'forj-reporting', label: 'Limited executive reporting depth', evidence: 'Teams often need clearer insight into learner progress, engagement, and program impact.', d2lAngle: 'Brightspace analytics and outcomes tracking help education teams prove value to boards and sponsors.' },
      { id: 'forj-credential', label: 'Credential workflows can feel bolted on', evidence: 'CE, certification, badging, and renewal processes may require manual coordination.', d2lAngle: 'Position D2L as a stronger foundation for repeatable credential pathways and compliance-friendly records.' },
      { id: 'forj-scale', label: 'Scaling beyond member community experiences', evidence: 'Complex catalogs, blended delivery, and segmented audiences strain lighter learning workflows.', d2lAngle: 'Brightspace supports sophisticated learning paths across internal, external, and continuing education audiences.' }
    ]
  },
  topclass: {
    id: 'topclass',
    name: 'TopClass',
    summary: 'Association LMS with credentialing roots, commonly evaluated when customer experience and modernization become board-level concerns.',
    migrationTrigger: 'When an association wants modern UX, stronger automation, and faster innovation without losing CE discipline.',
    pains: [
      { id: 'topclass-ux', label: 'Learner and admin UX modernization', evidence: 'Older association LMS workflows can require too many clicks for learners and staff.', d2lAngle: 'Brightspace offers polished learner experiences and configurable admin workflows.' },
      { id: 'topclass-integrations', label: 'AMS and ecosystem complexity', evidence: 'Associations need cleaner data flow among AMS, ecommerce, CE, and marketing systems.', d2lAngle: 'Discuss API, integration, and services support for connected member education.' },
      { id: 'topclass-innovation', label: 'Innovation velocity concerns', evidence: 'Teams may want AI-ready content workflows and richer analytics faster than legacy roadmaps allow.', d2lAngle: 'Connect D2L’s product investment to reduced platform risk.' }
    ]
  },
  docebo: {
    id: 'docebo',
    name: 'Docebo',
    summary: 'Enterprise LMS/LXP with broad use cases; buyers may question fit for specialized education, governance, and services needs.',
    migrationTrigger: 'When learning leaders need more education-grade support, measurable outcomes, and partnership around complex learning operations.',
    pains: [
      { id: 'docebo-complexity', label: 'Enterprise complexity and admin overhead', evidence: 'Flexible platforms can require governance discipline and specialized setup to avoid sprawl.', d2lAngle: 'Brightspace can be framed as structured, scalable, and supported for mission-critical learning.' },
      { id: 'docebo-cost', label: 'Value clarity at renewal', evidence: 'Broad feature sets can create renewal scrutiny if only a subset drives outcomes.', d2lAngle: 'Lead with targeted outcomes, adoption, and retention metrics rather than feature volume.' },
      { id: 'docebo-education', label: 'Specialized education fit', evidence: 'Associations and education providers often need deep assessment, CE, and learner record workflows.', d2lAngle: 'D2L’s education heritage helps teams run rigorous learning, not just training portals.' }
    ]
  },
  thought_industries: {
    id: 'thought_industries',
    name: 'Thought Industries',
    summary: 'External training platform for customer education and monetized learning.',
    migrationTrigger: 'When customer education teams need richer academic-grade learning design, assessment, and analytics across multiple audiences.',
    pains: [
      { id: 'ti-assessment', label: 'Assessment rigor and learning design', evidence: 'Commercial training teams can need stronger quizzes, rubrics, and outcomes mapping.', d2lAngle: 'Brightspace brings robust assessment and mastery-oriented design.' },
      { id: 'ti-multi-audience', label: 'Multi-audience governance', evidence: 'Extended enterprise catalogs can become hard to govern across partners, customers, and staff.', d2lAngle: 'Position segmentation, roles, and scalable administration.' },
      { id: 'ti-data', label: 'Revenue-to-learning insight gap', evidence: 'Teams need to connect purchases, completion, and renewal impact.', d2lAngle: 'D2L analytics can support stronger value narratives for commercial learning.' }
    ]
  },
  blue_sky: {
    id: 'blue_sky',
    name: 'Blue Sky eLearn',
    summary: 'Association learning and event education provider used for CE, webinars, and content libraries.',
    migrationTrigger: 'When webinar-centric education needs to become a year-round credential and learning business.',
    pains: [
      { id: 'blue-sky-webinar', label: 'Webinar-to-learning maturity', evidence: 'Recorded events may not create durable pathways or skill evidence.', d2lAngle: 'Brightspace helps convert content libraries into structured journeys.' },
      { id: 'blue-sky-ce', label: 'CE tracking consistency', evidence: 'CE workflows across live, on-demand, and blended programs can be manual.', d2lAngle: 'Use credential pathway and reporting language.' },
      { id: 'blue-sky-brand', label: 'Member experience expectations', evidence: 'Learners expect modern, mobile-friendly education experiences.', d2lAngle: 'Frame Brightspace as a branded, engaging destination for professional learning.' }
    ]
  },
  litmos: {
    id: 'litmos',
    name: 'Litmos',
    summary: 'Training LMS common in corporate enablement, compliance, and partner education.',
    migrationTrigger: 'When organizations need richer learning design, analytics, and education-grade flexibility beyond straightforward training assignment.',
    pains: [
      { id: 'litmos-depth', label: 'Learning depth beyond compliance', evidence: 'Simple assignment workflows may not support complex courses, assessment, or credentials.', d2lAngle: 'Brightspace supports deeper learning, not just completion tracking.' },
      { id: 'litmos-reporting', label: 'Actionable analytics needs', evidence: 'Leaders often need better signals than completion percentages.', d2lAngle: 'Lead with outcomes, progress, and engagement insight.' },
      { id: 'litmos-scale', label: 'Brand and audience flexibility', evidence: 'Multiple external audiences can need distinct experiences and governance.', d2lAngle: 'Discuss configurable experiences and administrative control.' }
    ]
  },
  crowd_wisdom: {
    id: 'crowd_wisdom',
    name: 'Crowd Wisdom',
    summary: 'Association LMS focused on member learning, CE, and certification programs.',
    migrationTrigger: 'When association teams need to modernize member education while protecting credential quality.',
    pains: [
      { id: 'cw-modernization', label: 'Modernization pressure', evidence: 'Member expectations for digital education continue to rise.', d2lAngle: 'Brightspace can modernize the experience while keeping education rigor.' },
      { id: 'cw-admin', label: 'Manual credential administration', evidence: 'Certification, renewal, and CE exceptions can consume staff time.', d2lAngle: 'Position automation, tracking, and clearer learner records.' },
      { id: 'cw-growth', label: 'Program growth constraints', evidence: 'Growing catalogs and audiences require scalable controls.', d2lAngle: 'Discuss pathways, analytics, and support for program expansion.' }
    ]
  },
  moodle: {
    id: 'moodle',
    name: 'Moodle',
    summary: 'Open-source LMS valued for flexibility but dependent on hosting, plugins, and internal administration.',
    migrationTrigger: 'When internal teams want less maintenance burden, stronger support, and a polished experience without sacrificing learning depth.',
    pains: [
      { id: 'moodle-maintenance', label: 'Maintenance and plugin burden', evidence: 'Open-source flexibility can create upgrade, security, and plugin dependency work.', d2lAngle: 'Brightspace reduces platform maintenance while retaining robust learning tools.' },
      { id: 'moodle-ux', label: 'Inconsistent user experience', evidence: 'Theme and plugin choices can create uneven learner journeys.', d2lAngle: 'Position a consistent, modern experience for learners and admins.' },
      { id: 'moodle-support', label: 'Support accountability', evidence: 'Complex issues can sit across host, plugin vendor, and internal team.', d2lAngle: 'D2L offers a clearer partner model for mission-critical education.' }
    ]
  },
  homegrown_none: {
    id: 'homegrown_none',
    name: 'Homegrown/None',
    summary: 'Spreadsheets, portals, CMS pages, shared drives, or custom tools substituting for a dedicated LMS.',
    migrationTrigger: 'When manual operations, compliance risk, or learner expectations make a purpose-built LMS urgent.',
    pains: [
      { id: 'homegrown-manual', label: 'Manual tracking and reporting', evidence: 'Staff may reconcile attendance, completion, CE, and exceptions by hand.', d2lAngle: 'Brightspace centralizes records and reporting.' },
      { id: 'homegrown-risk', label: 'Continuity and compliance risk', evidence: 'Custom tools are vulnerable to owner turnover, brittle workflows, and audit gaps.', d2lAngle: 'Position D2L as durable infrastructure for high-stakes learning.' },
      { id: 'homegrown-experience', label: 'Fragmented learner experience', evidence: 'Learners navigate separate registration, content, webinar, and certificate steps.', d2lAngle: 'Brightspace creates a coherent learning destination.' }
    ]
  },
  unsure_research: {
    id: 'unsure_research',
    name: 'Unsure Research',
    summary: 'Use when the LMS is unknown and outreach should invite verification rather than assert a vendor.',
    migrationTrigger: 'When a public signal suggests credentialing, continuing education, member training, or certification growth, but the platform is unclear.',
    pains: [
      { id: 'unknown-signal', label: 'Unknown platform risk', evidence: 'Public sites may show learning programs without clear operational infrastructure.', d2lAngle: 'Ask a concise question about current learning operations before positioning Brightspace.' },
      { id: 'unknown-ce', label: 'Potential CE or credential complexity', evidence: 'Many professional bodies track CE, certificates, or renewals across programs.', d2lAngle: 'Reference D2L’s experience supporting rigorous professional learning.' },
      { id: 'unknown-scale', label: 'Possible scaling pressure', evidence: 'Program growth can expose manual reporting and learner experience gaps.', d2lAngle: 'Offer a low-friction conversation about modernization triggers.' }
    ]
  }
};

export const customerStories: CustomerStory[] = [
  { id: 'cpa-ontario', organization: 'CPA Ontario', verticals: ['association', 'finance', 'credentialing', 'professional education'], headline: 'Scaled professional education and member learning with Brightspace', proof: 'Useful for complex CE, certification, and member education programs that need trustworthy learner records.', useWhen: 'Use when an account has member credentialing, finance, accounting, or compliance education signals.' },
  { id: 'american-academy', organization: 'American Academy of Pediatrics', verticals: ['healthcare', 'association', 'continuing medical education', 'credentialing'], headline: 'Supports high-stakes healthcare professional learning', proof: 'Relevant when clinical accuracy, CME/CE, and learner confidence matter.', useWhen: 'Use for medical associations, clinical societies, and health education providers.' },
  { id: 'southern-new-hampshire', organization: 'Southern New Hampshire University', verticals: ['higher education', 'online learning', 'workforce'], headline: 'Online learning at significant scale', proof: 'Shows Brightspace can support large, distributed learner populations.', useWhen: 'Use when scale, online delivery, or nontraditional learner support are central.' },
  { id: 'ymca', organization: 'YMCA of the USA', verticals: ['nonprofit', 'workforce training', 'distributed teams'], headline: 'Learning for distributed staff and mission-driven programs', proof: 'Helpful for nonprofit or chapter-based organizations coordinating learning across locations.', useWhen: 'Use when a federated or chapter-based model creates governance complexity.' },
  { id: 'k12-professional', organization: 'D2L education partners', verticals: ['education', 'teacher development', 'public sector'], headline: 'Structured learning and outcomes for educators', proof: 'Good fit for education-focused organizations with professional development needs.', useWhen: 'Use when an account serves educators, institutions, or public learning programs.' }
];

export const verticalStoryMatches: Record<string, string[]> = {
  healthcare: ['american-academy', 'cpa-ontario'],
  medical: ['american-academy'],
  association: ['cpa-ontario', 'american-academy', 'ymca'],
  finance: ['cpa-ontario'],
  accounting: ['cpa-ontario'],
  nonprofit: ['ymca', 'american-academy'],
  education: ['southern-new-hampshire', 'k12-professional'],
  university: ['southern-new-hampshire'],
  workforce: ['ymca', 'southern-new-hampshire'],
  credentialing: ['cpa-ontario', 'american-academy']
};

export const voiceGuidelines = {
  principles: [
    'Write like a peer who did the homework, not a vendor pitching a platform.',
    'Use one concrete observation, one plausible pain, and one soft question.',
    'Keep email body between 60 and 90 words.',
    'Avoid overclaiming the prospect’s current LMS unless research confidence is high.',
    'Prefer practical words over hype.'
  ],
  bannedWords: ['revolutionize', 'game-changing', 'synergy', 'seamless', 'robust', 'cutting-edge', 'leverage', 'unlock', 'transformative', 'best-in-class', 'world-class', 'empower'],
  approvedOpeners: [
    'Noticed your team is expanding professional learning around',
    'I was looking at your education programs and noticed',
    'Saw the emphasis you place on member learning and',
    'Quick question after reviewing your certification resources:',
    'Your continuing education work stood out because'
  ],
  softCtas: [
    'Worth a quick comparison?',
    'Open to a 15-minute look at what teams usually modernize first?',
    'Would it be useful to compare notes on the current learning setup?',
    'Should I send a short checklist for LMS modernization triggers?',
    'Is this on your radar for the next planning cycle?'
  ],
  fusionPsVariants: [
    'P.S. If you will be at Fusion, I can point you to sessions on credential and association learning.',
    'P.S. Fusion has a few practical sessions on scaling professional education if that is useful.',
    'P.S. Happy to share the Fusion agenda items most relevant to CE and credential programs.'
  ]
};

export const statuses = ['Not started', 'Researching', 'Drafted', 'Copied', 'Sent', 'Snoozed'] as const;
export type OutreachStatus = (typeof statuses)[number];
