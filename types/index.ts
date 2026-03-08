export type UserRole = "admin" | "member" | "viewer";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type IssueType = "bug" | "story" | "task" | "epic" | "subtask";
export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
export type SprintStatus = "planning" | "active" | "completed";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  workspaces: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  user: string;
  role: WorkspaceRole;
}

export interface IWorkspace {
  _id: string;
  name: string;
  slug: string;
  owner: string;
  members: WorkspaceMember[];
  projects: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface IProject {
  _id: string;
  name: string;
  key: string;
  description: string;
  workspace: string;
  lead: string;
  members: string[];
  columns: BoardColumn[];
  defaultColumn: string;
  issueCounter: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISprint {
  _id: string;
  name: string;
  project: string;
  goal: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  issues: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface IIssue {
  _id: string;
  key: string;
  title: string;
  description: string;
  type: IssueType;
  status: string;
  priority: IssuePriority;
  storyPoints: number;
  project: string | IProject;
  sprint: string | ISprint | null;
  reporter: string | IUser;
  assignees: (string | IUser)[];
  labels: string[];
  parent: string | null;
  children: string[];
  attachments: Attachment[];
  dueDate: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface IComment {
  _id: string;
  issue: string;
  author: string | IUser;
  body: string;
  mentions: string[];
  reactions: Reaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabel {
  _id: string;
  name: string;
  color: string;
  project: string;
}

export interface IActivity {
  _id: string;
  issue: string;
  actor: string | IUser;
  action: string;
  from: string;
  to: string;
  createdAt: Date;
}
