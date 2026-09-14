export type TestExecutionStatus = 'Passed' | 'Failed' | 'Blocked' | 'Pending';

export type DefectStatus = 'Open' | 'In Progress' | 'Doubt' | 'Resolved' | 'Verified' | 'Closed' | 'Reopened';

export type DefectSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type DefectPriority = 'P1 - Urgent' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';

export interface DefectItem {
  id: string; // unique ID or Bug ID
  bugId: string; // e.g. "BUG-101", "TC-OHRM-08"
  testCaseId: string; // e.g. "TC-01", "TC-02"
  title: string; // Defect Title
  summary?: string; // Defect Summary
  screenshotPng?: string; // Base64 data URL for PNG screenshot attachment
  screenshotName?: string; // Original PNG file name
  screenshotSize?: string; // Formatted size (e.g. "124 KB")
  module: string;
  testExecutionStatus?: TestExecutionStatus;
  defectStatus: DefectStatus;
  severity: DefectSeverity;
  priority: DefectPriority;
  assignedTo: string;
  reportedBy: string;
  reportedByUsername?: string;
  createdBy?: string;
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
  tag?: string;
  tags?: string[];
  version: string;
  revision?: string;
  driveLink?: string;
  githubRepoLink?: string;
  testSuite?: string;
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
  pendingRate: number;
}

export interface UserPermissions {
  canDeleteDefects?: boolean;
  canEditAllDefects?: boolean;
  canCleanDatabase?: boolean;
}

export interface QAUser {
  username: string;
  name: string;
  role: string;
  email?: string;
  password?: string;
  assignedProjects?: string[];
  permissions?: UserPermissions;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface DefectReference {
  id: string;
  bugId: string;
  title: string;
  severity: DefectSeverity;
  defectStatus: DefectStatus;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderUsername: string;
  senderName: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  createdAt: number;
  defectRef?: DefectReference;
  fileAttachment?: {
    name: string;
    url: string; // base64 or url
    type?: string;
    size?: string;
  };
  reactions?: Record<string, string[]>; // emoji -> array of usernames
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isSystem?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'direct';
  participants?: string[]; // for direct messages e.g. ['sahil_roy', 'jit_mondal']
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  unreadCount?: number;
}

export interface UserSession {
  sessionId: string;
  username: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  loginTime: string; // ISO
  lastActive: number; // epoch ms
  userAgent?: string;
  browser?: string;
  os?: string;
  currentPath?: string;
}

export type ActivityActionType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'DEFECT_CREATE'
  | 'DEFECT_UPDATE'
  | 'DEFECT_DELETE'
  | 'DEFECT_STATUS_CHANGE'
  | 'PASSWORD_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'USER_CREATE'
  | 'DATABASE_CLEAN';

export interface ActivityLogItem {
  id: string;
  type: ActivityActionType;
  username: string;
  name: string;
  details: string;
  timestamp: string; // ISO string
  createdAt: number; // epoch ms
  severity?: 'info' | 'warning' | 'critical' | 'success';
  defectId?: string;
  metadata?: Record<string, any>;
}

