export type TestExecutionStatus = 'Passed' | 'Failed' | 'Blocked' | 'Pending';

export type DefectStatus = 'Open' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed' | 'Reopened';

export type DefectSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type DefectPriority = 'P1 - Urgent' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';

export interface DefectItem {
  id: string; // unique ID or Bug ID
  bugId: string; // e.g. "BUG-101", "TC-OHRM-08"
  testCaseId: string; // e.g. "TC-01", "TC-02"
  title: string;
  module: string;
  testExecutionStatus: TestExecutionStatus;
  defectStatus: DefectStatus;
  severity: DefectSeverity;
  priority: DefectPriority;
  assignedTo: string;
  reportedBy: string;
  environment: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  driveLink?: string;
  githubLink?: string;
  createdDate: string;
  updatedDate: string;
}

export interface ProjectMeta {
  projectName: string;
  projectLink: string;
  assignedQAMembers: string[];
  estimatedStartDate: string;
  estimatedEndDate: string;
  driveLink: string;
  githubRepoLink: string;
  testSuite: string;
  version: string;
  revision?: string;
}

export interface ExecutionReportStats {
  totalExecuted: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  passRate: number;
  failRate: number;
  blockedRate: number;
}

export interface QAUser {
  username: string;
  name: string;
  role: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}
