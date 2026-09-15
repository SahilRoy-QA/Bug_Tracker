import { DefectItem, ProjectMeta } from '../types.ts';

export const initialProjectMeta: ProjectMeta = {
  projectName: 'Enterprise Core HR Portal',
  projectLink: 'https://demo.app.internal/auth/login',
  assignedQAMembers: ['Sahil Roy', 'Jeet Mondal'],
  estimatedStartDate: '2026-07-06',
  estimatedEndDate: '2026-07-06',
  tag: 'Core-HR-Regression',
  tags: ['Core-HR', 'Regression'],
  version: '6.1.0',
  revision: '2620'
};

// Initialized to empty so users start logging bugs from zero as requested
export const initialDefects: DefectItem[] = [];
