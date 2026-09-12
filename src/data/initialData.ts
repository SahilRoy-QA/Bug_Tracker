import { DefectItem, ProjectMeta } from '../types.ts';

export const initialProjectMeta: ProjectMeta = {
  projectName: 'Enterprise Core HR Portal',
  projectLink: 'https://demo.app.internal/auth/login',
  assignedQAMembers: ['Sahil Roy', 'Jeet Mondal'],
  estimatedStartDate: '2026-07-06',
  estimatedEndDate: '2026-07-06',
  driveLink: 'https://drive.google.com/drive/folders/qa-test-evidence-2026',
  githubRepoLink: 'https://github.com/company/core-hr-app',
  testSuite: 'Sprint 24 - Core HR & Access Control Regression Suite',
  version: '5.0.0',
  revision: '2500'
};

// Initialized to empty so users start logging bugs from zero as requested
export const initialDefects: DefectItem[] = [];
