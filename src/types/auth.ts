export type UserRole = "admin" | "user";

export type IssueWorkflowStatus = "open" | "resolved";

export type Profile = {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  disabledAt: string | null;
  permissionsVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
};

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export type UpdateUserInput = {
  role?: UserRole;
  disabled?: boolean;
  fullName?: string;
};

export type ResetUserPasswordInput = {
  password: string;
};
