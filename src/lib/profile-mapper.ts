import type { Profile, UserRole } from "@/types/auth";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  disabled_at: string | null;
  permissions_version?: number | null;
  created_at: string;
  updated_at: string;
};

export const PROFILE_SELECT =
  "id, email, full_name, role, disabled_at, permissions_version, created_at, updated_at";

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    disabledAt: row.disabled_at,
    permissionsVersion: Number(row.permissions_version ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileToApi(user: Profile) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    disabledAt: user.disabledAt,
    permissionsVersion: user.permissionsVersion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
